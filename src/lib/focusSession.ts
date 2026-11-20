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
}

function isActive(v: unknown): v is ActiveSession {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  return typeof a.startedAt === "number" && Number.isFinite(a.startedAt) && SESSION_LENGTHS.includes(a.minutes as SessionLength);
}

/** Milliseconds left (0 when done). */
export function remainingMs(a: ActiveSession, now: number): number {
  return Math.max(0, a.startedAt + a.minutes * 60_000 - now);
}

export async function getActiveSession(db: FocusDB = defaultDb): Promise<ActiveSession | null> {
  const v = (await db.settings.get(ACTIVE_KEY))?.value;
  return isActive(v) ? v : null;
}

export async function startSession(minutes: SessionLength, db: FocusDB = defaultDb, now = Date.now()): Promise<ActiveSession | null> {
  if (!SESSION_LENGTHS.includes(minutes)) return null;
  // Consent check and write in one transaction, so «Удалить все данные» can't race in.
  return db.transaction("rw", db.settings, async () => {
    if (!(await getProfile(db))) return null; // no consent → no storage
    const a: ActiveSession = { startedAt: now, minutes };
    await db.settings.put({ key: ACTIVE_KEY, value: a });
    return a;
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
    const row: FocusSession = { date: dayKey(new Date(a.startedAt)), startedAt: a.startedAt, minutes: a.minutes };
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
