/**
 * Phones tab feed. Run in a signed-in Car Wars tab (the session's current account), once per account:
 *   Ressler Chevrolet Cadillac Toyota, then Ressler - Gallatin Subaru.
 *
 *   const data = await phonesPull("2026-11");            // month to date for that account
 *   then POST { month, account: data.account, data } to <hub>/api/phones with header x-hub-key
 *
 * What it reads (the same feeds the Dealership CRISP page uses):
 *   Account.cfc getStaffGroupInfo    who is in which Car Wars group
 *   Crisp.cfc   getCrispComposite    the account's CRISP counts plus one row per person
 * The hub adds people up by team, so a roster change in Car Wars groups shows up on the next pull.
 * Use absolute URLs: relative ones fail from some Car Wars pages.
 */
async function phonesPull(month) {
  const HP = "1,10,11,12,16,17,18,20,21";
  const [y, m] = month.split("-").map(Number);
  const pad = (n) => String(n).padStart(2, "0");
  const us = (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const start = new Date(y, m - 1, 1), next = new Date(y, m, 1), last = new Date(y, m, 0), now = new Date();
  const to = now < last ? now : last;                       // the end date Car Wars takes is exclusive, so ask through the 1st of next month
  const get = async (u) => (await fetch("https://carwars.com" + u, { credentials: "include" })).json();

  const g = await get("/cfc/Account.cfc?method=getStaffGroupInfo");
  const c = g.ORDERSTAFFALL.COLUMNS, ix = (n) => c.indexOf(n);
  const accountId = g.ORDERSTAFFALL.DATA[0][ix("FRN_LSKINID")];
  const groupsOf = new Map(g.ORDERSTAFFALL.DATA.map((r) => [r[ix("PHONECODEID")], String(r[ix("CLASS_NAME")] || "").split(",").filter((x) => x && x !== "Car Wars Sales (default)")]));

  const j = await get(`/platform_a/pods/Crisp.cfc?method=getCrispComposite&accountID=${accountId}&startDate=${encodeURIComponent(us(start))}&endDate=${encodeURIComponent(us(next))}&hproductID=${encodeURIComponent(HP)}&callTable=vwxCall_ShortLong&phonecodeClass=1526`);
  const k = j.staffZero.keyMetrics;
  const agents = j.staffZero.agents
    .map((a) => ({ n: a.name, g: groupsOf.get(a.phonecode) || [], io: a.metrics.ibSalesOpps, ir: a.metrics.ibApptRequests, fi: a.metrics.ibFirm, oc: a.metrics.obAllCalls, ol: a.metrics.obLiveConvo, os: a.metrics.obSet }))
    .filter((a) => a.io || a.ir || a.oc || a.ol);
  return {
    account: accountId === 154894 ? "subaru" : accountId === 154895 ? "cct" : String(accountId),
    from: iso(start), to: iso(to), pulled: new Date().toISOString(),
    total: { io: k.ibSalesOpps, ir: k.ibApptRequests, fi: k.ibFirm, oc: k.obAllCalls, ol: k.obLiveConvo, os: k.obSet },
    agents,
  };
}
