import { dayKey, type CheckIn, type DayKey, type FocusSession, type FocusTestResult } from "./db";
import { sleepHours } from "./checkin";
import { latestTestByDay } from "./today";

/** Pure helpers for the «Статистика» screen. All dates are local calendar days. */

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parse = (k: DayKey) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/** Focus minutes per week (Monday-based), `weeks` weeks ending with the current one, oldest first. */
export function weeklyMinutes(sessions: Pick<FocusSession, "date" | "minutes">[], today = new Date(), weeks = 8): { start: DayKey; minutes: number }[] {
  const first = addDays(monday(today), -7 * (weeks - 1));
  const out = Array.from({ length: weeks }, (_, i) => ({ start: dayKey(addDays(first, 7 * i)), minutes: 0 }));
  for (const s of sessions) {
    const idx = Math.floor((parse(s.date).getTime() - first.getTime()) / (7 * 86_400_000) + 1e-9);
    if (idx >= 0 && idx < weeks) out[idx]!.minutes += s.minutes;
  }
  return out;
}

/** Heatmap grid: `weeks` columns × 7 rows (Mon..Sun) of focus minutes; future days are null. */
export function focusCalendar(sessions: Pick<FocusSession, "date" | "minutes">[], today = new Date(), weeks = 12): { date: DayKey; minutes: number | null }[][] {
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.minutes);
  const first = addDays(monday(today), -7 * (weeks - 1));
  const end = dayKey(today);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = dayKey(addDays(first, w * 7 + d));
      return { date, minutes: date > end ? null : (byDay.get(date) ?? 0) };
    }),
  );
}

/** 5-step level for a heatmap cell (0 = none). Thresholds in minutes. */
export function level(min: number | null): 0 | 1 | 2 | 3 | 4 {
  if (!min) return 0;
  if (min < 25) return 1;
  if (min < 50) return 2;
  if (min < 100) return 3;
  return 4;
}

/** Daily Focus Score for the last `days` days with a trailing 7-day mean (needs ≥3 tests in the window). */
export function scoreTrend(tests: FocusTestResult[], today = new Date(), days = 30): { date: DayKey; score: number | null; avg7: number | null }[] {
  const byDay = latestTestByDay(tests);
  const rows = Array.from({ length: days }, (_, i) => {
    const date = dayKey(addDays(today, i - days + 1));
    return { date, score: byDay.get(date)?.score ?? null, avg7: null as number | null };
  });
  // Trailing window looks back across the 30-day edge too.
  for (const r of rows) {
    const base = parse(r.date);
    const xs: number[] = [];
    for (let k = 0; k < 7; k++) {
      const v = byDay.get(dayKey(addDays(base, -k)))?.score;
      if (v !== undefined) xs.push(v);
    }
    r.avg7 = xs.length >= 3 ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  }
  return rows;
}

/** Session starts in 2-hour bins (0–2, 2–4 … 22–24). */
export function hourBins(sessions: Pick<FocusSession, "startedAt" | "minutes">[]): { from: number; minutes: number }[] {
  const out = Array.from({ length: 12 }, (_, i) => ({ from: i * 2, minutes: 0 }));
  for (const s of sessions) out[Math.floor(new Date(s.startedAt).getHours() / 2)]!.minutes += s.minutes;
  return out;
}

/** (sleep hours, Focus Score) pairs for days with both. */
export function sleepVsScore(checkins: CheckIn[], tests: FocusTestResult[]): { date: DayKey; sleep: number; score: number }[] {
  const byDay = latestTestByDay(tests);
  return checkins
    .map((c) => ({ date: c.date, sleep: Math.round(sleepHours(c.sleep.bedtime, c.sleep.wake) * 10) / 10, score: byDay.get(c.date)?.score }))
    .filter((p): p is { date: DayKey; sleep: number; score: number } => p.score !== undefined && Number.isFinite(p.sleep))
    .sort((a, b) => a.date.localeCompare(b.date));
}
