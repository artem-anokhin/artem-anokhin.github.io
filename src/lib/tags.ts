import type { CheckInData, RestType } from "./checkin";

/**
 * Check-in tags: «что было сегодня» chips (Daylio / How We Feel pattern).
 * Built-in tags have stable ids; the user can add own short tags («своё»).
 */
export type TagSphere = "mind" | "activity" | "work" | "rest";

export interface Tag {
  id: string;
  label: string;
  emoji: string;
  /** Rest tags: which rest type they imply (auto-fills «Какой это был отдых»). */
  rest?: Exclude<RestType, "none">;
  /** Work tags: shown only for this mode. */
  mode?: "study" | "work";
}

export const TAGS: Record<TagSphere, readonly Tag[]> = {
  mind: [
    { id: "joy", label: "Радость", emoji: "😊" },
    { id: "calm", label: "Спокойствие", emoji: "😌" },
    { id: "inspired", label: "Вдохновение", emoji: "✨" },
    { id: "confident", label: "Уверенность", emoji: "💪" },
    { id: "grateful", label: "Благодарность", emoji: "🙏" },
    { id: "interest", label: "Интерес", emoji: "🧐" },
    { id: "tired", label: "Усталость", emoji: "🥱" },
    { id: "anxious", label: "Тревога", emoji: "😟" },
    { id: "irritated", label: "Раздражение", emoji: "😤" },
    { id: "sad", label: "Грусть", emoji: "😔" },
    { id: "bored", label: "Скука", emoji: "😐" },
    { id: "lonely", label: "Одиноко", emoji: "🫥" },
  ],
  activity: [
    { id: "walk", label: "Прогулка", emoji: "🚶" },
    { id: "run", label: "Бег", emoji: "🏃" },
    { id: "gym", label: "Зал", emoji: "🏋️" },
    { id: "swim", label: "Плавание", emoji: "🏊" },
    { id: "bike", label: "Велосипед", emoji: "🚴" },
    { id: "football", label: "Футбол", emoji: "⚽" },
    { id: "ballgames", label: "Волейбол, баскетбол", emoji: "🏐" },
    { id: "tennis", label: "Теннис", emoji: "🎾" },
    { id: "yoga", label: "Йога, растяжка", emoji: "🧘" },
    { id: "dance", label: "Танцы", emoji: "💃" },
    { id: "fight", label: "Единоборства", emoji: "🥋" },
    { id: "winter", label: "Лыжи, коньки", emoji: "⛸️" },
    { id: "petwalk", label: "Прогулка с питомцем", emoji: "🐕" },
    { id: "home", label: "Домашние дела", emoji: "🧹" },
    { id: "pe", label: "Физра", emoji: "🤸" },
  ],
  work: [
    { id: "lectures", label: "Лекции", emoji: "🎓", mode: "study" },
    { id: "seminars", label: "Семинары", emoji: "💬", mode: "study" },
    { id: "labs", label: "Лабы", emoji: "🧪", mode: "study" },
    { id: "selfstudy", label: "Самостоятельно", emoji: "📚", mode: "study" },
    { id: "homework", label: "Домашка", emoji: "✏️", mode: "study" },
    { id: "project", label: "Курсовая, проект", emoji: "🗂️", mode: "study" },
    { id: "exam", label: "Экзамен, зачёт", emoji: "📝", mode: "study" },
    { id: "practice", label: "Практика", emoji: "🩺", mode: "study" },
    { id: "course", label: "Онлайн-курс", emoji: "💻" },
    { id: "language", label: "Иностранный язык", emoji: "🌍" },
    { id: "volunteer", label: "Волонтёрство", emoji: "🤝" },
    { id: "club", label: "Кружок, клуб", emoji: "🎤" },
    { id: "job", label: "Подработка", emoji: "💼", mode: "study" },
    { id: "deep", label: "Глубокая работа", emoji: "🎯", mode: "work" },
    { id: "meetings", label: "Встречи", emoji: "👥", mode: "work" },
    { id: "messages", label: "Почта, чаты", emoji: "📨", mode: "work" },
    { id: "learning", label: "Обучение", emoji: "📈", mode: "work" },
  ],
  rest: [
    { id: "book", label: "Книга", emoji: "📖", rest: "hobby" },
    { id: "manga", label: "Манга, комиксы", emoji: "🗯️", rest: "hobby" },
    { id: "series", label: "Сериал", emoji: "📺", rest: "hobby" },
    { id: "movie", label: "Фильм", emoji: "🎬", rest: "hobby" },
    { id: "anime", label: "Аниме", emoji: "🍥", rest: "hobby" },
    { id: "games", label: "Игры", emoji: "🎮", rest: "hobby" },
    { id: "youtube", label: "YouTube", emoji: "▶️", rest: "hobby" },
    { id: "social", label: "Соцсети", emoji: "📱", rest: "hobby" },
    { id: "music", label: "Музыка", emoji: "🎧", rest: "nervous" },
    { id: "instrument", label: "Игра на инструменте", emoji: "🎸", rest: "hobby" },
    { id: "drawing", label: "Рисование", emoji: "🎨", rest: "hobby" },
    { id: "craft", label: "Рукоделие", emoji: "🧶", rest: "hobby" },
    { id: "cooking", label: "Готовка", emoji: "🍳", rest: "hobby" },
    { id: "boardgames", label: "Настолки", emoji: "🎲", rest: "hobby" },
    { id: "friends", label: "Друзья", emoji: "👫", rest: "nervous" },
    { id: "family", label: "Семья", emoji: "🏠", rest: "nervous" },
    { id: "nature", label: "Природа, парк", emoji: "🌳", rest: "physical" },
    { id: "sport", label: "Спорт", emoji: "🏅", rest: "physical" },
    { id: "nap", label: "Дневной сон", emoji: "😴", rest: "nervous" },
    { id: "meditation", label: "Медитация, дыхание", emoji: "🪷", rest: "nervous" },
    { id: "bath", label: "Ванна, баня", emoji: "🛁", rest: "nervous" },
    { id: "prayer", label: "Молитва, намаз", emoji: "🤲", rest: "nervous" },
    { id: "celebration", label: "Той, праздник", emoji: "🎉", rest: "nervous" },
    { id: "nothing", label: "Ничегонеделание", emoji: "☁️", rest: "nervous" },
  ],
};

