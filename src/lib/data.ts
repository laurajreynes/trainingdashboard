import "server-only";
import { db } from "./supabase";
import type {
  Store, Person, Initiative, InitiativePerson, Visit, Todo, Bookmark,
  Resource, Goal, GoalEntry, Win, Commitment, ChatMessage, MonthPlan, PlaybookItem, PlaybookCheck, StorePost, Example, ExampleView,
} from "./types";

function rows<T>(r: { data: unknown; error: { message: string } | null }): T[] {
  if (r.error) throw new Error(r.error.message);
  return (r.data as T[]) || [];
}

export async function getStores(): Promise<Store[]> {
  return rows<Store>(await db().from("stores").select("*").order("sort_order"));
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const r = await db().from("stores").select("*").eq("slug", slug).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  return (r.data as Store) || null;
}

/** Store ids that belong on a store page: the store itself plus any shared workspace that shows under it. */
export function storeFamily(store: Store, all: Store[]): Store[] {
  return [store, ...all.filter((s) => s.id !== store.id && s.shows_under.includes(store.slug))];
}

export async function getPeople(storeIds?: string[]): Promise<Person[]> {
  let q = db().from("people").select("*").order("name");
  if (storeIds) q = q.in("store_id", storeIds);
  return rows<Person>(await q);
}

export async function getPerson(id: string): Promise<Person | null> {
  const r = await db().from("people").select("*").eq("id", id).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  return (r.data as Person) || null;
}

export async function getInitiatives(): Promise<Initiative[]> {
  return rows<Initiative>(
    await db().from("initiatives").select("*").order("sort_order").order("created_at"),
  );
}

export async function getInitiative(id: string): Promise<Initiative | null> {
  const r = await db().from("initiatives").select("*").eq("id", id).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  return (r.data as Initiative) || null;
}

export async function getRoster(initiativeId?: string, personId?: string): Promise<InitiativePerson[]> {
  let q = db().from("initiative_people").select("*");
  if (initiativeId) q = q.eq("initiative_id", initiativeId);
  if (personId) q = q.eq("person_id", personId);
  return rows<InitiativePerson>(await q);
}

export async function getAllRoster(): Promise<InitiativePerson[]> {
  return rows<InitiativePerson>(await db().from("initiative_people").select("*"));
}

export async function getVisits(opts: { storeIds?: string[]; limit?: number } = {}): Promise<Visit[]> {
  let q = db().from("visits").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
  if (opts.storeIds) q = q.in("store_id", opts.storeIds);
  if (opts.limit) q = q.limit(opts.limit);
  return rows<Visit>(await q);
}

export async function getVisit(id: string): Promise<Visit | null> {
  const r = await db().from("visits").select("*").eq("id", id).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  return (r.data as Visit) || null;
}

export async function getTodos(opts: { storeIds?: string[]; includeDone?: boolean; initiativeId?: string; personId?: string; visitId?: string } = {}): Promise<Todo[]> {
  let q = db().from("todos").select("*").order("done").order("due", { ascending: true, nullsFirst: false }).order("created_at");
  if (opts.storeIds) q = q.or(`store_id.in.(${opts.storeIds.join(",")}),store_id.is.null`);
  if (!opts.includeDone) q = q.eq("done", false);
  if (opts.initiativeId) q = q.eq("initiative_id", opts.initiativeId);
  if (opts.personId) q = q.eq("person_id", opts.personId);
  if (opts.visitId) q = q.eq("visit_id", opts.visitId);
  return rows<Todo>(await q);
}

export async function getBookmarks(storeIds?: string[]): Promise<Bookmark[]> {
  let q = db().from("bookmarks").select("*").order("sort_order").order("created_at");
  if (storeIds) q = q.or(`store_id.in.(${storeIds.join(",")}),store_id.is.null`);
  return rows<Bookmark>(await q);
}

export async function getResources(initiativeId: string): Promise<Resource[]> {
  return rows<Resource>(
    await db().from("resources").select("*").eq("initiative_id", initiativeId).order("sort_order").order("created_at"),
  );
}

export async function getGoals(opts: { initiativeId?: string; storeIds?: string[] } = {}): Promise<Goal[]> {
  let q = db().from("goals").select("*").order("created_at");
  if (opts.initiativeId) q = q.eq("initiative_id", opts.initiativeId);
  if (opts.storeIds) q = q.in("store_id", opts.storeIds).is("initiative_id", null);
  return rows<Goal>(await q);
}

