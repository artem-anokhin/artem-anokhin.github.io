import type { DayKey, FocusTestResult } from "./db";
import { latestTestByDay } from "./today";

/**
 * The motivation tree. Pure functions: growth is computed from stored days,
 * nothing extra is saved.
 *
 * Drops (max 3 per day): +1 check-in, +1 Focus test, +1 experiment day
 * (a check-in on a day inside a current or past experiment window).
 * Drops are never taken away. A single missed day changes nothing; the tree
 * only looks wilted after 3 silent days in a row and recovers on the next activity
 * (Lally 2010: one missed day does not break habit formation).
 */

export const STAGES = ["семя", "росток", "саженец", "дерево", "цветёт"] as const;
export type StageName = (typeof STAGES)[number];

/** Drops needed to reach each stage. ~2 drops a day → full bloom in about a month. */
export const STAGE_AT = [0, 6, 18, 36, 60] as const;
export const SILENT_DAYS_TO_WILT = 3;

export interface TreeInput {
  checkinDates: DayKey[];
  tests: FocusTestResult[];
  experiment: { start: DayKey } | null;
  /** Finished experiments (inclusive day windows). */
  pastExperiments?: { start: DayKey; end: DayKey }[];
  /** Days with at least one finished «Фокус-сессия» (+1 drop per day). */
  sessionDates?: DayKey[];
  /** Days with at least one habit done (+1 drop per day). */
  habitDates?: DayKey[];
  today: DayKey;
}

export interface WeekFacts {
  checkins: number;
  tests: number;
  /** Days with a finished focus session in the last 7 days. */
  sessions: number;
  best: { score: number; date: DayKey } | null;
}

export interface TreeState {
  drops: number;
  stage: number;
  stageName: StageName;
  /** Drops needed for the next stage, null at the last stage. */
  nextAt: number | null;
  /** 0–1 progress inside the current stage (1 at the last stage). */
  progress: number;
  /** Full days since the last activity (0 if active today). Null when there was no activity yet. */
  silentDays: number | null;
  wilting: boolean;
  week: WeekFacts;
}

function toDate(k: DayKey): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function dayKeyOf(d: Date): DayKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole calendar days from a to b (DST-safe). */
export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
}

export function stageFor(drops: number): number {
  let s = 0;
  for (let i = 0; i < STAGE_AT.length; i++) if (drops >= STAGE_AT[i]!) s = i;
  return s;
}

export function treeState({ checkinDates, tests, experiment, pastExperiments = [], sessionDates = [], habitDates = [], today }: TreeInput): TreeState {
  const checkins = new Set(checkinDates.filter((d) => d <= today));
  const testDays = new Set(tests.map((t) => t.date).filter((d) => d <= today));
  const sessionDays = new Set(sessionDates.filter((d) => d <= today));
  const habitDays = new Set(habitDates.filter((d) => d <= today));

  let drops = checkins.size + testDays.size + sessionDays.size + habitDays.size;
  const windows = [...pastExperiments];
  if (experiment) {
    const end = new Date(toDate(experiment.start).getTime());
    end.setDate(end.getDate() + 6);
    windows.push({ start: experiment.start, end: dayKeyOf(end) });
  }
  // One experiment drop per check-in day at most, even if windows overlap.
  for (const d of checkins) if (windows.some((w) => w.start <= d && d <= w.end)) drops += 1;

  const stage = stageFor(drops);
  const nextAt = stage < STAGE_AT.length - 1 ? STAGE_AT[stage + 1]! : null;
  const progress = nextAt === null ? 1 : (drops - STAGE_AT[stage]!) / (nextAt - STAGE_AT[stage]!);

  const active = [...checkins, ...testDays, ...sessionDays, ...habitDays].sort();
  const last = active.at(-1);
  const silentDays = last === undefined ? null : daysBetween(last, today);
  // "3 silent days" = three full days without activity before today.
  const wilting = silentDays !== null && silentDays > SILENT_DAYS_TO_WILT;

  // Last 7 days including today.
  const inWeek = (d: DayKey) => {
    const n = daysBetween(d, today);
    return n >= 0 && n < 7;
  };
  let best: WeekFacts["best"] = null;
  for (const [date, t] of latestTestByDay(tests)) {
    if (inWeek(date) && (!best || t.score > best.score)) best = { score: t.score, date };
  }
  const week: WeekFacts = {
    checkins: [...checkins].filter(inWeek).length,
    tests: [...testDays].filter(inWeek).length,
    sessions: [...sessionDays].filter(inWeek).length,
    best,
  };

  return { drops, stage, stageName: STAGES[stage]!, nextAt, progress, silentDays, wilting, week };
}

const WEEKDAY_IN = ["в воскресенье", "в понедельник", "во вторник", "в среду", "в четверг", "в пятницу", "в субботу"];

export interface TreeMessage {
  text: string;
  source?: { name: string; url: string };
}

const LALLY = { name: "Lally et al., 2010", url: "https://core.ac.uk/download/70653523.pdf" };

/** 1–2 short messages built only from the user's real facts. */
export function treeMessages(s: TreeState): TreeMessage[] {
  const out: TreeMessage[] = [];
  if (s.silentDays === null) {
    out.push({ text: "Посадите первое семечко: один чек-ин — первая капля." });
    return out;
  }
  if (s.wilting) {
    out.push({
      text: "Дерево отдыхает. Загляните, когда будет удобно — капли на месте.",
    });
    out.push({ text: "Один пропуск привычку не ломает, а вернуться можно в любой день.", source: LALLY });
    return out;
  }
  if (s.silentDays === 2) {
    // Exactly one missed day (yesterday): the source speaks about a single miss.
    out.push({ text: "Один пропущенный день — это нормально: по данным исследования, один пропуск привычку не ломает.", source: LALLY });
  }
  const { checkins, tests, best } = s.week;
  if (checkins + tests > 0) {
    const parts = [checkins > 0 && `чек-инов: ${checkins}`, tests > 0 && `тестов: ${tests}`].filter(Boolean);
    out.push({ text: `За 7 дней ${parts.join(", ")}.` });
  }
  if (best && out.length < 2) {
    out.push({ text: `Лучший Focus Score недели — ${best.score}, ${WEEKDAY_IN[toDate(best.date).getDay()]}.` });
  }
  return out.slice(0, 2);
}
