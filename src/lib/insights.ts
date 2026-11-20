import { isAnswered, minutes, sleepHours, type CheckInData, type SphereKey } from "./checkin";
import type { CheckIn, DayKey, FocusTestResult } from "./db";
import type { TipKey } from "./tips";
import { latestTestByDay } from "./today";

/**
 * Insights engine (the AI core): local statistics, no network.
 *
 * For each check-in metric we pair the day's value with the day's Focus Score
 * (latest test of that day) and compute Spearman's rank correlation.
 * Only days where the user actually answered that sphere are used.
 * Results are associations («связано»), never causes: personal correlations are
 * hypotheses and factors are confounded (Frontiers in Digital Health, 2020).
 */

export const MIN_DAYS = 7;
/** Below this |rho| an association is not shown at all (likely noise). */
export const MIN_SHOWN_RHO = 0.2;

export type Strength = "слабая" | "заметная" | "сильная";

export interface Metric {
  key: string;
  sphere: SphereKey;
  /** Clause for «В дни, …»: describes the metric being higher. */
  higher: string;
  /** Clause for «В дни, …»: describes the metric being lower. */
  lower: string;
  value: (d: CheckInData) => number | null;
  /**
   * Tip to try as «Эксперимент недели», and the direction of the metric that the
   * tip moves towards (+1 = more, −1 = less). Only metrics with sourced advice have one.
   */
  experiment?: { tip: TipKey; direction: 1 | -1 };
}

const ACTIVITY_RANK = { minimal: 0, medium: 1, frequent: 2, active: 3 } as const;

/** Hours between the last caffeine and the usual bedtime; null on days without caffeine. */
function caffeineGapHours(d: CheckInData): number | null {
  if (d.caffeine.cups === 0 || !d.caffeine.lastAt) return null;
  const day = 24 * 60;
  const wake = minutes(d.sleep.wake);
  const awake = (minutes(d.sleep.bedtime) - wake + day) % day;
  const sinceWake = (minutes(d.caffeine.lastAt) - wake + day) % day;
  return (awake - sinceWake) / 60; // negative = after bedtime
}

export const METRICS: readonly Metric[] = [
  {
    key: "sleepHours",
    sphere: "sleep",
    higher: "когда вы спали дольше",
    lower: "когда вы спали меньше",
    value: (d) => sleepHours(d.sleep.bedtime, d.sleep.wake),
    experiment: { tip: "sleepShort", direction: 1 },
  },
  {
    key: "sleepQuality",
    sphere: "sleep",
    higher: "когда вы оценивали сон выше",
    lower: "когда вы оценивали сон ниже",
    value: (d) => d.sleep.quality,
  },
  {
    key: "breakfast",
    sphere: "food",
    higher: "с завтраком",
    lower: "без завтрака",
    value: (d) => (d.food.breakfast ? 1 : 0),
    experiment: { tip: "noBreakfast", direction: 1 },
  },
  {
    key: "cups",
    sphere: "caffeine",
    higher: "когда вы пили больше кофеина",
    lower: "когда вы пили меньше кофеина",
    value: (d) => d.caffeine.cups,
    experiment: { tip: "caffeineMuch", direction: -1 },
  },
  {
    key: "caffeineGap",
    sphere: "caffeine",
    higher: "когда последний кофеин был задолго до сна",
    lower: "когда последний кофеин был ближе ко сну",
    value: caffeineGapHours,
    experiment: { tip: "caffeineLate", direction: 1 },
  },
  {
    key: "water",
    sphere: "caffeine",
    higher: "когда вы пили больше воды",
    lower: "когда вы пили меньше воды",
    value: (d) => d.caffeine.water,
  },
  {
    key: "stress",
    sphere: "mind",
    higher: "когда стресс был выше",
    lower: "когда стресс был ниже",
    value: (d) => d.mind.stress,
    experiment: { tip: "highStress", direction: -1 },
  },
  {
    key: "mood",
    sphere: "mind",
    higher: "когда настроение было лучше",
    lower: "когда настроение было хуже",
    value: (d) => d.mind.mood,
  },
  {
    key: "activity",
    sphere: "activity",
    higher: "когда вы больше двигались",
    lower: "когда вы меньше двигались",
    value: (d) => ACTIVITY_RANK[d.activity.level],
    experiment: { tip: "lowActivity", direction: 1 },
  },
  {
    key: "workHours",
    sphere: "work",
    higher: "когда вы дольше занимались",
    lower: "когда вы меньше занимались",
    value: (d) => d.work.hours,
  },
  {
    key: "difficulty",
    sphere: "work",
    higher: "когда задачи были сложнее",
    lower: "когда задачи были проще",
    value: (d) => d.work.difficulty,
  },
  {
    key: "rest",
    sphere: "rest",
    higher: "когда вы находили время на отдых",
    lower: "без отдыха",
    value: (d) => (d.rest.type === "none" ? 0 : 1),
    experiment: { tip: "noRest", direction: 1 },
  },
];