export async function getGoalEntries(goalIds: string[]): Promise<GoalEntry[]> {
  if (!goalIds.length) return [];
  return rows<GoalEntry>(await db().from("goal_entries").select("*").in("goal_id", goalIds).order("date"));
}

export async function getWins(opts: { storeIds?: string[]; limit?: number; personId?: string; initiativeId?: string } = {}): Promise<Win[]> {
  let q = db().from("wins").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
  if (opts.storeIds) q = q.in("store_id", opts.storeIds);
  if (opts.personId) q = q.eq("person_id", opts.personId);
  if (opts.initiativeId) q = q.eq("initiative_id", opts.initiativeId);
  if (opts.limit) q = q.limit(opts.limit);
  return rows<Win>(await q);
}

export async function getCommitments(storeIds?: string[]): Promise<Commitment[]> {
  let q = db().from("commitments").select("*").order("created_at");
  if (storeIds) q = q.in("store_id", storeIds);
  return rows<Commitment>(await q);
}

export async function getMonthPlans(months: string[]): Promise<MonthPlan[]> {
  return rows<MonthPlan>(await db().from("month_plans").select("*").in("month", months));
}

export async function getPlaybook(): Promise<PlaybookItem[]> {
  return rows<PlaybookItem>(await db().from("playbook_items").select("*").order("sort_order").order("created_at"));
}

export async function getPlaybookChecks(month: string): Promise<PlaybookCheck[]> {
  return rows<PlaybookCheck>(await db().from("playbook_checks").select("*").eq("month", month));
}

export async function getStorePosts(opts: { storeIds?: string[]; openOnly?: boolean; limit?: number } = {}): Promise<StorePost[]> {
  let q = db().from("store_posts").select("*").order("created_at", { ascending: false });
  if (opts.storeIds) q = q.in("store_id", opts.storeIds);
  if (opts.openOnly) q = q.eq("status", "open");
  if (opts.limit) q = q.limit(opts.limit);
  return rows<StorePost>(await q);
}

export async function getExamples(opts: {
  personId?: string; initiativeId?: string; theme?: string; kind?: string; storeIds?: string[]; limit?: number;
} = {}): Promise<Example[]> {
  let q = db().from("examples").select("*").order("taken_on", { ascending: false }).order("created_at", { ascending: false });
  if (opts.personId) q = q.contains("person_ids", [opts.personId]);
  if (opts.initiativeId) q = q.eq("initiative_id", opts.initiativeId);
  if (opts.theme) q = q.ilike("theme", opts.theme);
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.storeIds) q = q.in("store_id", opts.storeIds);
  if (opts.limit) q = q.limit(opts.limit);
  return rows<Example>(await q);
}

export async function getExampleThemes(): Promise<string[]> {
  const r = rows<{ theme: string | null }>(await db().from("examples").select("theme").not("theme", "is", null));
  const seen = new Map<string, string>();
  for (const x of r) if (x.theme) { const k = x.theme.trim().toLowerCase(); if (k && !seen.has(k)) seen.set(k, x.theme.trim()); }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Attach short-lived signed URLs so the private bucket can be shown. */
export async function signExamples(list: Example[], seconds = 60 * 60 * 6): Promise<ExampleView[]> {
  if (!list.length) return [];
  const r = await db().storage.from("examples").createSignedUrls(list.map((e) => e.path), seconds);
  if (r.error) throw new Error(r.error.message);
  const byPath = new Map((r.data || []).map((x) => [x.path, x.signedUrl]));
  return list.map((e) => ({ ...e, url: byPath.get(e.path) || "" })).filter((e) => e.url);
}

export async function getChat(limit = 60): Promise<ChatMessage[]> {
  const r = await db().from("chat_messages").select("*").order("created_at", { ascending: false }).limit(limit);
  return rows<ChatMessage>(r).reverse();
}

/** Everything the chat assistant and recap need, in one pull. */
export async function getHubSnapshot() {
  const [stores, people, initiatives, roster, visits, todos, goals, wins, commitments] = await Promise.all([
    getStores(),
    getPeople(),
    getInitiatives(),
    getAllRoster(),
    getVisits({ limit: 120 }),
    getTodos({ includeDone: true }),
    getGoals(),
    getWins({ limit: 100 }),
    getCommitments(),
  ]);
  const entries = await getGoalEntries(goals.map((g) => g.id));
  return { stores, people, initiatives, roster, visits, todos, goals, entries, wins, commitments };
}
