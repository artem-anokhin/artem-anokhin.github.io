import { db as defaultDb, dayKey, type FocusDB } from "./db";
import type { CardId } from "./library";
import { getProfile, saveProfile, type Mode, type Profile } from "./settings";

/** First-run answers: what matters now and what gets in the way. Stored only after consent. */
export type StartGoal = "exams" | "thesis" | "daily" | "work";
export type Blocker = "phone" | "tired" | "stress" | "start";

export interface StartInfo {
  goal: StartGoal;
  blocker: Blocker;
  /** Warm-up «Цвет и слово» score (our scale), null when skipped. */
  score: number | null;
  treeName?: string;
}

export const START_KEY = "start";
export const TREE_NAME_MAX = 24;
export const START_DAYS = 7;

export const GOALS: { value: StartGoal; label: string; sub: string }[] = [
  { value: "exams", label: "Сессия и экзамены", sub: "Подготовиться вовремя" },
  { value: "thesis", label: "Курсовая или диплом", sub: "Большая работа по шагам" },
  { value: "daily", label: "Учёба каждый день", sub: "Ровный ритм без завалов" },
  { value: "work", label: "Работа", sub: "Глубокая работа без отвлечений" },
];

export const BLOCKERS: { value: Blocker; label: string; sub: string }[] = [
  { value: "phone", label: "Телефон", sub: "Рука сама тянется" },
  { value: "tired", label: "Усталость и сон", sub: "Нет сил сосредоточиться" },
  { value: "stress", label: "Стресс", sub: "Тревожно, мысли скачут" },
  { value: "start", label: "Трудно начать", sub: "Откладываю до последнего" },
];

const GOAL_SET = new Set(GOALS.map((g) => g.value));
const BLOCKER_SET = new Set(BLOCKERS.map((b) => b.value));

export const modeFor = (goal: StartGoal): Mode => (goal === "work" ? "work" : "study");

/** Suggested focus-session length: short when starting is the hard part. */
export const sessionFor = (s: Pick<StartInfo, "goal" | "blocker">): 15 | 25 | 50 => (s.blocker === "start" ? 15 : s.goal === "work" ? 50 : 25);

export interface PlanPoint {
  title: string;
  text: string;
  href: string;
  /** Library card id (advice is sourced via the card, docs/sources.md). */
  card?: CardId;
  sphere: "mind" | "sleep" | "activity" | "rest" | "caffeine";
}

/** Rule-based (not AI) «неделя старта»: one point from the goal, one from the blocker, one common. */
export function startPlan(s: Pick<StartInfo, "goal" | "blocker">): PlanPoint[] {
  const byGoal: Record<StartGoal, PlanPoint> = {
    exams: { title: "Добавьте дату экзамена", text: "На главной появится обратный отсчёт и минуты подготовки к нему.", href: "/", sphere: "rest" },
    thesis: { title: "Разбейте работу на шаги", text: "Цель с шагами и планом «если — то» по методу WOOP.", href: "/goals/", card: "woop", sphere: "rest" },
    daily: { title: "Выберите 1–2 маленькие привычки", text: "Привычка складывается за недели, пропуск одного дня её не ломает.", href: "/habits/", card: "habits", sphere: "activity" },
    work: { title: "Сессии по 50 минут с перерывом", text: "Перерывы до 10 минут связаны с бодростью и меньшей усталостью.", href: "/focus/", card: "micro-breaks", sphere: "sleep" },
  };
  const byBlocker: Record<Blocker, PlanPoint> = {
    phone: { title: "Телефон — вне поля зрения", text: "Попробуйте на время сессии убрать его в сумку или другую комнату.", href: "/focus/", card: "phone", sphere: "caffeine" },
    tired: { title: "Отмечайте сон в чек-ине", text: "Через 7 дней покажем, как сон связан с вашим фокусом.", href: "/checkin/", card: "sleep-hours", sphere: "sleep" },
    stress: { title: "Минута дыхания перед учёбой", text: "Медленное дыхание связано с более спокойным состоянием. Исследования небольшие.", href: "/breathe/", card: "breathing", sphere: "mind" },
    start: { title: "Начинайте с 15 минут", text: "И план «если — то»: «Если 18:00, то открываю конспект».", href: "/focus/", card: "if-then", sphere: "mind" },
  };
  return [
    byBlocker[s.blocker],
    byGoal[s.goal],
    { title: "Чек-ин 30 секунд в день", text: "Через 7 дней увидите, что связано с вашей концентрацией.", href: "/checkin/", card: "correlations", sphere: "activity" },
  ];
}

export function cleanTreeName(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  // Drop control and invisible format chars (bidi, zero-width); count by code points, not UTF-16 units.
  const t = Array.from(v.replace(/[\p{Cc}\p{Cf}]/gu, "").trim()).slice(0, TREE_NAME_MAX).join("").trim();
  return t || undefined;
}

export function isStart(v: unknown): v is StartInfo {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  const scoreOk = s.score === null || (typeof s.score === "number" && Number.isFinite(s.score) && s.score >= 0 && s.score <= 100);
  return GOAL_SET.has(s.goal as StartGoal) && BLOCKER_SET.has(s.blocker as Blocker) && scoreOk && (s.treeName === undefined || typeof s.treeName === "string");
}

/** Import/storage sanitiser. */
export function sanitizeStart(v: unknown): StartInfo | null {
  if (!isStart(v)) return null;
  const treeName = cleanTreeName(v.treeName);
  return { goal: v.goal, blocker: v.blocker, score: v.score === null ? null : Math.round(v.score), ...(treeName ? { treeName } : {}) };
}

/** Consent-gated write. */
export async function saveStart(info: StartInfo, db: FocusDB = defaultDb): Promise<StartInfo | null> {
  const clean = sanitizeStart(info);
  if (!clean) return null;
  return db.transaction("rw", db.settings, async () => {
    if (!(await getProfile(db))) return null;
    await db.settings.put({ key: START_KEY, value: clean });
    return clean;
  });
}

/** Consent + answers in one transaction: never a profile without its start answers. */
export async function completeOnboarding(info: StartInfo, consent: true, db: FocusDB = defaultDb, now = Date.now()): Promise<Profile> {
  if (consent !== true) throw new Error("Consent is required");
  const clean = sanitizeStart(info);
  if (!clean) throw new Error("Invalid start answers");
  return db.transaction("rw", db.settings, async () => {
    const profile = await saveProfile(modeFor(clean.goal), consent, db, now);
    await db.settings.put({ key: START_KEY, value: clean });
    return profile;
  });
}

export async function getStart(db: FocusDB = defaultDb): Promise<StartInfo | null> {
  return sanitizeStart((await db.settings.get(START_KEY))?.value);
}

/** Day 1..7 of the start week, counted in calendar days from consent; null afterwards. */
export function startDay(consentAt: number, today: string = dayKey()): number | null {
  const a = new Date(`${dayKey(new Date(consentAt))}T12:00:00`).getTime();
  const b = new Date(`${today}T12:00:00`).getTime();
  const d = Math.round((b - a) / 86_400_000) + 1;
  return d >= 1 && d <= START_DAYS ? d : null;
}
