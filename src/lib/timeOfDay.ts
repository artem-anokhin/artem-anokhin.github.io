import type { FocusTestResult } from "./db";
import { MIN_DAYS } from "./insights";

/** Parts of the day for «Когда фокус выше» (local time). */
export const PARTS = [
  { key: "morning", label: "Утро", from: 5, to: 12, gen: "утром" },
  { key: "day", label: "День", from: 12, to: 18, gen: "днём" },
  { key: "evening", label: "Вечер", from: 18, to: 29, gen: "вечером" }, // 18:00–05:00
] as const;
export type PartKey = (typeof PARTS)[number]["key"];

/** Fewest tests in a part of the day before we show its average. */
export const MIN_TESTS_PER_PART = 3;
/** Smallest gap (Focus Score points) we call a difference. */
export const MIN_GAP = 5;

export function partOf(ts: number): PartKey {
  const h = new Date(ts).getHours();
  const hh = h < 5 ? h + 24 : h;
  return PARTS.find((p) => hh >= p.from && hh < p.to)!.key;
}

export interface TimeOfDay {
  /** Average score per part with ≥ MIN_TESTS_PER_PART tests (null otherwise). */
  parts: { key: PartKey; label: string; avg: number | null; tests: number }[];
  /** Best part when it beats the next one by ≥ MIN_GAP points, else null. */
  best: (typeof PARTS)[number] | null;
  /** Distinct days with a test. */
  days: number;
}

/** Groups every test (not only the last of the day) by time of day. Null under MIN_DAYS days. */
export function timeOfDay(tests: Pick<FocusTestResult, "takenAt" | "score" | "date">[]): TimeOfDay | null {
  const days = new Set(tests.map((t) => t.date)).size;
  if (days < MIN_DAYS) return null;
  const parts = PARTS.map((p) => {
    const xs = tests.filter((t) => partOf(t.takenAt) === p.key).map((t) => t.score);
    const avg = xs.length >= MIN_TESTS_PER_PART ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
    return { key: p.key, label: p.label, avg, tests: xs.length };
  });
  const known = parts.filter((p) => p.avg !== null).sort((a, b) => b.avg! - a.avg!);
  const best = known.length >= 2 && known[0]!.avg! - known[1]!.avg! >= MIN_GAP ? PARTS.find((p) => p.key === known[0]!.key)! : null;
  return { parts, best, days };
}
