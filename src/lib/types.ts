export type Store = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  accent: string;
  sort_order: number;
  is_bdc: boolean;
  shows_under: string[];
  locations: string[];
};

export type Person = {
  id: string;
  store_id: string;
  name: string;
  role: string;
  location: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
};

export type Initiative = {
  id: string;
  name: string;
  description: string | null;
  status: "planning" | "active" | "sustaining" | "done";
  goal_text: string | null;
  start_date: string | null;
  store_ids: string[];
  sort_order: number;
  created_at: string;
};

export type RosterStatus = "not_started" | "trained" | "needs_followup" | "solid";

export type InitiativePerson = {
  id: string;
  initiative_id: string;
  person_id: string;
  status: RosterStatus;
  trained_on: string | null;
  notes: string | null;
  updated_at: string;
};

export type Visit = {
  id: string;
  store_id: string;
  date: string;
  focus: string | null;
  summary: string | null;
  private_notes: string | null;
  initiative_ids: string[];
  people_ids: string[];
  next_visit_date: string | null;
  next_visit_plan: string | null;
  created_at: string;
};

export type Todo = {
  id: string;
  store_id: string | null;
  initiative_id: string | null;
  person_id: string | null;
  visit_id: string | null;
  text: string;
  due: string | null;
  done: boolean;
  done_at: string | null;
  created_at: string;
};

export type Bookmark = {
  id: string;
  store_id: string | null;
  initiative_id: string | null;
  title: string;
  url: string;
  kind: "report" | "tool" | "doc";
  sort_order: number;
};

export type Resource = {
  id: string;
  initiative_id: string;
  title: string;
  kind: "script" | "word_track" | "video" | "doc" | "link";
  url: string | null;
  body: string | null;
  sort_order: number;
};

export type Goal = {
  id: string;
  initiative_id: string | null;
  store_id: string | null;
  name: string;
  unit: string;
  target: number | null;
  direction: "up" | "down";
  kind: "rate" | "count";
};

export type MonthPlan = {
  id: string;
  store_id: string | null;   // null = group-wide
  month: string;             // YYYY-MM
  lessons: string | null;    // what we learned from last month
  focus: string | null;      // what we're focused on this month
};

export type PlaybookItem = {
  id: string;
  phase: "reflect" | "track" | "close";
  store_id: string | null;   // null = applies to every store
  text: string;
  sort_order: number;
};

export type PlaybookCheck = {
  id: string;
  item_id: string;
  store_id: string;
  month: string;
};

export type GoalEntry = {
  id: string;
  goal_id: string;
  date: string;
  value: number;
  note: string | null;
};

export type Win = {
  id: string;
  store_id: string | null;
  initiative_id: string | null;
  person_id: string | null;
  date: string;
  text: string;
};

export type Commitment = {
  id: string;
  store_id: string;
  initiative_id: string | null;
  owner: string;
  text: string;
  status: "on_track" | "slipping" | "dropped" | "done";
  checked_at: string | null;
  notes: string | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export const ROSTER_LABEL: Record<RosterStatus, string> = {
  not_started: "Not yet",
  trained: "Trained",
  needs_followup: "Follow up",
  solid: "Trained", // legacy value, no longer offered
};
export const ROSTER_STATUSES: RosterStatus[] = ["not_started", "trained", "needs_followup"];

export const INITIATIVE_STATUS_LABEL: Record<Initiative["status"], string> = {
  planning: "Planning",
  active: "Active",
  sustaining: "Sustaining",
  done: "Done",
};

export const COMMITMENT_LABEL: Record<Commitment["status"], string> = {
  on_track: "On track",
  slipping: "Slipping",
  dropped: "Dropped",
  done: "Done",
};

export const ROLES = ["Salesperson", "BDC Agent", "Sales Manager", "GM", "F&I", "Service Advisor", "Other"];

export type StorePost = {
  id: string;
  store_id: string;
  author: string;
  kind: "note" | "question" | "idea";
  body: string;
  status: "open" | "answered" | "closed";
  reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export const POST_KIND_LABEL: Record<StorePost["kind"], string> = {
  note: "Note",
  question: "Question",
  idea: "Idea",
};

export type Example = {
  id: string;
  store_id: string | null;
  initiative_id: string | null;
  theme: string | null;
  kind: "good" | "opportunity" | "pattern";
  caption: string | null;
  person_ids: string[];
  path: string;
  content_type: string | null;
  width: number | null;
  height: number | null;
  taken_on: string;
  created_at: string;
};

export const EXAMPLE_KIND_LABEL: Record<Example["kind"], string> = {
  good: "Good example",
  opportunity: "Opportunity",
  pattern: "Pattern",
};

/** What the gallery gets: an example plus a signed image URL. */
export type ExampleView = Example & { url: string };

export type GroupNote = { key: string; body: string | null; updated_at: string };

export type Meeting = {
  id: string;
  date: string;
  title: string;
  agenda: string | null;
  notes: string | null;
  created_at: string;
};

export type StoreMetric = {
  id: string;
  store_id: string;
  location: string | null;
  period: string;
  as_of: string;
  sold: number;
  new_sold: number | null; used_sold: number | null;
  appts_due: number | null; appts_confirmed: number | null; appts_shown: number | null; appts_sold: number | null;
  lot_ups: number | null; phone_ups: number | null; web_ups: number | null; campaign_ups: number | null; be_backs: number | null; write_ups: number | null;
  outbound_calls: number | null; live_calls: number | null;
  source: string | null;
  created_at: string;
};

/** Where an initiative is in its life. Kept beside the initiative, shown as a pill. */
export const AREAS = ["Internet and phone", "Internet", "Phone"] as const;
export const AREA_DEFAULT = AREAS[0];
export const STAGES = ["Planning", "Rolling out", "Training", "Coaching execution", "Measuring", "Sustaining"] as const;
export type Stage = (typeof STAGES)[number];
