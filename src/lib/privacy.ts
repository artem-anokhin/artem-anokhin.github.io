import { SPHERE_KEYS, sanitizeCheckIn } from "./checkin";
import { SESSION_LENGTHS, cleanTask, isFeel, type SessionLength } from "./focusSession";
import { HABIT_TITLE_MAX, MAX_HABITS } from "./habits";
import { PROFILE_KEY, db as defaultDb, dayKey, type CheckIn, type FocusDB, type FocusSession, type Habit, type HabitLog, type FocusTestResult, type Setting } from "./db";
import { getProfile, isExperiment, isWindow } from "./settings";
import { EXAMS_KEY, sanitizeExams } from "./exams";
import { MAX_GOALS, sanitizeGoal } from "./goals";
import { MAX_NOTES, sanitizeNote } from "./notes";
import { GOAL_KEY, isGoal } from "./focusGoal";

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
  /** Finished focus sessions (optional on import). */
  sessions?: unknown[];
  /** Habits and their daily marks (optional on import). */
  habits?: unknown[];
  habitLogs?: unknown[];
  /** Goals and notes (optional on import, added in v4). */
  goals?: unknown[];
  notes?: unknown[];
}

/** Snapshot of every table, read in one transaction so it is consistent. */
export async function exportData(database: FocusDB = defaultDb, now = new Date()): Promise<ExportFile> {
  return database.transaction("r", [database.checkins, database.focusTests, database.settings, database.sessions, database.habits, database.habitLogs, database.goals, database.notes], async () => ({
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    checkins: await database.checkins.toArray(),
    focusTests: await database.focusTests.toArray(),
    settings: await database.settings.toArray(),
    sessions: await database.sessions.toArray(),
    habits: await database.habits.toArray(),
    habitLogs: await database.habitLogs.toArray(),
    goals: await database.goals.toArray(),
    notes: await database.notes.toArray(),
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
  await database.transaction("rw", [database.checkins, database.focusTests, database.settings, database.sessions, database.habits, database.habitLogs, database.goals, database.notes], async () => {
    await database.sessions.clear();
    await database.habits.clear();
    await database.habitLogs.clear();
    await database.goals.clear();
    await database.notes.clear();
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
    const sameDay = x && isNum(x.startedAt) && x.startedAt > 0 && x.startedAt < 8.64e15 && dayKey(new Date(x.startedAt)) === x.date;
    if (x && isDay(x.date) && sameDay && SESSION_LENGTHS.includes(x.minutes as SessionLength)) {
      const task = cleanTask(x.task);
      const away = isNum(x.away) && x.away >= 0 && x.away < 1000 ? Math.round(x.away) : undefined;
      sessions.push({
        date: x.date,
        startedAt: x.startedAt,
        minutes: x.minutes,
        ...(task ? { task } : {}),
        ...(away !== undefined ? { away } : {}),
        ...(isFeel(x.feel) ? { feel: x.feel } : {}),
        ...(x.together === true ? { together: true as const } : {}),
        ...(x.demo === true ? { demo: true as const } : {}),
      });
    } else skipped++;
  }

  const habits: Habit[] = [];
  const idMap = new Map<number, true>();
  for (const r of arr(f.habits)) {
    const h = r as Habit;
    const title = typeof h?.title === "string" ? h.title.replace(/\s+/g, " ").trim().slice(0, HABIT_TITLE_MAX) : "";
    if (h && Number.isInteger(h.id) && (h.id as number) > 0 && title && SPHERE_KEYS.includes(h.sphere) && isNum(h.createdAt) && !idMap.has(h.id!)) {
      idMap.set(h.id!, true);
      habits.push({
        id: h.id,
        title,
        sphere: h.sphere,
        createdAt: h.createdAt,
        archived: h.archived === 1 ? 1 : 0,
        ...(typeof h.ideaId === "string" && /^[a-z0-9-]{1,40}$/.test(h.ideaId) ? { ideaId: h.ideaId } : {}),
        ...(h.demo === true ? { demo: true as const } : {}),
      });
    } else skipped++;
  }
  // Never more than MAX_HABITS active after import.
  habits.filter((h) => h.archived === 0).slice(MAX_HABITS).forEach((h) => (h.archived = 1));
  const habitLogs: HabitLog[] = [];
  for (const r of arr(f.habitLogs)) {
    const l = r as HabitLog;
    if (l && idMap.has(l.habitId) && isDay(l.date) && isNum(l.doneAt)) {
      habitLogs.push({ habitId: l.habitId, date: l.date, doneAt: l.doneAt, ...(l.demo === true ? { demo: true as const } : {}) });
    } else skipped++;
  }

  const allGoals = arr(f.goals).map(sanitizeGoal).filter((g): g is NonNullable<typeof g> => g !== null);
  // Same limit as in the app: at most MAX_GOALS active, plus up to 100 reached.
  const goals = [...allGoals.filter((g) => g.done === 0).slice(0, MAX_GOALS), ...allGoals.filter((g) => g.done === 1).slice(0, 100)];
  const notes = arr(f.notes).map(sanitizeNote).filter((n): n is NonNullable<typeof n> => n !== null).slice(0, MAX_NOTES);
  skipped += arr(f.goals).length - goals.length + arr(f.notes).length - Math.min(notes.length, arr(f.notes).length);

  const settings = new Map(arr(f.settings).map((s) => [(s as Setting)?.key, (s as Setting)?.value]));
  const mode = (settings.get(PROFILE_KEY) as { mode?: unknown } | undefined)?.mode;
  const experiment = settings.get("experiment");
  const history = arr(settings.get("experimentHistory")).filter(isWindow);

  return database.transaction("rw", [database.checkins, database.focusTests, database.settings, database.sessions, database.habits, database.habitLogs, database.goals, database.notes], async () => {
    const profile = await getProfile(database);
    if (!profile) return null; // no consent → no storage
    await database.checkins.clear();
    await database.focusTests.clear();
    await database.sessions.clear();
    await database.habits.clear();
    await database.habitLogs.clear();
    await database.goals.clear();
    await database.notes.clear();
    await database.settings.clear();
    await database.settings.put({
      key: PROFILE_KEY,
      value: { mode: mode === "study" || mode === "work" ? mode : profile.mode, consentAt: profile.consentAt },
    });
    if (isExperiment(experiment)) await database.settings.put({ key: "experiment", value: experiment });
    if (history.length) await database.settings.put({ key: "experimentHistory", value: history });
    const goal = settings.get(GOAL_KEY);
    if (isGoal(goal)) await database.settings.put({ key: GOAL_KEY, value: goal });
    const exams = sanitizeExams(settings.get(EXAMS_KEY));
    if (exams.length) await database.settings.put({ key: EXAMS_KEY, value: exams });
    // Demo label only if the file really holds demo-tagged rows.
    if ([...checkins, ...tests, ...sessions, ...habits].some((r) => r.demo === true)) await database.settings.put({ key: "demo", value: true });
    await database.checkins.bulkPut(checkins);
    await database.focusTests.bulkAdd(tests);
    await database.sessions.bulkAdd(sessions);
    await database.habits.bulkAdd(habits);
    await database.habitLogs.bulkPut(habitLogs);
    await database.goals.bulkAdd(goals);
    await database.notes.bulkAdd(notes);
    return { checkins: checkins.length, focusTests: tests.length, skipped };
  });
}
