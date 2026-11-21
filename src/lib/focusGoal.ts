import { db as defaultDb, type FocusDB } from "./db";
import { getProfile } from "./settings";

/** Daily focus-minutes goal for the Today ring. */
export const GOAL_KEY = "focusGoal";
export const GOALS = [25, 50, 100, 150] as const;
export type Goal = (typeof GOALS)[number];
export const DEFAULT_GOAL: Goal = 25;

export const isGoal = (v: unknown): v is Goal => GOALS.includes(v as Goal);

export async function getFocusGoal(db: FocusDB = defaultDb): Promise<Goal> {
  const v = (await db.settings.get(GOAL_KEY))?.value;
  return isGoal(v) ? v : DEFAULT_GOAL;
}

/** Saves the goal; null without consent or with a bad value. */
export async function setFocusGoal(goal: number, db: FocusDB = defaultDb): Promise<Goal | null> {
  if (!isGoal(goal)) return null;
  return db.transaction("rw", db.settings, async () => {
    if (!(await getProfile(db))) return null;
    await db.settings.put({ key: GOAL_KEY, value: goal });
    return goal;
  });
}