export const TAG_SPHERES: readonly TagSphere[] = ["mind", "activity", "work", "rest"];
export const MAX_TAGS = 12;
export const MAX_CUSTOM = 5;
export const CUSTOM_MAX = 24;

const BY_ID: Record<TagSphere, Map<string, Tag>> = Object.fromEntries(TAG_SPHERES.map((s) => [s, new Map(TAGS[s].map((t) => [t.id, t]))])) as Record<
  TagSphere,
  Map<string, Tag>
>;

export const tagById = (sphere: TagSphere, id: string): Tag | undefined => BY_ID[sphere].get(id);

/** Tags of a sphere visible for the mode. */
export function tagsFor(sphere: TagSphere, mode: "study" | "work"): readonly Tag[] {
  return TAGS[sphere].filter((t) => !t.mode || t.mode === mode);
}

/** One custom tag: no control/invisible chars, trimmed, ≤24 code points, first letter upper-cased. */
export function cleanCustom(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = Array.from(v.slice(0, CUSTOM_MAX * 4).replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/\s+/g, " ").trim()).slice(0, CUSTOM_MAX).join("").trim();
  if (!t) return null;
  return t[0]!.toLocaleUpperCase("ru-RU") + t.slice(1);
}

export function sanitizeKinds(sphere: TagSphere, v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = [...new Set(v.filter((x): x is string => typeof x === "string" && BY_ID[sphere].has(x)))].slice(0, MAX_TAGS);
  return out.length ? out : undefined;
}

export function sanitizeCustom(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of v) {
    const c = cleanCustom(x);
    if (c && !seen.has(c.toLowerCase())) {
      seen.add(c.toLowerCase());
      out.push(c);
    }
    if (out.length >= MAX_CUSTOM) break;
  }
  return out.length ? out : undefined;
}

/** Selected tags of a sphere (built-in ids + custom labels). */
export function sphereTags(d: CheckInData, s: TagSphere): { kinds: string[]; custom: string[] } {
  const x = d[s] as { kinds?: string[]; custom?: string[] };
  return { kinds: x.kinds ?? [], custom: x.custom ?? [] };
}

