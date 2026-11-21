import { db as defaultDb, dayKey, type DayKey, type FocusDB, type Goal } from "./db";
import { getProfile } from "./settings";

/** «Цели»: a few personal goals with small steps. Local only, consent-gated. */

export const MAX_GOALS = 8;
export const MAX_STEPS = 8;
export const GOAL_TITLE_MAX = 60;
export const GOAL_WHY_MAX = 140;
export const STEP_MAX = 60;
export const WOOP_MAX = 140;
/** The stored plan is «Если <obstacle>, то <plan>» — room for both parts. */
export const PLAN_MAX = 300;

const clip = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = Array.from(v.replace(/\s+/g, " ").trim()).slice(0, max).join("").trim();
  return t || undefined;
};

const isDay = (v: unknown): v is DayKey => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return dt.getFullYear() === y && dt.getMonth() === m! - 1 && dt.getDate() === d;
};

/** Cleans a goal from user input or an import file; null when unusable. */
export function sanitizeGoal(v: unknown): Omit<Goal, "id"> | null {
  if (!v || typeof v !== "object") return null;
  const g = v as Record<string, unknown>;
  const title = clip(g.title, GOAL_TITLE_MAX);
  if (!title) return null;
  const why = clip(g.why, GOAL_WHY_MAX);
  const obstacle = clip(g.obstacle, WOOP_MAX);
  const plan = clip(g.plan, PLAN_MAX);
  const steps = (Array.isArray(g.steps) ? g.steps : [])
    .map((s) => {
      const text = clip((s as { text?: unknown })?.text, STEP_MAX);
      return text ? { text, done: (s as { done?: unknown }).done === true } : null;
    })
    .filter((s): s is { text: string; done: boolean } => s !== null)
    .slice(0, MAX_STEPS);
  const done = g.done === 1 ? 1 : 0;
  const createdAt = typeof g.createdAt === "number" && Number.isFinite(g.createdAt) && g.createdAt > 0 ? g.createdAt : Date.now();
  return {
    title,
    ...(why ? { why } : {}),
    ...(obstacle ? { obstacle } : {}),
    ...(plan ? { plan } : {}),
    ...(isDay(g.due) ? { due: g.due } : {}),
    steps,
    done,
    ...(done && typeof g.doneAt === "number" && Number.isFinite(g.doneAt) ? { doneAt: g.doneAt } : {}),
    createdAt,
  };
}

export async function listGoals(db: FocusDB = defaultDb): Promise<Goal[]> {
  const all = await db.goals.toArray();
  // Active first (soonest due first), then reached (newest first).
  return all.sort((a, b) => a.done - b.done || (a.done ? (b.doneAt ?? 0) - (a.doneAt ?? 0) : (a.due ?? "9999").localeCompare(b.due ?? "9999")));
}

export async function countGoalsDone(db: FocusDB = defaultDb): Promise<number> {
  return db.goals.where("done").equals(1).count();
}

export type AddGoalResult = { ok: true; goal: Goal } | { ok: false; reason: "consent" | "invalid" | "full" };

export async function addGoal(input: { title: string; why?: string; due?: string; steps?: string[]; obstacle?: string; plan?: string }, db: FocusDB = defaultDb, now = Date.now()): Promise<AddGoalResult> {
  const clean = sanitizeGoal({ ...input, steps: (input.steps ?? []).map((text) => ({ text, done: false })), done: 0, createdAt: now });
  if (!clean || (clean.due && clean.due < dayKey(new Date(now)))) return { ok: false, reason: "invalid" };
  return db.transaction("rw", db.goals, db.settings, async () => {
    if (!(await getProfile(db))) return { ok: false as const, reason: "consent" as const };
    if ((await db.goals.where("done").equals(0).count()) >= MAX_GOALS) return { ok: false as const, reason: "full" as const };
    const goal: Goal = { ...clean };
    goal.id = await db.goals.add(goal);
    return { ok: true as const, goal };
  });
}

export async function toggleStep(id: number, index: number, db: FocusDB = defaultDb): Promise<Goal | null> {
  return db.transaction("rw", db.goals, db.settings, async () => {
    if (!(await getProfile(db))) return null;
    const g = await db.goals.get(id);
    if (!g || !g.steps[index]) return null;
    const steps = g.steps.map((s, i) => (i === index ? { ...s, done: !s.done } : s));
    await db.goals.update(id, { steps });
    return { ...g, steps };
  });
}

export async function addStep(id: number, text: string, db: FocusDB = defaultDb): Promise<Goal | null> {
  const t = clip(text, STEP_MAX);
  if (!t) return null;
  return db.transaction("rw", db.goals, db.settings, async () => {
    if (!(await getProfile(db))) return null;
    const g = await db.goals.get(id);
    if (!g || g.steps.length >= MAX_STEPS) return null;
    const steps = [...g.steps, { text: t, done: false }];
    await db.goals.update(id, { steps });
    return { ...g, steps };
  });
}

/** Marks a goal reached (or back to active). */
export async function setGoalDone(id: number, done: boolean, db: FocusDB = defaultDb, now = Date.now()): Promise<boolean> {
  return db.transaction("rw", db.goals, db.settings, async () => {
    if (!(await getProfile(db))) return false;
    return (await db.goals.update(id, done ? { done: 1, doneAt: now } : { done: 0, doneAt: undefined })) === 1;
  });
}

export async function deleteGoal(id: number, db: FocusDB = defaultDb): Promise<void> {
  await db.goals.delete(id);
}

/** Share of finished steps, 0–1 (reached goals count as 1). */
export function goalProgress(g: Pick<Goal, "steps" | "done">): number {
  if (g.done) return 1;
  if (g.steps.length === 0) return 0;
  return g.steps.filter((s) => s.done).length / g.steps.length;
}

/** The next undone step of each active goal, offered as a focus-session task. */
export interface GoalStep {
  goalId: number;
  index: number;
  text: string;
  goal: string;
}

export function openSteps(goals: Goal[], max = 4): GoalStep[] {
  const out: GoalStep[] = [];
  for (const g of goals) {
    if (g.done || g.id === undefined) continue;
    const index = g.steps.findIndex((s) => !s.done);
    if (index >= 0) out.push({ goalId: g.id, index, text: g.steps[index]!.text, goal: g.title });
    if (out.length >= max) break;
  }
  return out;
}
