import { db as defaultDb, type FocusDB } from "./db";
import { METRICS } from "./insights";
import { TIPS } from "./tips";

export type Mode = "study" | "work";

export interface Profile {
  mode: Mode;
  /** Time the user gave explicit consent to local-only storage. */
  consentAt: number;
}

const PROFILE_KEY = "profile";

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

function isExperiment(v: unknown): v is Experiment {
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

export async function endExperiment(db: FocusDB = defaultDb): Promise<void> {
  await db.settings.delete(EXPERIMENT_KEY);
}
