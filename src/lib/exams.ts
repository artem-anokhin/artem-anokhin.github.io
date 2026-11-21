import { db as defaultDb, dayKey, type DayKey, type FocusDB } from "./db";
import { getProfile } from "./settings";

/**
 * «Экзамены»: a few upcoming exam or deadline dates with a countdown on Today.
 * Stored as one settings row ("exams"); past exams drop off after the day.
 */

export const EXAMS_KEY = "exams";
export const MAX_EXAMS = 6;
export const EXAM_TITLE_MAX = 40;

export interface Exam {
  id: string;
  title: string;
  date: DayKey;
}

/** Real calendar day "YYYY-MM-DD" (rejects rolled-over dates like 2026-02-30). */
const isDay = (v: unknown): v is DayKey => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return dt.getFullYear() === y && dt.getMonth() === m! - 1 && dt.getDate() === d;
};

export function cleanTitle(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = Array.from(v.replace(/\s+/g, " ").trim()).slice(0, EXAM_TITLE_MAX).join("").trim();
  return t || undefined;
}

export function isExam(v: unknown): v is Exam {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return typeof e.id === "string" && e.id.length > 0 && e.id.length <= 40 && cleanTitle(e.title) === e.title && isDay(e.date);
}

/** Valid exams, soonest first, capped at MAX_EXAMS. */
export function sanitizeExams(v: unknown): Exam[] {
  return (Array.isArray(v) ? v.filter(isExam) : []).sort((a, b) => a.date.localeCompare(b.date)).slice(0, MAX_EXAMS);
}

/** Whole calendar days from `today` to the exam (0 = today). */
export function daysUntil(date: DayKey, today: DayKey = dayKey()): number {
  const a = new Date(`${today}T12:00:00`).getTime();
  const b = new Date(`${date}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Exams from today on, soonest first. */
export async function upcomingExams(db: FocusDB = defaultDb, today: DayKey = dayKey()): Promise<Exam[]> {
  return sanitizeExams((await db.settings.get(EXAMS_KEY))?.value).filter((e) => e.date >= today);
}

/** Adds an exam. Returns null without consent, with bad input or when the list is full. */
export async function addExam(title: string, date: DayKey, db: FocusDB = defaultDb, today: DayKey = dayKey()): Promise<Exam | null> {
  const t = cleanTitle(title);
  if (!t || !isDay(date) || date < today) return null;
  return db.transaction("rw", db.settings, async () => {
    if (!(await getProfile(db))) return null;
    const list = (await upcomingExams(db, today));
    if (list.length >= MAX_EXAMS) return null;
    const exam: Exam = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title: t, date };
    await db.settings.put({ key: EXAMS_KEY, value: sanitizeExams([...list, exam]) });
    return exam;
  });
}

export async function removeExam(id: string, db: FocusDB = defaultDb): Promise<void> {
  await db.transaction("rw", db.settings, async () => {
    const list = sanitizeExams((await db.settings.get(EXAMS_KEY))?.value).filter((e) => e.id !== id);
    await db.settings.put({ key: EXAMS_KEY, value: list });
  });
}
