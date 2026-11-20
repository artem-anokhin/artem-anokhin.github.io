import { SPHERE_KEYS, type SphereKey } from "./checkin";
import { db as defaultDb, dayKey, type FocusDB, type Habit, type HabitLog } from "./db";
import { getProfile } from "./settings";

/**
 * «Привычки»: up to 5 small daily habits. Gentle by design — no streak resets,
 * a missed day is just a missed day. Any day with ≥1 habit done waters the tree.
 */

export const MAX_HABITS = 5;
export const HABIT_TITLE_MAX = 40;

export async function activeHabits(db: FocusDB = defaultDb): Promise<Habit[]> {
  return (await db.habits.where("archived").equals(0).toArray()).sort((a, b) => a.createdAt - b.createdAt);
}

export type AddResult = { ok: true; habit: Habit } | { ok: false; reason: "consent" | "limit" | "empty" | "duplicate" };

export async function addHabit(
  title: string,
  sphere: SphereKey,
  ideaId?: string,
  db: FocusDB = defaultDb,
  now = Date.now(),
): Promise<AddResult> {
  const clean = title.replace(/\s+/g, " ").trim().slice(0, HABIT_TITLE_MAX);
  if (!clean) return { ok: false, reason: "empty" };
  const s: SphereKey = SPHERE_KEYS.includes(sphere) ? sphere : "work";
  return db.transaction("rw", db.habits, db.settings, async () => {
    if (!(await getProfile(db))) return { ok: false as const, reason: "consent" as const };
    const active = await activeHabits(db);
    if (active.length >= MAX_HABITS) return { ok: false as const, reason: "limit" as const };
    if (active.some((h) => h.title.toLowerCase() === clean.toLowerCase())) return { ok: false as const, reason: "duplicate" as const };
    const habit: Habit = { title: clean, sphere: s, createdAt: now, archived: 0, ...(ideaId ? { ideaId } : {}) };
    habit.id = await db.habits.add(habit);
    return { ok: true as const, habit };
  });
}

/** Removes a habit from the active list; its past marks stay (they already watered the tree). */
export async function archiveHabit(id: number, db: FocusDB = defaultDb): Promise<void> {
  await db.habits.update(id, { archived: 1 });
}

/** Marks or unmarks a habit for a day. Returns the new state (true = done), null without consent. */
export async function toggleHabit(habitId: number, date: string = dayKey(), db: FocusDB = defaultDb, now = Date.now()): Promise<boolean | null> {
  return db.transaction("rw", db.habitLogs, db.habits, db.settings, async () => {
    if (!(await getProfile(db))) return null;
    const habit = await db.habits.get(habitId);
    if (!habit || habit.archived) return null;
    const existing = await db.habitLogs.get([habitId, date]);
    if (existing) {
      await db.habitLogs.delete([habitId, date]);
      return false;
    }
    await db.habitLogs.put({ habitId, date, doneAt: now });
    return true;
  });
}

/** Days (YYYY-MM-DD) with at least one habit done. */
export function habitDays(logs: HabitLog[]): string[] {
  return [...new Set(logs.map((l) => l.date))];
}

/** How many of the last `n` days (incl. today) each habit was done — for the gentle «5 из 7» label. */
export function doneInLastDays(logs: HabitLog[], habitId: number, today: string, n = 7): number {
  const [y, m, d] = today.split("-").map(Number);
  const from = dayKey(new Date(y!, m! - 1, d! - (n - 1)));
  return logs.filter((l) => l.habitId === habitId && l.date >= from && l.date <= today).length;
}