/** Average ranks (1-based), ties share the mean rank. */
export function ranks(xs: number[]): number[] {
  const order = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(xs.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k]![1]] = rank;
    i = j + 1;
  }
  return out;
}

/** Spearman's rho = Pearson correlation of ranks (handles ties). Null if undefined. */
export function spearman(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mean = (n + 1) / 2;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i]! - mean;
    const dy = ry[i]! - mean;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null; // a constant series has no rank correlation
  return sxy / Math.sqrt(sxx * syy);
}

/**
 * Strength label. Thresholds (< 0.3 / 0.3–0.5 / ≥ 0.5 on |rho|) are app
 * heuristics, not from docs/sources.md. Under 14 days «сильная» is capped
 * to «заметная» because small samples are unstable.
 */
export function strength(rho: number, days: number): Strength {
  const a = Math.abs(rho);
  if (a >= 0.5 && days >= 14) return "сильная";
  if (a >= 0.3) return "заметная";
  return "слабая";
}

export interface Insight {
  metric: Metric;
  rho: number;
  days: number;
  strength: Strength;
  /** Plain-Russian sentence, «связано» style. */
  text: string;
}

export interface DayPair {
  date: DayKey;
  checkin: CheckIn;
  score: number;
}

/** Paired days where the user answered at least one sphere (counts towards the 7-day gate). */
export function usableDays(pairs: DayPair[]): number {
  return pairs.filter((p) => p.checkin.answered === undefined || (Array.isArray(p.checkin.answered) && p.checkin.answered.length > 0)).length;
}

/** Days that have both a check-in and a Focus Score, oldest first. */
export function pairDays(checkins: CheckIn[], tests: FocusTestResult[]): DayPair[] {
  const scores = latestTestByDay(tests);
  return checkins
    .filter((c) => scores.has(c.date))
    .map((c) => ({ date: c.date, checkin: c, score: scores.get(c.date)!.score }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function sentence(m: Metric, rho: number): string {
  // Say it from the side where the score was higher: a positive rho means "more X ~ higher score".
  const clause = rho > 0 ? m.higher : m.lower;
  // «… в дни, когда …» vs «… в дни с завтраком»
  return clause.startsWith("когда")
    ? `В ваших данных Focus Score чаще был выше в дни, ${clause}.`
    : `В ваших данных Focus Score чаще был выше в дни ${clause}.`;
}

/** All shown associations, strongest first. Needs ≥ MIN_DAYS answered days per metric. */
export function computeInsights(pairs: DayPair[]): Insight[] {
  const out: Insight[] = [];
  for (const m of METRICS) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const p of pairs) {
      if (!isAnswered(p.checkin, m.sphere)) continue;
      const v = m.value(p.checkin);
      if (v === null || !Number.isFinite(v)) continue;
      xs.push(v);
      ys.push(p.score);
    }
    if (xs.length < MIN_DAYS) continue;
    const rho = spearman(xs, ys);
    if (rho === null || Math.abs(rho) < MIN_SHOWN_RHO) continue;
    out.push({ metric: m, rho, days: xs.length, strength: strength(rho, xs.length), text: sentence(m, rho) });
  }
  return out.sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));
}

