"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { requireEditor, setEditorCookie, clearEditorCookie, acceptManagerCode } from "@/lib/auth";

function s(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}
function must(fd: FormData, key: string): string {
  const v = s(fd, key);
  if (!v) throw new Error(`Missing ${key}`);
  return v;
}
function list(fd: FormData, key: string): string[] {
  return fd.getAll(key).map(String).filter(Boolean);
}
function num(fd: FormData, key: string): number | null {
  const v = s(fd, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function ok(r: { error: { message: string } | null }) {
  if (r.error) throw new Error(r.error.message);
}
function refresh() {
  revalidatePath("/", "layout");
}

// ---------- auth ----------
export async function login(fd: FormData) {
  const pass = must(fd, "passcode");
  const next = s(fd, "next") || "/";
  const good = await setEditorCookie(pass);
  if (!good) redirect(`/login?bad=1&next=${encodeURIComponent(next)}`);
  refresh();
  redirect(next);
}
export async function logout() {
  await clearEditorCookie();
  refresh();
  redirect("/");
}

// ---------- people ----------
export async function addPerson(fd: FormData) {
  await requireEditor();
  ok(await db().from("people").insert({
    store_id: must(fd, "store_id"),
    name: must(fd, "name"),
    role: s(fd, "role") || "Salesperson",
    location: s(fd, "location"),
  }));
  refresh();
}
export async function importPeople(fd: FormData) {
  await requireEditor();
  const store_id = must(fd, "store_id");
  const role = s(fd, "role") || "Salesperson";
  const location = s(fd, "location");
  const raw = must(fd, "names");
  const names = raw.split(/\r?\n|,/).map((n) => n.trim()).filter(Boolean);
  if (names.length) {
    ok(await db().from("people").insert(names.map((name) => ({ store_id, name, role, location }))));
  }
  refresh();
}
export async function updatePerson(fd: FormData) {
  await requireEditor();
  const id = must(fd, "id");
  ok(await db().from("people").update({
    name: must(fd, "name"),
    role: s(fd, "role") || "Salesperson",
    location: s(fd, "location"),
    store_id: must(fd, "store_id"),
    active: fd.get("active") === "on",
    notes: s(fd, "notes"),
  }).eq("id", id));
  refresh();
}
export async function deletePerson(fd: FormData) {
  await requireEditor();
  ok(await db().from("people").delete().eq("id", must(fd, "id")));
  refresh();
  redirect("/people");
}

// ---------- initiatives ----------
export async function addInitiative(fd: FormData) {
  await requireEditor();
  const r = await db().from("initiatives").insert({
    name: must(fd, "name"),
    description: s(fd, "description"),
    goal_text: s(fd, "goal_text"),
    status: s(fd, "status") || "active",
    start_date: s(fd, "start_date"),
    store_ids: list(fd, "store_ids"),
  }).select("id").single();
  ok(r);
  refresh();
  redirect(`/i/${(r.data as { id: string }).id}`);
}
export async function updateInitiative(fd: FormData) {
  await requireEditor();
  ok(await db().from("initiatives").update({
    name: must(fd, "name"),
    description: s(fd, "description"),
    goal_text: s(fd, "goal_text"),
    status: s(fd, "status") || "active",
    start_date: s(fd, "start_date"),
    store_ids: list(fd, "store_ids"),
  }).eq("id", must(fd, "id")));
  refresh();
}
export async function deleteInitiative(fd: FormData) {
  await requireEditor();
  ok(await db().from("initiatives").delete().eq("id", must(fd, "id")));
  refresh();
  redirect("/initiatives");
}

// ---------- roster ----------
export async function setRosterStatus(fd: FormData) {
  await requireEditor();
  const initiative_id = must(fd, "initiative_id");
  const person_id = must(fd, "person_id");
  const status = must(fd, "status");
  const trained_on = s(fd, "trained_on") || (status === "trained" ? new Date().toISOString().slice(0, 10) : null);
  ok(await db().from("initiative_people").upsert(
    { initiative_id, person_id, status, trained_on, notes: s(fd, "notes"), updated_at: new Date().toISOString() },
    { onConflict: "initiative_id,person_id" },
  ));
  refresh();
}
export async function addPeopleToInitiative(fd: FormData) {
  await requireEditor();
  const initiative_id = must(fd, "initiative_id");
  const ids = list(fd, "person_ids");
  if (ids.length) {
    ok(await db().from("initiative_people").upsert(
      ids.map((person_id) => ({ initiative_id, person_id, status: "not_started" })),
      { onConflict: "initiative_id,person_id", ignoreDuplicates: true },
    ));
  }
  refresh();
}
export async function removeFromInitiative(fd: FormData) {
  await requireEditor();
  ok(await db().from("initiative_people").delete().eq("id", must(fd, "id")));
  refresh();
}

// ---------- visits ----------
export async function addVisit(fd: FormData) {
  await requireEditor();
  const r = await db().from("visits").insert({
    store_id: must(fd, "store_id"),
    date: s(fd, "date") || new Date().toISOString().slice(0, 10),
    focus: s(fd, "focus"),
    summary: s(fd, "summary"),
    private_notes: s(fd, "private_notes"),
    initiative_ids: list(fd, "initiative_ids"),
    people_ids: list(fd, "people_ids"),
    next_visit_date: s(fd, "next_visit_date"),
    next_visit_plan: s(fd, "next_visit_plan"),
  }).select("id").single();
  ok(r);
  // Follow-ups typed one per line become to-dos linked to this visit
  const follow = s(fd, "followups");
  if (follow) {
    const items = follow.split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
    if (items.length) {
      ok(await db().from("todos").insert(items.map((text) => ({
        text, store_id: must(fd, "store_id"), visit_id: (r.data as { id: string }).id,
      }))));
    }
  }
  refresh();
  redirect(`/v/${(r.data as { id: string }).id}`);
}
export async function updateVisit(fd: FormData) {
  await requireEditor();
  ok(await db().from("visits").update({
    date: s(fd, "date") || new Date().toISOString().slice(0, 10),
    focus: s(fd, "focus"),
    summary: s(fd, "summary"),
    private_notes: s(fd, "private_notes"),
    initiative_ids: list(fd, "initiative_ids"),
    people_ids: list(fd, "people_ids"),
    next_visit_date: s(fd, "next_visit_date"),
    next_visit_plan: s(fd, "next_visit_plan"),
  }).eq("id", must(fd, "id")));
  refresh();
}
export async function deleteVisit(fd: FormData) {
  await requireEditor();
  const id = must(fd, "id");
  const back = s(fd, "back") || "/";
  ok(await db().from("visits").delete().eq("id", id));
  refresh();
  redirect(back);
}

// ---------- todos ----------
export async function addTodo(fd: FormData) {
  await requireEditor();
  ok(await db().from("todos").insert({
    text: must(fd, "text"),
    store_id: s(fd, "store_id"),
    initiative_id: s(fd, "initiative_id"),
    person_id: s(fd, "person_id"),
    visit_id: s(fd, "visit_id"),
    due: s(fd, "due"),
  }));
  refresh();
}
export async function toggleTodo(fd: FormData) {
  await requireEditor();
  const done = fd.get("done") === "true";
  ok(await db().from("todos").update({ done, done_at: done ? new Date().toISOString() : null }).eq("id", must(fd, "id")));
  refresh();
}
export async function deleteTodo(fd: FormData) {
  await requireEditor();
  ok(await db().from("todos").delete().eq("id", must(fd, "id")));
  refresh();
}

// ---------- bookmarks ----------
export async function addBookmark(fd: FormData) {
  await requireEditor();
  ok(await db().from("bookmarks").insert({
    title: must(fd, "title"),
    url: must(fd, "url"),
    kind: s(fd, "kind") || "report",
    store_id: s(fd, "store_id"),
    initiative_id: s(fd, "initiative_id"),
  }));
  refresh();
}
export async function deleteBookmark(fd: FormData) {
  await requireEditor();
  ok(await db().from("bookmarks").delete().eq("id", must(fd, "id")));
  refresh();
}

// ---------- resources ----------
export async function addResource(fd: FormData) {
  await requireEditor();
  ok(await db().from("resources").insert({
    initiative_id: must(fd, "initiative_id"),
    title: must(fd, "title"),
    kind: s(fd, "kind") || "link",
    url: s(fd, "url"),
    body: s(fd, "body"),
  }));
  refresh();
}
export async function deleteResource(fd: FormData) {
  await requireEditor();
  ok(await db().from("resources").delete().eq("id", must(fd, "id")));
  refresh();
}

// ---------- goals ----------
export async function addGoal(fd: FormData) {
  await requireEditor();
  ok(await db().from("goals").insert({
    initiative_id: s(fd, "initiative_id"),
    store_id: s(fd, "store_id"),
    name: must(fd, "name"),
    unit: s(fd, "unit") || "%",
    target: num(fd, "target"),
    direction: s(fd, "direction") || "up",
    kind: s(fd, "kind") === "count" ? "count" : "rate",
  }));
  refresh();
}
export async function addGoalEntry(fd: FormData) {
  await requireEditor();
  const value = num(fd, "value");
  if (value === null) throw new Error("Value must be a number");
  ok(await db().from("goal_entries").insert({
    goal_id: must(fd, "goal_id"),
    date: s(fd, "date") || new Date().toISOString().slice(0, 10),
    value,
    note: s(fd, "note"),
  }));
  refresh();
}
export async function deleteGoal(fd: FormData) {
  await requireEditor();
  ok(await db().from("goals").delete().eq("id", must(fd, "id")));
  refresh();
}
export async function deleteGoalEntry(fd: FormData) {
  await requireEditor();
  ok(await db().from("goal_entries").delete().eq("id", must(fd, "id")));
  refresh();
}

// ---------- wins ----------
export async function addWin(fd: FormData) {
  await requireEditor();
  ok(await db().from("wins").insert({
    text: must(fd, "text"),
    store_id: s(fd, "store_id"),
    initiative_id: s(fd, "initiative_id"),
    person_id: s(fd, "person_id"),
    date: s(fd, "date") || new Date().toISOString().slice(0, 10),
  }));
  refresh();
}
export async function deleteWin(fd: FormData) {
  await requireEditor();
  ok(await db().from("wins").delete().eq("id", must(fd, "id")));
  refresh();
}

// ---------- commitments ----------
export async function addCommitment(fd: FormData) {
  await requireEditor();
  ok(await db().from("commitments").insert({
    store_id: must(fd, "store_id"),
    initiative_id: s(fd, "initiative_id"),
    owner: must(fd, "owner"),
    text: must(fd, "text"),
  }));
  refresh();
}
export async function setCommitmentStatus(fd: FormData) {
  await requireEditor();
  ok(await db().from("commitments").update({
    status: must(fd, "status"),
    checked_at: new Date().toISOString().slice(0, 10),
    notes: s(fd, "notes"),
  }).eq("id", must(fd, "id")));
  refresh();
}
export async function deleteCommitment(fd: FormData) {
  await requireEditor();
  ok(await db().from("commitments").delete().eq("id", must(fd, "id")));
  refresh();
}

// ---------- month rhythm ----------
export async function saveMonthPlan(fd: FormData) {
  await requireEditor();
  const store_id = s(fd, "store_id");
  const month = must(fd, "month");
  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (fd.has("lessons")) patch.lessons = s(fd, "lessons");
  if (fd.has("focus")) patch.focus = s(fd, "focus");
  let q = db().from("month_plans").select("id").eq("month", month);
  q = store_id ? q.eq("store_id", store_id) : q.is("store_id", null);
  const existing = await q.maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) {
    ok(await db().from("month_plans").update(patch).eq("id", (existing.data as { id: string }).id));
  } else {
    ok(await db().from("month_plans").insert({ store_id, month, ...patch }));
  }
  refresh();
}
export async function togglePlaybook(fd: FormData) {
  await requireEditor();
  const item_id = must(fd, "item_id");
  const store_id = must(fd, "store_id");
  const month = must(fd, "month");
  if (fd.get("checked") === "true") {
    ok(await db().from("playbook_checks").delete().eq("item_id", item_id).eq("store_id", store_id).eq("month", month));
  } else {
    ok(await db().from("playbook_checks").upsert({ item_id, store_id, month }, { onConflict: "item_id,store_id,month", ignoreDuplicates: true }));
  }
  refresh();
}
export async function addPlaybookItem(fd: FormData) {
  await requireEditor();
  ok(await db().from("playbook_items").insert({
    phase: must(fd, "phase"),
    text: must(fd, "text"),
    store_id: s(fd, "store_id"),
    sort_order: 99,
  }));
  refresh();
}
export async function deletePlaybookItem(fd: FormData) {
  await requireEditor();
  ok(await db().from("playbook_items").delete().eq("id", must(fd, "id")));
  refresh();
}

// ---------- notes from the store (GMs and managers) ----------
export async function addStorePost(fd: FormData) {
  if (s(fd, "website")) return; // honeypot: bots fill hidden fields
  const back = s(fd, "back") || "/";
  const good = await acceptManagerCode(s(fd, "code"));
  if (!good) redirect(`${back}${back.includes("?") ? "&" : "?"}code=bad#store-notes`);
  const kind = s(fd, "kind");
  const body = must(fd, "body").slice(0, 4000);
  ok(await db().from("store_posts").insert({
    store_id: must(fd, "store_id"),
    author: (s(fd, "author") || "Anonymous").slice(0, 80),
    kind: kind === "question" || kind === "idea" ? kind : "note",
    body,
  }));
  refresh();
  redirect(`${back}${back.includes("?") ? "&" : "?"}posted=1#store-notes`);
}
export async function replyStorePost(fd: FormData) {
  await requireEditor();
  const reply = s(fd, "reply");
  const status = s(fd, "status") || (reply ? "answered" : "open");
  ok(await db().from("store_posts").update({
    reply, status, replied_at: reply ? new Date().toISOString() : null,
  }).eq("id", must(fd, "id")));
  refresh();
}
export async function deleteStorePost(fd: FormData) {
  await requireEditor();
  ok(await db().from("store_posts").delete().eq("id", must(fd, "id")));
  refresh();
}
export async function storePostToTodo(fd: FormData) {
  await requireEditor();
  const id = must(fd, "id");
  const r = await db().from("store_posts").select("*").eq("id", id).single();
  ok(r);
  const p = r.data as { store_id: string; author: string; body: string };
  ok(await db().from("todos").insert({ store_id: p.store_id, text: `${p.author}: ${p.body}`.slice(0, 500) }));
  ok(await db().from("store_posts").update({ status: "answered", reply: "Added to my to-dos", replied_at: new Date().toISOString() }).eq("id", id));
  refresh();
}

// ---------- examples (screenshots) ----------
const IMAGE_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic" };

/** Called from the browser before an upload. Returns a one-time signed link straight into the private bucket. */
export async function createExampleUpload(contentType: string): Promise<{ path: string; signedUrl: string }> {
  await requireEditor();
  const ext = IMAGE_EXT[contentType];
  if (!ext) throw new Error("Only images can be uploaded");
  const d = new Date();
  const path = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
  const r = await db().storage.from("examples").createSignedUploadUrl(path);
  if (r.error) throw new Error(r.error.message);
  return { path, signedUrl: r.data.signedUrl };
}

export async function addExample(input: {
  path: string; contentType: string; width: number | null; height: number | null;
  caption: string | null; kind: string; theme: string | null; initiativeId: string | null; storeId: string | null; personIds: string[]; takenOn: string | null;
}) {
  await requireEditor();
  const kind = input.kind === "opportunity" || input.kind === "pattern" ? input.kind : "good";
  ok(await db().from("examples").insert({
    path: input.path,
    content_type: input.contentType,
    width: input.width, height: input.height,
    caption: input.caption?.trim() || null,
    kind,
    theme: input.theme?.trim() || null,
    initiative_id: input.initiativeId || null,
    store_id: input.storeId || null,
    person_ids: input.personIds.filter(Boolean),
    taken_on: input.takenOn || new Date().toISOString().slice(0, 10),
  }));
  refresh();
}

export async function updateExample(fd: FormData) {
  await requireEditor();
  const kind = s(fd, "kind");
  ok(await db().from("examples").update({
    caption: s(fd, "caption"),
    kind: kind === "opportunity" || kind === "pattern" ? kind : "good",
    theme: s(fd, "theme"),
    initiative_id: s(fd, "initiative_id"),
    store_id: s(fd, "store_id"),
    person_ids: list(fd, "person_ids"),
    taken_on: s(fd, "taken_on") || new Date().toISOString().slice(0, 10),
  }).eq("id", must(fd, "id")));
  refresh();
}

export async function deleteExample(fd: FormData) {
  await requireEditor();
  const id = must(fd, "id");
  const r = await db().from("examples").select("path").eq("id", id).maybeSingle();
  ok(r);
  const path = (r.data as { path: string } | null)?.path;
  ok(await db().from("examples").delete().eq("id", id));
  if (path) await db().storage.from("examples").remove([path]);
  refresh();
}

// ---------- group focus ----------
export async function saveGroupNote(fd: FormData) {
  await requireEditor();
  const key = must(fd, "key");
  if (!["mission", "vision", "values", "notes"].includes(key)) throw new Error("Unknown section");
  ok(await db().from("group_notes").upsert({ key, body: s(fd, "body"), updated_at: new Date().toISOString() }, { onConflict: "key" }));
  refresh();
}
export async function addMeeting(fd: FormData) {
  await requireEditor();
  ok(await db().from("meetings").insert({
    date: must(fd, "date"),
    title: s(fd, "title") || "GM meeting",
    agenda: s(fd, "agenda"),
    notes: s(fd, "notes"),
  }));
  refresh();
}
export async function updateMeeting(fd: FormData) {
  await requireEditor();
  ok(await db().from("meetings").update({
    date: must(fd, "date"),
    title: s(fd, "title") || "GM meeting",
    agenda: s(fd, "agenda"),
    notes: s(fd, "notes"),
  }).eq("id", must(fd, "id")));
  refresh();
}
export async function deleteMeeting(fd: FormData) {
  await requireEditor();
  ok(await db().from("meetings").delete().eq("id", must(fd, "id")));
  refresh();
}

// ---------- store results (Performance Report import) ----------
const METRIC_COLS: Record<string, string> = {
  "total sold f&i": "sold", "total sold": "sold", "sold": "sold",
  "new lot sold": "new_sold", "used lot sold": "used_sold",
  "appts due": "appts_due", "appts confirmed": "appts_confirmed", "appts shown": "appts_shown", "appts sold": "appts_sold",
  "showroom / lot ups": "lot_ups", "lot ups": "lot_ups", "walk in / lot ups": "lot_ups",
  "phone ups in": "phone_ups", "phone ups": "phone_ups",
  "web ups in": "web_ups", "web ups": "web_ups",
  "campaign ups": "campaign_ups", "be backs": "be_backs", "write ups": "write_ups",
  "outbound calls made": "outbound_calls", "live calls connected": "live_calls",
};
const STORE_ALIASES: Record<string, { slug: string; location: string | null }> = {
  "chevrolet": { slug: "chevrolet", location: null }, "ressler chevrolet": { slug: "chevrolet", location: null }, "chevy": { slug: "chevrolet", location: null },
  "toyota": { slug: "toyota", location: null }, "toyota of bozeman": { slug: "toyota", location: null },
  "subaru": { slug: "subaru", location: null }, "gallatin subaru": { slug: "subaru", location: null },
  "livingston": { slug: "livingston", location: null }, "livingston motor company": { slug: "livingston", location: null },
  "danhof": { slug: "chevrolet", location: "Danhof" }, "danhoff": { slug: "chevrolet", location: "Danhof" },
  "belgrade": { slug: "chevrolet", location: "Belgrade" }, "ressler belgrade": { slug: "chevrolet", location: "Belgrade" },
  "bdc (shared)": { slug: "sales-bdc", location: null }, "bdc": { slug: "sales-bdc", location: null }, "sales bdc": { slug: "sales-bdc", location: null },
};

/** Paste the Inputs tab (header row plus store rows) from the PR spreadsheet. Tabs or commas both work. */
export async function importMetrics(fd: FormData): Promise<void> {
  await requireEditor();
  const period = must(fd, "period");            // YYYY-MM
  const as_of = must(fd, "as_of");              // YYYY-MM-DD
  const source = s(fd, "source") || "Performance Report";
  const raw = must(fd, "data");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const split = (l: string) => (l.includes("\t") ? l.split("\t") : l.split(",")).map((c) => c.trim());
  const headerIdx = lines.findIndex((l) => /^store\b/i.test(l));
  if (headerIdx < 0) throw new Error("Couldn't find the header row that starts with \"Store\"");
  const header = split(lines[headerIdx]).map((h) => h.toLowerCase());
  const colMap: Record<number, string> = {};
  header.forEach((h, i) => { if (i > 0 && METRIC_COLS[h] && !Object.values(colMap).includes(METRIC_COLS[h])) colMap[i] = METRIC_COLS[h]; });
  if (!Object.values(colMap).includes("sold")) throw new Error("Couldn't find a Total Sold column");
  const stores = await db().from("stores").select("id,slug");
  ok(stores);
  const bySlug = new Map((stores.data as { id: string; slug: string }[]).map((x) => [x.slug, x.id]));
  const rowsOut: Record<string, unknown>[] = [];
  const skipped: string[] = [];
  for (const line of lines.slice(headerIdx + 1)) {
    const cells = split(line);
    const name = (cells[0] || "").toLowerCase();
    if (!name || /^store\b/i.test(name)) break;         // a second header means the example block
    const target = STORE_ALIASES[name];
    if (!target) { if (!/helper|house|how to|example|green|everything|report|bdc \(shared\): goals|phone and|walk in/i.test(name)) skipped.push(cells[0]); continue; }
    const rec: Record<string, unknown> = { store_id: bySlug.get(target.slug), location: target.location, period, as_of, source };
    for (const [i, key] of Object.entries(colMap)) {
      const v = Number(String(cells[Number(i)] ?? "").replace(/[^0-9.\-]/g, ""));
      rec[key] = Number.isFinite(v) ? Math.round(v) : null;
    }
    if (rec.sold === null) rec.sold = 0;
    rowsOut.push(rec);
  }
  if (!rowsOut.length) throw new Error("No store rows recognized" + (skipped.length ? ` (unrecognized: ${skipped.join(", ")})` : ""));
  ok(await db().from("store_metrics").upsert(rowsOut, { onConflict: "store_id,location,period" }));
  refresh();
  redirect(`/import?ok=${rowsOut.length}${skipped.length ? `&skipped=${encodeURIComponent(skipped.join(", "))}` : ""}`);
}

/** Quick manual entry for one store and month. */
export async function setStoreSold(fd: FormData) {
  await requireEditor();
  const sold = num(fd, "sold");
  if (sold === null) throw new Error("Sold must be a number");
  ok(await db().from("store_metrics").upsert({
    store_id: must(fd, "store_id"), location: s(fd, "location"), period: must(fd, "period"), as_of: must(fd, "as_of"),
    sold: Math.round(sold), appts_due: num(fd, "appts_due"), appts_shown: num(fd, "appts_shown"), appts_sold: num(fd, "appts_sold"), source: "manual",
  }, { onConflict: "store_id,location,period" }));
  refresh();
}
export async function deleteMetric(fd: FormData) {
  await requireEditor();
  ok(await db().from("store_metrics").delete().eq("id", must(fd, "id")));
  refresh();
}

// ---------- chat ----------
export async function clearChat() {
  await requireEditor();
  ok(await db().from("chat_messages").delete().neq("role", "x"));
  refresh();
}

// ---------- file bookmarks (PDF reports and the like, kept in the private bucket) ----------
const FILE_TYPES: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "text/csv": "csv", "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/msword": "doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};
export async function createFileUpload(contentType: string, filename: string): Promise<{ path: string; signedUrl: string }> {
  await requireEditor();
  const ext = FILE_TYPES[contentType] || filename.split(".").pop()?.toLowerCase() || "";
  if (!ext || !/^[a-z0-9]{2,5}$/.test(ext)) throw new Error("That file type isn't supported");
  const base = filename.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "file";
  const d = new Date();
  const path = `files/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID().slice(0, 8)}-${base}.${ext}`;
  const r = await db().storage.from("examples").createSignedUploadUrl(path);
  if (r.error) throw new Error(r.error.message);
  return { path, signedUrl: r.data.signedUrl };
}
export async function addFileBookmark(input: { path: string; title: string; kind: string; storeId: string | null; initiativeId: string | null }) {
  await requireEditor();
  if (!input.path.startsWith("files/")) throw new Error("Bad path");
  ok(await db().from("bookmarks").insert({
    title: input.title.trim() || input.path.split("/").pop(),
    url: `/f/${input.path}`,
    kind: input.kind || "report",
    store_id: input.storeId || null,
    initiative_id: input.initiativeId || null,
  }));
  refresh();
}
