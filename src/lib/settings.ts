import { PROFILE_KEY, db as defaultDb, dayKey, type FocusDB } from "./db";
import { METRICS } from "./insights";
import { TIPS } from "./tips";

export type Mode = "study" | "work";

export interface Profile {
  mode: Mode;
  /** Time the user gave explicit consent to local-only storage. */
  consentAt: number;
}


function isProfile(v: unknown): v is Profile {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (p.mode === "study" || p.mode === "work") && typeof p.consentAt === "number";
}

export async function getProfile(db: FocusDB = defaultDb): Promise<Profile | null> {
  const row = await db.settings.get(PROFILE_KEY);
  return isProfile(row?.value) ? row.value : null;
}

/** Saves the profile. `consent` must be literally true: no consent, no storage. */
export async function saveProfile(
  mode: Mode,
  consent: true,
  db: FocusDB = defaultDb,
  now = Date.now(),
): Promise<Profile> {
  if (consent !== true) throw new Error("Consent is required");
  const profile: Profile = { mode, consentAt: now };
  await db.settings.put({ key: PROFILE_KEY, value: profile });
  return profile;
}

/** Changes the mode of an existing profile; keeps the original consent time. */
export async function updateMode(mode: Mode, db: FocusDB = defaultDb): Promise<Profile | null> {
  if (mode !== "study" && mode !== "work") return null;
  return db.transaction("rw", db.settings, async () => {
    const current = await getProfile(db);
    if (!current) return null; // no consent → no storage
    const profile: Profile = { mode, consentAt: current.consentAt };
    await db.settings.put({ key: PROFILE_KEY, value: profile });
    return profile;
  });
}

export const MODE_LABEL: Record<Mode, string> = { study: "Учусь", work: "Работаю" };

/** «Эксперимент недели» in progress (one at a time). */
export interface Experiment {
  /** Insight metric key (see METRICS in insights.ts). */
  metric: string;
  /** Tip used as the if-then plan. */
  tip: string;
  /** First day of the experiment, "YYYY-MM-DD". */
  start: string;
}

const EXPERIMENT_KEY = "experiment";
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isExperiment(v: unknown): v is Experiment {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.metric === "string" &&
    METRICS.some((m) => m.key === e.metric) &&
    typeof e.tip === "string" &&
    Object.hasOwn(TIPS, e.tip) &&
    typeof e.start === "string" &&
    DAY_RE.test(e.start)
  );
}

export async function getExperiment(db: FocusDB = defaultDb): Promise<Experiment | null> {
  const row = await db.settings.get(EXPERIMENT_KEY);
  return isExperiment(row?.value) ? row.value : null;
}

/** Starts an experiment; requires a consented profile (no consent, no storage). */
export async function startExperiment(e: Experiment, db: FocusDB = defaultDb): Promise<Experiment | null> {
  if (!isExperiment(e) || !(await getProfile(db))) return null;
  const value: Experiment = { metric: e.metric, tip: e.tip, start: e.start };
  await db.settings.put({ key: EXPERIMENT_KEY, value });
  return value;
}

/** Days of finished experiments, kept so tree drops earned in them are never lost. */
export interface ExperimentWindow {
  start: string;
  end: string;
}

const HISTORY_KEY = "experimentHistory";

export function isWindow(v: unknown): v is ExperimentWindow {
  if (!v || typeof v !== "object") return false;
  const w = v as Record<string, unknown>;
  return typeof w.start === "string" && DAY_RE.test(w.start) && typeof w.end === "string" && DAY_RE.test(w.end) && w.start <= w.end;
}

export async function getExperimentHistory(db: FocusDB = defaultDb): Promise<ExperimentWindow[]> {
  const row = await db.settings.get(HISTORY_KEY);
  return Array.isArray(row?.value) ? row.value.filter(isWindow) : [];
}

function plusDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y!, m! - 1, d! + n));
}

/** Ends the current experiment and records its window (start … min(start + 6, today)). */
export async function endExperiment(db: FocusDB = defaultDb, today: string = dayKey()): Promise<void> {
  await db.transaction("rw", db.settings, async () => {
    const current = await getExperiment(db);
    if (current) {
      const last = plusDays(current.start, 6);
      const end = today < last ? today : last;
      if (current.start <= end) {
        const history = await getExperimentHistory(db);
        await db.settings.put({ key: HISTORY_KEY, value: [...history, { start: current.start, end }] });
      }
    }
    await db.settings.delete(EXPERIMENT_KEY);
  });
}
