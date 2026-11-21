import type { CheckIn, Note } from "./db";
import { TAG_SPHERES, tagCounts } from "./tags";

/** Calendar days between two "YYYY-MM-DD" keys (b − a), DST-safe. */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000);
}

/** Days since the last activity before today; null when there is none or it was recent (<3 days). */
export function awayDays(activityDates: string[], today: string): number | null {
  const past = activityDates.filter((d) => d < today).sort();
  const last = past.at(-1);
  if (!last || activityDates.includes(today)) return null;
  const gap = daysBetween(last, today);
  return gap >= 3 ? gap : null;
}

/** Top tags of the last 7 days across all spheres: «🏊 Плавание ×3». */
export function weekTags(checkins: Pick<CheckIn, "date" | "mind" | "activity" | "work" | "rest" | "sleep" | "food" | "caffeine" | "note">[], today: string, top = 3) {
  const rows = checkins.filter((c) => {
    const d = daysBetween(c.date, today);
    return d >= 0 && d < 7;
  });
  return TAG_SPHERES.flatMap((s) => tagCounts(rows as CheckIn[], s))
    .sort((a, b) => b.count - a.count)
    .slice(0, top);
}

/** «Неделю / месяц / год назад вы записали»: a note or check-in note from exactly 7, 30 or 365 days ago. */
export function memory(notes: Pick<Note, "text" | "createdAt">[], checkins: Pick<CheckIn, "date" | "note">[], today: string, dayKeyOf: (t: number) => string) {
  for (const [ago, label] of [
    [365, "Год назад"],
    [30, "Месяц назад"],
    [7, "Неделю назад"],
  ] as const) {
    const n = notes.find((x) => daysBetween(dayKeyOf(x.createdAt), today) === ago && x.text.trim());
    if (n) return { label, text: n.text.trim() };
    const c = checkins.find((x) => daysBetween(x.date, today) === ago && x.note?.trim());
    if (c) return { label, text: c.note.trim() };
  }
  return null;
}
