/**
 * Phones tab feed. Run in a tab that is signed in to Car Wars (any Car Wars page, any account selected):
 *
 *   await phonesPull({ month: "2026-11", hub: "https://trainingdash.vercel.app", key: "<hub passcode>" })
 *
 * It reads both Car Wars accounts and posts each one to <hub>/api/phones, then returns a short status line per account.
 * Leave `hub` out to get the data back without posting.
 *
 * What it reads:
 *   StaffActivity.cfc GetStaffQuery   one row per person for a date range (end date exclusive). It takes the account as a
 *                                     parameter, so it works whichever account the tab has selected. With phonecodeClass
 *                                     set to a Car Wars group id it returns that group's people, which is the roster.
 *   Crisp.cfc getCrispComposite       the account's own CRISP counts, unclaimed calls included. Only answers for the
 *                                     account the tab has selected, so it is read when it can be and skipped otherwise.
 * Never switches accounts: that would change what Laura sees in her own Car Wars tabs.
 * The daily scheduled task carries a copy of this function. Change both together.
 */
async function phonesPull({ month, hub, key }) {
  const ACCOUNTS = [
    { id: 154894, name: "subaru", cls: "", groups: { "BDC (default)": 3978, "New Car Sales (default)": 1876, "Used Car Sales (default)": 1878 } },
    { id: 154895, name: "cct", cls: 1526, groups: { "BDC (default)": 3978, Toyota: 2396, Chevrolet: 12514, Belgrade: 13162, Danhof: 13161, "New Car Sales (default)": 1876, "Used Car Sales (default)": 1878 } },
  ];
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1), next = new Date(y, m, 1), last = new Date(y, m, 0), now = new Date();
  const to = now < last ? now : last;
  if (now < start) throw new Error("that month has not started");

  const staff = async (a, s, e, cls) => {
    const u = `https://carwars.com/platform_a/pods/StaffActivity.cfc?method=GetStaffQuery&lskinid=${a.id}&startDate=${s}&endDate=${e}${cls ? `&phonecodeClass=${cls}` : ""}&_=${Date.now()}`;
    const t = await fetch(u, { credentials: "include" }).then((r) => r.text());
    let j; try { j = JSON.parse(t); } catch { throw new Error("Car Wars did not return data (signed out?)"); }
    const i = (n) => j.COLUMNS.indexOf(n);
    return j.DATA.map((r) => ({ n: r[i("AGENT_NAME")], io: +r[i("APPT_REQUEST_OPPS")] || 0, ir: +r[i("APPT_REQUESTS")] || 0, fi: +r[i("IB_FIRM")] || 0, oc: +r[i("TOTAL_OPPS")] || 0, ol: +r[i("LIVE_CONVO")] || 0, os: +r[i("OB_SET")] || 0 }));
  };
  const crisp = async (a) => {
    try {
      const us = (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
      const u = `https://carwars.com/platform_a/pods/Crisp.cfc?method=getCrispComposite&accountID=${a.id}&startDate=${encodeURIComponent(us(start))}&endDate=${encodeURIComponent(us(next))}&hproductID=${encodeURIComponent("1,10,11,12,16,17,18,20,21")}&callTable=vwxCall_ShortLong&phonecodeClass=1526`;
      const j = JSON.parse(await fetch(u, { credentials: "include" }).then((r) => r.text()));
      const k = j.staffZero.keyMetrics, un = j.staffZero.agents.find((x) => x.name === "Unclaimed");
      return { io: k.ibSalesOpps, ir: k.ibApptRequests, fi: k.ibFirm, uio: un ? un.metrics.ibSalesOpps : 0, uir: un ? un.metrics.ibApptRequests : 0 };
    } catch { return undefined; }
  };

  const out = [];
  for (const a of ACCOUNTS) {
    try {
      // who is in which group: ask for each group over a one-day range, the answer lists every member
      const groupsOf = {};
      for (const [g, id] of Object.entries(a.groups)) for (const p of await staff(a, iso(to), iso(new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1)), id)) (groupsOf[p.n] = groupsOf[p.n] || []).push(g);
      const agents = (await staff(a, iso(start), iso(next), a.cls)).filter((p) => p.io || p.ir || p.oc || p.ol).map((p) => ({ ...p, g: groupsOf[p.n] || [] }));
      // one read per day for the outbound trend, four at a time
      const dates = []; for (let d = new Date(start); d <= to; d.setDate(d.getDate() + 1)) dates.push(new Date(d));
      const days = [];
      for (let i = 0; i < dates.length; i += 4) {
        days.push(...await Promise.all(dates.slice(i, i + 4).map(async (d) => {
          const rows = await staff(a, iso(d), iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)), a.cls);
          return { d: iso(d), a: Object.fromEntries(rows.filter((p) => p.oc || p.ol).map((p) => [p.n, [p.oc, p.ol, p.os]])) };
        })));
      }
      const data = { from: iso(start), to: iso(to), pulled: new Date().toISOString(), agents, days: days.filter((d) => Object.keys(d.a).length), crisp: await crisp(a) };
      const calls = agents.reduce((s, p) => s + p.oc, 0);
      if (!hub) { out.push({ account: a.name, data }); continue; }
      // text/plain keeps this a simple cross-site request; the hub answers with a header that lets this page read the reply
      const res = await fetch(`${hub}/api/phones`, { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify({ key, month, account: a.name, data }) }).then((r) => r.json());
      out.push(`${a.name}: ${res.ok ? "posted" : "NOT posted (" + (res.error || "?") + ")"}, ${agents.length} people, ${calls} outbound calls, ${data.days.length} days, account CRISP ${data.crisp ? "read" : "not readable from this tab"}`);
    } catch (e) { out.push(`${a.name}: FAILED, ${e.message}`); }
  }
  return hub ? out.join("\n") : out;
}
