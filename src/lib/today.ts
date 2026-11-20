import { minutes, sleepHours, type CheckInData, type SphereKey } from "./checkin";
import { dayKey, type CheckIn, type DayKey, type FocusTestResult } from "./db";
import type { TipKey } from "./tips";

/**
 * Pure helpers for the Today and History screens. Thresholds come from docs/sources.md:
 * sleep ≥ 7 h (AASM/SRS), caffeine ≤ 3 cups (FDA ~2–3 cups) and none within 6 h of
 * bedtime (Drake 2013). Spheres without a sourced rule get no status (null).
 */

export type SphereStatus = "ok" | "attention" | null;

const MIN_SLEEP_H = 7;
const MAX_CUPS = 3;
const CAFFEINE_GAP_MIN = 6 * 60;
const HIGH_STRESS = 4;

/**
 * Last caffeine closer than 6 h to the usual bedtime (or after it).
 * Bedtime from last night's sleep is used as the usual bedtime.
 */
export function caffeineLate(d: CheckInData): boolean {
  const { lastAt, cups } = d.caffeine;
  if (!lastAt || cups === 0) return false;
  const day = 24 * 60;
  const wake = minutes(d.sleep.wake);
  const awake = (minutes(d.sleep.bedtime) - wake + day) % day;
  if (awake === 0) return false;
  const sinceWake = (minutes(lastAt) - wake + day) % day;
  return sinceWake > awake - CAFFEINE_GAP_MIN;
}

/** Tip triggers in priority order; the first that fires is today's tip. */
const TRIGGERS: [TipKey, (d: CheckInData) => boolean][] = [
  ["sleepShort", (d) => sleepHours(d.sleep.bedtime, d.sleep.wake) < MIN_SLEEP_H],
  ["caffeineLate", caffeineLate],
  ["caffeineMuch", (d) => d.caffeine.cups > MAX_CUPS],
  ["highStress", (d) => d.mind.stress >= HIGH_STRESS],
  ["noBreakfast", (d) => !d.food.breakfast],
  ["lowActivity", (d) => d.activity.level === "minimal"],
  ["noRest", (d) => d.rest.type === "none"],
];

export function pickTip(d: CheckInData): TipKey {
  return TRIGGERS.find(([, fires]) => fires(d))?.[0] ?? "default";
}

const fired = (d: CheckInData, ...keys: TipKey[]) =>
  TRIGGERS.some(([k, fires]) => keys.includes(k) && fires(d));

const status = (attention: boolean): SphereStatus => (attention ? "attention" : "ok");

export function sphereStatus(d: CheckInData): Record<SphereKey, SphereStatus> {
  return {
    sleep: status(fired(d, "sleepShort")),
    food: status(fired(d, "noBreakfast")),
    caffeine: status(fired(d, "caffeineLate", "caffeineMuch")),
    mind: status(fired(d, "highStress")),
    activity: status(fired(d, "lowActivity")),
    work: null,
    rest: status(fired(d, "noRest")),
  };
}

/** The latest test of each day counts (retakes do not let you "improve" a day). */
export function latestTestByDay(tests: FocusTestResult[]): Map<DayKey, FocusTestResult> {
  const byDay = new Map<DayKey, FocusTestResult>();
  for (const t of tests) {
    const prev = byDay.get(t.date);
    if (!prev || t.takenAt > prev.takenAt) byDay.set(t.date, t);
  }
  return byDay;
}

export interface HistoryDay {
  date: DayKey;
  score: number | null;
  checkedIn: boolean;
}

/** Last `n` calendar days ending at `today`, oldest first. */
export function historyDays(
  checkins: Pick<CheckIn, "date">[],
  tests: FocusTestResult[],
  today: Date = new Date(),
  n = 30,
): HistoryDay[] {
  const scores = latestTestByDay(tests);
  const done = new Set(checkins.map((c) => c.date));
  const days: HistoryDay[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const date = dayKey(d);
    days.push({ date, score: scores.get(date)?.score ?? null, checkedIn: done.has(date) });
  }
  return days;
}