export function topInsights(pairs: DayPair[], n = 3): Insight[] {
  return computeInsights(pairs).slice(0, n);
}

/**
 * «Эксперимент недели»: the strongest association whose metric has sourced advice
 * AND where the data points the same way as the advice (e.g. more sleep ~ higher score).
 * We never suggest something the sources advise against, even if the data hints at it.
 */
export function pickExperiment(insights: Insight[]): Insight | null {
  return (
    insights.find((i) => i.metric.experiment && Math.sign(i.rho) === i.metric.experiment.direction) ?? null
  );
}

export const EXPERIMENT_DAYS = 7;
/** Minimum scored days in each window to compare before/after. */
export const MIN_WINDOW_DAYS = 3;

export interface ExperimentResult {
  before: { days: number; mean: number | null };
  after: { days: number; mean: number | null };
  /** after − before, rounded; null when either window has too few days. */
  diff: number | null;
}

function addDays(key: DayKey, n: number): DayKey {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d! + n);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

/** Days elapsed since the experiment start (start day = day 1). */
export function experimentDay(start: DayKey, today: DayKey): number {
  const toDate = (k: DayKey) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y!, m! - 1, d!);
  };
  // Round: a DST day is 23 or 25 hours long.
  const n = Math.round((toDate(today).getTime() - toDate(start).getTime()) / 86_400_000) + 1;
  return Math.max(1, n); // clock or time-zone changes must not give day 0 or less
}

/**
 * Compare mean daily Focus Score in the 7 days before `start` with the 7 days
 * from `start` on. Descriptive only: no claim that the change caused the difference.
 */
export function experimentResult(tests: FocusTestResult[], start: DayKey): ExperimentResult {
  const byDay = latestTestByDay(tests);
  const window = (from: DayKey) => {
    const xs: number[] = [];
    for (let i = 0; i < EXPERIMENT_DAYS; i++) {
      const s = byDay.get(addDays(from, i))?.score;
      if (s !== undefined) xs.push(s);
    }
    return { days: xs.length, mean: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null };
  };
  const before = window(addDays(start, -EXPERIMENT_DAYS));
  const after = window(start);
  const enough = before.days >= MIN_WINDOW_DAYS && after.days >= MIN_WINDOW_DAYS;
  const diff = enough ? Math.round(after.mean! - before.mean!) : null;
  return { before, after, diff };
}

export interface SplitMeans {
  /** Mean Focus Score on days where the metric was above its median. */
  high: number;
  /** Mean Focus Score on days at or below the median. */
  low: number;
  highDays: number;
  lowDays: number;
}

/**
 * Descriptive split for the insight mini chart: mean score on "higher" vs
 * "lower" days of a metric (median split). Null when either side is empty.
 */
export function splitMeans(pairs: DayPair[], metric: Metric): SplitMeans | null {
  const rows: { v: number; s: number }[] = [];
  for (const p of pairs) {
    const answered = p.checkin.answered;
    if (Array.isArray(answered) && !answered.includes(metric.sphere)) continue;
    let v: number | null;
    try {
      v = metric.value(p.checkin);
    } catch {
      v = null;
    }
    if (v !== null && Number.isFinite(v)) rows.push({ v, s: p.score });
  }
  if (rows.length < 2) return null;
  const sorted = rows.map((r) => r.v).sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)]!;
  const hi = rows.filter((r) => r.v > median);
  const lo = rows.filter((r) => r.v <= median);
  if (!hi.length || !lo.length) return null;
  const mean = (xs: { s: number }[]) => Math.round(xs.reduce((a, r) => a + r.s, 0) / xs.length);
  return { high: mean(hi), low: mean(lo), highDays: hi.length, lowDays: lo.length };
}
