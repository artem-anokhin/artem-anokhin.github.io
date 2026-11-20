import { SPHERE_KEYS, sanitizeCheckIn } from "./checkin";
import { db as defaultDb, type CheckIn, type FocusDB, type FocusSession, type FocusTestResult, type Setting } from "./db";
import { getProfile, isExperiment, isWindow } from "./settings";

export const EXPORT_FORMAT = "focusai-export";
export const EXPORT_VERSION = 1;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  checkins: unknown[];
  focusTests: unknown[];
  /** All settings rows: profile, experiment, experimentHistory, … */
  settings: unknown[];
  /** Finished focus sessions (added in export version 1, optional on import). */
  sessions?: unknown[];
}

/** Snapshot of every table, read in one transaction so it is consistent. */
export async function exportData(database: FocusDB = defaultDb, now = new Date()): Promise<ExportFile> {
  return database.transaction("r", [database.checkins, database.focusTests, database.settings, database.sessions], async () => ({
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    checkins: await database.checkins.toArray(),
    focusTests: await database.focusTests.toArray(),
    settings: await database.settings.toArray(),
    sessions: await database.sessions.toArray(),
  }));
}

export function exportFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `focusai-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** Triggers a local download; nothing leaves the device. */
export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Deletes all user data (check-ins, tests, sessions, profile, experiments) in one transaction. */
export async function deleteAllData(database: FocusDB = defaultDb): Promise<void> {
  await database.transaction("rw", [database.checkins, database.focusTests, database.settings, database.sessions], async () => {
    await database.sessions.clear();
    await database.checkins.clear();
    await database.focusTests.clear();
    await database.settings.clear();
  });
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** "YYYY-MM-DD" that is a real calendar day (rejects 2026-13-45). */
const isDay = (s: unknown): s is string => {
  if (typeof s !== "string" || !DAY_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return dt.getFullYear() === y && dt.getMonth() === m! - 1 && dt.getDate() === d;
};
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isCount = (x: unknown) => x === undefined || (Number.isInteger(x) && (x as number) >= 0);

export interface ImportSummary {
  checkins: number;
  focusTests: number;
  skipped: number;
}

/**
 * Replaces all data with a FocusAI export file, in one transaction.
 * Every row is re-validated; unknown or broken rows are skipped. The current
 * consent stays (the file can't grant consent); only the mode is taken from it.
 * Returns null when the file is not a FocusAI export or there is no consent.
 */
export async function importData(raw: unknown, database: FocusDB = defaultDb): Promise<ImportSummary | null> {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  if (f.format !== EXPORT_FORMAT || f.version !== EXPORT_VERSION) return null;
  const arr = (x: unknown) => (Array.isArray(x) ? x : []);
  let skipped = 0;

  const checkins: CheckIn[] = [];
  for (const r of arr(f.checkins)) {
    try {
      const c = r as CheckIn;
      if (!isDay(c.date) || !isNum(c.createdAt) || !isNum(c.updatedAt)) throw new Error();
      const answered = Array.isArray(c.answered) ? c.answered.filter((k) => SPHERE_KEYS.includes(k)) : undefined;
      checkins.push({
        ...sanitizeCheckIn(c),
        ...(answered ? { answered } : {}),
        date: c.date,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        ...(c.demo === true ? { demo: true as const } : {}),
      });
    } catch {
      skipped++;
    }
  }

  const tests: FocusTestResult[] = [];
  for (const r of arr(f.focusTests)) {
    const t = r as FocusTestResult;
    const ok =
      t && isDay(t.date) && isNum(t.takenAt) && Number.isInteger(t.score) && t.score >= 0 && t.score <= 100 &&
      (t.medianRt === undefined || (isNum(t.medianRt) && t.medianRt > 0)) &&
      isCount(t.lapses) && isCount(t.falseStarts) && isCount(t.trials);
    if (!ok) {
      skipped++;
      continue;
    }
    const { date, takenAt, score, medianRt, lapses, falseStarts, trials } = t;
    tests.push({ date, takenAt, score, medianRt, lapses, falseStarts, trials, ...(t.demo === true ? { demo: true as const } : {}) });
  }

  const sessions: FocusSession[] = [];
  for (const r of arr(f.sessions)) {
    const x = r as FocusSession;
    if (x && isDay(x.date) && isNum(x.startedAt) && Number.isInteger(x.minutes) && x.minutes > 0 && x.minutes <= 180) {
      sessions.push({ date: x.date, startedAt: x.startedAt, minutes: x.minutes, ...(x.demo === true ? { demo: true as const } : {}) });
    } else skipped++;
  }

  const settings = new Map(arr(f.settings).map((s) => [(s as Setting)?.key, (s as Setting)?.value]));
  const mode = (settings.get("profile") as { mode?: unknown } | undefined)?.mode;
  const experiment = settings.get("experiment");
  const history = arr(settings.get("experimentHistory")).filter(isWindow);

  return database.transaction("rw", [database.checkins, database.focusTests, database.settings, database.sessions], async () => {
    const profile = await getProfile(database);
    if (!profile) return null; // no consent → no storage
    await database.checkins.clear();
    await database.focusTests.clear();
    await database.sessions.clear();
    await database.settings.clear();
    await database.settings.put({
      key: "profile",
      value: { mode: mode === "study" || mode === "work" ? mode : profile.mode, consentAt: profile.consentAt },
    });
    if (isExperiment(experiment)) await database.settings.put({ key: "experiment", value: experiment });
    if (history.length) await database.settings.put({ key: "experimentHistory", value: history });
    // Demo label only if the file really holds demo-tagged rows.
    if ([...checkins, ...tests, ...sessions].some((r) => r.demo === true)) await database.settings.put({ key: "demo", value: true });
    await database.checkins.bulkPut(checkins);
    await database.focusTests.bulkAdd(tests);
    await database.sessions.bulkAdd(sessions);
    return { checkins: checkins.length, focusTests: tests.length, skipped };
  });
}
