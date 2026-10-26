#!/usr/bin/env python3
"""
Nightly DriveCentric Daily Activity feed.

Each store's scheduled "Daily Activity Report" email (month to date) is saved to Drive as a PDF. This script takes the
text of those PDFs (one .txt per store, as Google Drive's read_file_content returns it), parses the per-salesperson
rows, and posts them to the hub's /api/activity, which fills the store activity cards and the appointment goals.

Usage:  HUB_KEY=... python3 scripts/daily_activity.py chevrolet=chevy.txt toyota=toyota.txt belgrade=belgrade.txt danhof=danhof.txt [subaru=subaru.txt]

Row shape (19 numbers after the name):
  Total Opportunities, Showroom, Phone, Internet, Campaign, Appt Created, Appts Scheduled, Appts Confirmed, Appts Show,
  Appts No Show, Appts Cancelled, Calls Made, Texts Sent, Emails Sent, Videos Sent (%), Open Tasks, Completed Tasks,
  Sold, Deals Delivered
The "Ressler Motors" line is the group total and is skipped. Stores where only that line appears post nothing.
"""
import json, os, re, sys, urllib.request, datetime

HUB = os.environ.get("HUB_URL", "https://trainingdash.vercel.app")
KEY = os.environ.get("HUB_KEY") or os.environ.get("HUB_PASSCODE")
if not KEY:
    sys.exit("HUB_KEY not set")

ROW = re.compile(r"^(?P<name>[A-Za-z][A-Za-z .'\-]+?)\s+(?P<nums>(?:[\d,]+\s+){14}[\d,]+%\s+(?:[\d,]+\s+){3}[\d,]+)\s*0?\s*$")
STAFF_ONLY = {"subaru": {"Chris Froelich", "Halie Monroe"}}  # BDC people excluded from the per-salesperson goal

def parse(text):
    rows, span = [], None
    m = re.search(r"(\d{1,2}/\d{1,2}/\d{4})\s*-\s*(\d{1,2}/\d{1,2}/\d{4})", text)
    if m:
        span = tuple(datetime.datetime.strptime(d, "%m/%d/%Y").date() for d in m.groups())
    for line in text.splitlines():
        line = line.strip()
        r = ROW.match(line)
        if not r or r.group("name").strip() == "Ressler Motors":
            continue
        n = [int(x.replace(",", "").rstrip("%")) for x in r.group("nums").split()]
        if len(n) < 19:
            continue
        rows.append({"name": r.group("name").strip(), "opps": n[0], "showroom": n[1], "phone": n[2], "internet": n[3],
                     "calls": n[11], "contacted": 0, "texts": n[12], "emails": n[13], "apptCreated": n[5], "shown": n[8],
                     "noShow": n[9], "sold": n[17]})
    return rows, span

def working_days(start, end):
    """Weekdays, Monday to Friday: the salespeople work five-day weeks."""
    d, n = start, 0
    while d <= end:
        if d.weekday() < 5:
            n += 1
        d += datetime.timedelta(days=1)
    return max(n, 1)

stores, entries, report = {}, [], []
for arg in sys.argv[1:]:
    store, path = arg.split("=", 1)
    rows, span = parse(open(path, encoding="utf-8", errors="replace").read())
    if not rows:
        report.append(f"{store}: no per-person rows (report still set to the group total?)")
        continue
    if not span:
        report.append(f"{store}: no date range in the header, skipped (one-day report?)")
        continue
    start, end = span
    if (end - start).days < 2:
        report.append(f"{store}: covers only {start} to {end}, not month to date, skipped")
        continue
    # the report is emailed the evening of its last day; count that day
    stores[store] = {"from": start.isoformat(), "to": end.isoformat(), "source": "DriveCentric Daily Activity, month to date (nightly)",
                     "rows": [{k: v for k, v in r.items() if k != "noShow"} for r in rows]}
    sp = [r for r in rows if r["name"] not in STAFF_ONLY.get(store, set())]
    created = sum(r["apptCreated"] for r in sp); shown = sum(r["shown"] for r in sp); noshow = sum(r["noShow"] for r in sp)
    days = working_days(start, end)
    per_day = round(created / len(sp) / days, 2)
    note = f"{created} appts set by {len(sp)} salespeople over {days} working days (nightly feed)"
    entries.append({"store": store, "goal": "per salesperson per day", "date": end.isoformat(), "value": per_day, "note": note})
    if shown + noshow:
        entries.append({"store": store, "goal": "Appointments shown", "date": end.isoformat(), "value": round(100 * shown / (shown + noshow)),
                        "note": f"{shown} shown, {noshow} no-show (nightly feed)"})
    report.append(f"{store}: {len(rows)} people, {created} appts, {per_day}/day, calls {sum(r['calls'] for r in rows)}, texts {sum(r['texts'] for r in rows)}")

print("\n".join(report))
if not stores:
    sys.exit("nothing to post")
body = json.dumps({"stores": stores, "entries": entries}).encode()
req = urllib.request.Request(f"{HUB}/api/activity", data=body, headers={"content-type": "application/json", "x-hub-key": KEY}, method="POST")
print(urllib.request.urlopen(req, timeout=60).read().decode())
