import { today, addDays } from "./fmt";
import type { Goal, GoalEntry } from "./types";

export type Phase = "reflect" | "track" | "close";

// Where each phase starts. Reflect covers days 1 through 3, Track days 4 through 20, Close day 21 to month end.
export const TRACK_STARTS = 4;
export const CLOSE_STARTS = 21;

export const PHASE_LABEL: Record<Phase, string> = {
  reflect: "Reflect and set",
  track: "Track",
  close: "Close strong",
};

export const PHASE_BLURB: Record<Phase, string> = {
  reflect: "What last month taught us and what we're focused on this month.",
  track: "How we're pacing against the goals, and what needs a nudge before it's too late.",
  close: "Every day counts now. Gaps to goal, who needs a push, and the close-out list.",
};

export type MonthInfo = {
  today: string;
  month: string;        // YYYY-MM
  prevMonth: string;    // YYYY-MM
  day: number;          // day of month
  daysInMonth: number;
  daysLeft: number;     // including today
  phase: Phase;
  monthStart: string;
  monthEnd: string;
  prevStart: string;
  prevEnd: string;
};

export function monthPhase(override?: string | null, date = today()): MonthInfo {
  const [y, m, d] = date.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const month = `${y}-${String(m).padStart(2, "0")}`;
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const prevEnd = addDays(monthStart, -1);
  const prevMonth = prevEnd.slice(0, 7);
  const prevStart = `${prevMonth}-01`;
  let phase: Phase = d < TRACK_STARTS ? "reflect" : d < CLOSE_STARTS ? "track" : "close";
  if (override === "reflect" || override === "track" || override === "close") phase = override;
  return { today: date, month, prevMonth, day: d, daysInMonth, daysLeft: daysInMonth - d + 1, phase, monthStart, monthEnd, prevStart, prevEnd };
}

export type GoalPace = {
  goal: Goal;
  current: number | null;     // latest value this month
  asOf: string | null;
  lastMonth: number | null;   // last value from previous month
  projected: number | null;   // count goals only
  gap: number | null;         // how far from target (positive = still needed)
  perDay: number | null;      // count goals: needed per remaining day
  status: "hit" | "on_pace" | "behind" | "no_data";
};

/**
 * Count goals (appointments set, units sold) are month-to-date totals, so we project them.
 * Rate goals (offer rate, show rate) are compared as-is.
 */
export function paceGoal(goal: Goal, entries: GoalEntry[], mi: MonthInfo): GoalPace {
  const mine = entries.filter((e) => e.goal_id === goal.id).sort((a, b) => a.date.localeCompare(b.date));
  const thisMonth = mine.filter((e) => e.date >= mi.monthStart && e.date <= mi.monthEnd);
  const prev = mine.filter((e) => e.date >= mi.prevStart && e.date <= mi.prevEnd);
  const latest = thisMonth[thisMonth.length - 1];
  const current = latest ? Number(latest.value) : null;
  const lastMonth = prev.length ? Number(prev[prev.length - 1].value) : null;
  const target = goal.target === null ? null : Number(goal.target);
  const up = goal.direction === "up";

  let projected: number | null = null;
  let perDay: number | null = null;
  let gap: number | null = null;
  let status: GoalPace["status"] = "no_data";

  if (current !== null) {
    if (goal.kind === "count") {
      const entryDay = Number(latest!.date.slice(8, 10));
      projected = Math.round((current / Math.max(1, entryDay)) * mi.daysInMonth);
      if (target !== null) {
        gap = target - current;
        const remaining = mi.daysInMonth - entryDay;
        perDay = gap > 0 && remaining > 0 ? Math.round((gap / remaining) * 10) / 10 : 0;
        status = current >= target ? "hit" : projected >= target ? "on_pace" : "behind";
      } else status = "on_pace";
    } else if (target !== null) {
      gap = up ? target - current : current - target;
      status = gap <= 0 ? "hit" : "behind";
    } else status = "on_pace";
  }
  return { goal, current, asOf: latest?.date || null, lastMonth, projected, gap, perDay, status };
}