/** Labels for display: «🏊 Плавание», custom as «✎ Своё». */
export function tagLabels(d: CheckInData, s: TagSphere): string[] {
  const { kinds, custom } = sphereTags(d, s);
  return [...kinds.map((id) => tagById(s, id)).filter((t): t is Tag => !!t).map((t) => `${t.emoji} ${t.label}`), ...custom.map((c) => `✎ ${c}`)];
}

/** Today's check-in starts without yesterday's tags (they describe a single day). */
export function withoutTags(d: CheckInData): CheckInData {
  const strip = <T extends object>(o: T): T => {
    const { kinds: _k, custom: _c, ...rest } = o as T & { kinds?: unknown; custom?: unknown };
    void _k;
    void _c;
    return rest as T;
  };
  return { ...d, mind: strip(d.mind), activity: strip(d.activity), work: strip(d.work), rest: strip(d.rest) };
}

/** All custom texts across a check-in, for the crisis check. */
export function customText(d: CheckInData): string {
  return TAG_SPHERES.flatMap((s) => sphereTags(d, s).custom).join(" ");
}

/** Recently used custom tags per sphere (newest first), so they come back as chips. */
export function recentCustom(rows: CheckInData[], limit = 8): Record<TagSphere, string[]> {
  const out = { mind: [], activity: [], work: [], rest: [] } as Record<TagSphere, string[]>;
  for (const r of rows) {
    for (const s of TAG_SPHERES) {
      for (const c of sphereTags(r, s).custom) {
        if (out[s].length < limit && !out[s].some((x) => x.toLowerCase() === c.toLowerCase())) out[s].push(c);
      }
    }
  }
  return out;
}

/**
 * «Чем вы занимались в дни с лучшим фокусом»: mean score on days with a tag vs without.
 * Only tags with ≥3 days on both sides; caller enforces the overall ≥7-day rule.
 */
export interface TagEffect {
  sphere: TagSphere;
  key: string;
  label: string;
  emoji: string;
  withDays: number;
  withoutDays: number;
  diff: number;
}

export function tagEffects(days: { data: CheckInData; score: number }[], minEach = 3): TagEffect[] {
  const out: TagEffect[] = [];
  for (const s of TAG_SPHERES) {
    const keys = new Map<string, { label: string; emoji: string }>();
    for (const d of days) {
      const { kinds, custom } = sphereTags(d.data, s);
      kinds.forEach((id) => {
        const t = tagById(s, id);
        if (t) keys.set(id, { label: t.label, emoji: t.emoji });
      });
      custom.forEach((c) => keys.set(`c:${c.toLowerCase()}`, { label: c, emoji: "✎" }));
    }
    for (const [key, meta] of keys) {
      const has = (d: { data: CheckInData }) => {
        const { kinds, custom } = sphereTags(d.data, s);
        return key.startsWith("c:") ? custom.some((c) => `c:${c.toLowerCase()}` === key) : kinds.includes(key);
      };
      const w = days.filter(has).map((d) => d.score);
      const wo = days.filter((d) => !has(d)).map((d) => d.score);
      if (w.length < minEach || wo.length < minEach) continue;
      const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      out.push({ sphere: s, key, ...meta, withDays: w.length, withoutDays: wo.length, diff: Math.round(mean(w) - mean(wo)) });
    }
  }
  return out.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

/** How often each tag appeared (for statistics). */
export function tagCounts(rows: CheckInData[], sphere: TagSphere): { label: string; emoji: string; count: number }[] {
  const m = new Map<string, { label: string; emoji: string; count: number }>();
  for (const r of rows) {
    const { kinds, custom } = sphereTags(r, sphere);
    for (const id of kinds) {
      const t = tagById(sphere, id);
      if (!t) continue;
      const cur = m.get(id) ?? { label: t.label, emoji: t.emoji, count: 0 };
      cur.count++;
      m.set(id, cur);
    }
    for (const c of custom) {
      const k = `c:${c.toLowerCase()}`;
      const cur = m.get(k) ?? { label: c, emoji: "✎", count: 0 };
      cur.count++;
      m.set(k, cur);
    }
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
}
