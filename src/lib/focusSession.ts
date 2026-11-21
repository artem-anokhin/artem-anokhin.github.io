import { db as defaultDb, dayKey, type FocusDB, type FocusSession } from "./db";
import { getProfile } from "./settings";

/**
 * «Фокус-сессия»: a study timer. The running session lives in settings
 * ("activeSession") so closing the tab doesn't lose it; finished sessions go to
 * the `sessions` table and water the tree (one drop per day with a session).
 */

export const SESSION_LENGTHS = [15, 25, 50] as const;
export type SessionLength = (typeof SESSION_LENGTHS)[number];
const ACTIVE_KEY = "activeSession";

export interface ActiveSession {
  startedAt: number;
  minutes: SessionLength;
  /** Optional «Над чем работаете?» label. */
  task?: string;
  /** Times the user left the app while it ran (page hidden). */
  away?: number;
}

/** Longest task label we keep. */
export const TASK_MAX = 40;

/** Trims, collapses spaces and caps a task label; empty → undefined. */
export function cleanTask(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.replace(/\s+/g, " ").trim().slice(0, TASK_MAX);
  return t || undefined;
}

function isActive(v: unknown): v is ActiveSession {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.startedAt === "number" &&
    Number.isFinite(a.startedAt) &&
    SESSION_LENGTHS.includes(a.minutes as SessionLength) &&
    (a.away === undefined || (typeof a.away === "number" && a.away >= 0))
  );
}

/** Milliseconds left (0 when done). */
export function remainingMs(a: ActiveSession, now: number): number {
  return Math.max(0, a.startedAt + a.minutes * 60_000 - now);
}

export async function getActiveSession(db: FocusDB = defaultDb): Promise<ActiveSession | null> {
  const v = (await db.settings.get(ACTIVE_KEY))?.value;
  return isActive(v) ? v : null;
}

export async function startSession(
  minutes: SessionLength,
  db: FocusDB = defaultDb,
  now = Date.now(),
  task?: string,
): Promise<ActiveSession | null> {
  if (!SESSION_LENGTHS.includes(minutes)) return null;
  // Consent check and write in one transaction, so «Удалить все данные» can't race in.
  return db.transaction("rw", db.settings, async () => {
    if (!(await getProfile(db))) return null; // no consent → no storage
    // A session already running (e.g. started in another tab) keeps its timer.
    const running = await getActiveSession(db);
    if (running) return running;
    const label = cleanTask(task);
    const a: ActiveSession = { startedAt: now, minutes, away: 0, ...(label ? { task: label } : {}) };
    await db.settings.put({ key: ACTIVE_KEY, value: a });
    return a;
  });
}

/** Counts one «left the app» moment for the running session (no-op when none or time is up). */
export async function markAway(db: FocusDB = defaultDb, now = Date.now()): Promise<ActiveSession | null> {
  return db.transaction("rw", db.settings, async () => {
    const a = await getActiveSession(db);
    if (!a || remainingMs(a, now) <= 0) return a;
    const next = { ...a, away: (a.away ?? 0) + 1 };
    await db.settings.put({ key: ACTIVE_KEY, value: next });
    return next;
  });
}

/** Stops the running session without saving it (gave up early). */
export async function cancelSession(db: FocusDB = defaultDb): Promise<void> {
  await db.settings.delete(ACTIVE_KEY);
}

/** Saves the running session if its time is up. Returns the saved row or null. */
export async function finishSession(db: FocusDB = defaultDb, now = Date.now()): Promise<FocusSession | null> {
  return db.transaction("rw", db.settings, db.sessions, async () => {
    const a = await getActiveSession(db);
    if (!a || remainingMs(a, now) > 0) return null;
    await db.settings.delete(ACTIVE_KEY);
    if (!(await getProfile(db))) return null;
    const task = cleanTask(a.task);
    const row: FocusSession = {
      date: dayKey(new Date(a.startedAt)),
      startedAt: a.startedAt,
      minutes: a.minutes,
      away: a.away ?? 0,
      ...(task ? { task } : {}),
    };
    row.id = await db.sessions.add(row);
    return row;
  });
}

/** Minutes of finished sessions per day. */
export function minutesByDay(sessions: FocusSession[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sessions) m.set(s.date, (m.get(s.date) ?? 0) + s.minutes);
  return m;
}

/** Recent distinct task labels, newest first. */
export function recentTasks(sessions: FocusSession[], limit = 4): string[] {
  const out: string[] = [];
  for (const s of [...sessions].sort((a, b) => b.startedAt - a.startedAt)) {
    const t = cleanTask(s.task);
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

/** Minutes per task label over the given sessions, largest first (unlabelled → «Без названия»). */
export function minutesByTask(sessions: FocusSession[]): { task: string; minutes: number; count: number }[] {
  const m = new Map<string, { task: string; minutes: number; count: number }>();
  for (const s of sessions) {
    const task = cleanTask(s.task) ?? "Без названия";
    const k = task.toLowerCase();
    const e = m.get(k) ?? { task, minutes: 0, count: 0 };
    e.minutes += s.minutes;
    e.count += 1;
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.minutes - a.minutes);
}
