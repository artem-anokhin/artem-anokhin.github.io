import { sleepHours } from "./checkin";
import type { CheckIn, DayKey, FocusSession, FocusTestResult, HabitLog } from "./db";
import { daysBetween } from "./tree";
import { latestTestByDay } from "./today";

/**
 * «Итоги недели»: last 7 days (incl. today) vs the 7 days before.
 * Plain counts and averages of the user's own data — no claims about causes.
 */

export interface WeekStats {
  checkinDays: number;
  testDays: number;
  /** Mean of the daily Focus Score (latest test per day), rounded; null without tests. */
  avgScore: number | null;
  focusMinutes: number;
  /** Habit marks in the range (each habit done on each day counts once). */
  habitMarks: number;
  /** Mean sleep in hours over check-in days, one decimal; null without check-ins. */
  avgSleep: number | null;
  best: { date: DayKey; score: number } | null;
}

export interface WeeklyReview {
  current: WeekStats;
  previous: WeekStats;
  /** Change in average Focus Score; null if either week has no tests. */
  scoreDelta: number | null;
  /** Each of the last 7 days (oldest → today): which activities happened. */
  days: { date: DayKey; checkin: boolean; test: boolean; session: boolean; habit: boolean }[];
}

function stats(
  checkins: CheckIn[],
  tests: Map<DayKey, FocusTestResult>,
  sessions: FocusSession[],
  habitLogs: HabitLog[],
  inRange: (d: DayKey) => boolean,
): WeekStats {
  const cs = checkins.filter((c) => inRange(c.date));
  const ts = [...tests.values()].filter((t) => inRange(t.date));
  const sleeps = cs.map((c) => {
    try {
      return sleepHours(c.sleep.bedtime, c.sleep.wake);
    } catch {
      return NaN;
    }
  }).filter(Number.isFinite);
  let best: WeekStats["best"] = null;
  for (const t of ts) if (!best || t.score > best.score) best = { date: t.date, score: t.score };
  return {
    checkinDays: cs.length,
    testDays: ts.length,
    avgScore: ts.length ? Math.round(ts.reduce((a, t) => a + t.score, 0) / ts.length) : null,
    focusMinutes: sessions.filter((s) => inRange(s.date)).reduce((a, s) => a + s.minutes, 0),
    habitMarks: habitLogs.filter((l) => inRange(l.date)).length,
    avgSleep: sleeps.length ? Math.round((sleeps.reduce((a, b) => a + b, 0) / sleeps.length) * 10) / 10 : null,
    best,
  };
}

function minusDays(key: DayKey, n: number): DayKey {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d! - n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function weeklyReview(
  checkins: CheckIn[],
  tests: FocusTestResult[],
  sessions: FocusSession[],
  today: DayKey,
  habitLogs: HabitLog[] = [],
): WeeklyReview {
  const byDay = latestTestByDay(tests);
  const age = (d: DayKey) => daysBetween(d, today);
  const current = stats(checkins, byDay, sessions, habitLogs, (d) => age(d) >= 0 && age(d) < 7);
  const previous = stats(checkins, byDay, sessions, habitLogs, (d) => age(d) >= 7 && age(d) < 14);
  const cDays = new Set(checkins.map((c) => c.date));
  const sDays = new Set(sessions.map((s) => s.date));
  const hDays = new Set(habitLogs.map((l) => l.date));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = minusDays(today, 6 - i);
    return { date, checkin: cDays.has(date), test: byDay.has(date), session: sDays.has(date), habit: hDays.has(date) };
  });
  const scoreDelta = current.avgScore !== null && previous.avgScore !== null ? current.avgScore - previous.avgScore : null;
  return { current, previous, scoreDelta, days };
}
