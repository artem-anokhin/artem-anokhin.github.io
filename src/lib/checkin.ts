/**
 * Daily check-in model: 7 spheres (see docs/PRODUCT.md, M1).
 * Pure helpers only — storage lives in db.ts.
 */

export type Scale5 = 1 | 2 | 3 | 4 | 5;
/** Local time of day, "HH:MM" (24 h). */
export type TimeOfDay = string;

export type FoodRegularity = "poor" | "normal" | "varied";
export type ActivityLevel = "minimal" | "medium" | "frequent" | "active";
export type RestType = "physical" | "hobby" | "nervous" | "none";

export interface CheckInData {
  sleep: { bedtime: TimeOfDay; wake: TimeOfDay; quality: Scale5 };
  food: { breakfast: boolean; regularity: FoodRegularity };
  caffeine: { cups: number; lastAt: TimeOfDay | null; water: number };
  mind: { stress: Scale5; mood: Scale5 };
  activity: { level: ActivityLevel; note: string };
  work: { hours: number; difficulty: Scale5 };
  rest: { type: RestType };
  /** Optional free-text note; never leaves the device. */
  note: string;
  /**
   * Spheres the user actually set today. Values carried over from a previous
   * day and left untouched are not listed. Undefined = all answered (first
   * check-in with neutral defaults, or rows saved before M4).
   */
  answered?: SphereKey[];
}

export const SPHERES = [
  { key: "sleep", title: "Сон" },
  { key: "food", title: "Питание" },
  { key: "caffeine", title: "Кофеин и вода" },
  { key: "mind", title: "Психосостояние" },
  { key: "activity", title: "Активность" },
  { key: "work", title: "Учёба / работа" },
  { key: "rest", title: "Отдых" },
] as const;

export type SphereKey = (typeof SPHERES)[number]["key"];
export const SPHERE_KEYS: readonly SphereKey[] = SPHERES.map((s) => s.key);

export const FOOD_OPTIONS: readonly { value: FoodRegularity; label: string }[] = [
  { value: "poor", label: "Скудное" },
  { value: "normal", label: "Нормальное" },
  { value: "varied", label: "Разнообразное" },
];

export const ACTIVITY_OPTIONS: readonly { value: ActivityLevel; label: string }[] = [
  { value: "minimal", label: "Минимальная" },
  { value: "medium", label: "Средняя" },
  { value: "frequent", label: "Частая" },
  { value: "active", label: "Активная" },
];

export const REST_OPTIONS: readonly { value: RestType; label: string }[] = [
  { value: "physical", label: "Физический" },
  { value: "hobby", label: "Хобби" },
  { value: "nervous", label: "Для нервной системы" },
  { value: "none", label: "Не было" },
];

export const NOTE_MAX = 500;
export const ACTIVITY_NOTE_MAX = 80;
export const LIMITS = { cups: 10, water: 15, workHours: 16 } as const;

/** Neutral starting values so a user can just tap «Далее». */
export function emptyCheckIn(): CheckInData {
  return {
    sleep: { bedtime: "23:30", wake: "07:30", quality: 3 },
    food: { breakfast: true, regularity: "normal" },
    caffeine: { cups: 0, lastAt: null, water: 4 },
    mind: { stress: 3, mood: 3 },
    activity: { level: "medium", note: "" },
    work: { hours: 6, difficulty: 3 },
    rest: { type: "none" },
    note: "",
  };
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isTimeOfDay(v: unknown): v is TimeOfDay {
  return typeof v === "string" && TIME_RE.test(v);
}

export function minutes(t: TimeOfDay): number {
  const m = TIME_RE.exec(t);
  if (!m) throw new Error(`Invalid time: ${t}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Hours slept between bedtime and wake time, crossing midnight if needed.
 * Rounded to 0.25 h. Equal times are treated as 0 h.
 */
export function sleepHours(bedtime: TimeOfDay, wake: TimeOfDay): number {
  const diff = (minutes(wake) - minutes(bedtime) + 24 * 60) % (24 * 60);
  return Math.round((diff / 60) * 4) / 4;
}

/** "7.5" → «7,5 ч» (Russian decimal comma). */
export function formatHours(h: number): string {
  return `${String(h).replace(".", ",")} ч`;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const isScale = (n: unknown): n is Scale5 => n === 1 || n === 2 || n === 3 || n === 4 || n === 5;

/** Clamp numbers, trim text and drop invalid values before saving. */
export function sanitizeCheckIn(d: CheckInData): CheckInData {
  const scale = (n: unknown): Scale5 => (isScale(n) ? n : 3);
  const int = (n: unknown, hi: number) => clamp(Math.round(Number(n) || 0), 0, hi);
  const pick = <T extends string>(v: T, opts: readonly { value: T }[], fallback: T): T =>
    opts.some((o) => o.value === v) ? v : fallback;
  const cups = int(d.caffeine.cups, LIMITS.cups);
  return {
    sleep: {
      bedtime: isTimeOfDay(d.sleep.bedtime) ? d.sleep.bedtime : "23:30",
      wake: isTimeOfDay(d.sleep.wake) ? d.sleep.wake : "07:30",
      quality: scale(d.sleep.quality),
    },
    food: { breakfast: Boolean(d.food.breakfast), regularity: pick(d.food.regularity, FOOD_OPTIONS, "normal") },
    caffeine: {
      cups,
      lastAt: cups > 0 && isTimeOfDay(d.caffeine.lastAt) ? d.caffeine.lastAt : null,
      water: int(d.caffeine.water, LIMITS.water),
    },
    mind: { stress: scale(d.mind.stress), mood: scale(d.mind.mood) },
    activity: {
      level: pick(d.activity.level, ACTIVITY_OPTIONS, "medium"),
      note: d.activity.note.trim().slice(0, ACTIVITY_NOTE_MAX),
    },
    work: {
      hours: clamp(Math.round((Number(d.work.hours) || 0) * 2) / 2, 0, LIMITS.workHours),
      difficulty: scale(d.work.difficulty),
    },
    rest: { type: pick(d.rest.type, REST_OPTIONS, "none") },
    note: d.note.trim().slice(0, NOTE_MAX),
    ...(d.answered === undefined ? {} : { answered: SPHERE_KEYS.filter((k) => d.answered!.includes(k)) }),
  };
}

/** True when the user set this sphere on that day (see CheckInData.answered). */
export function isAnswered(d: Pick<CheckInData, "answered">, key: SphereKey): boolean {
  return d.answered === undefined || d.answered.includes(key);
}
