import type { CheckIn, FocusSession } from "./db";
import { plural } from "./plural";
import { CARD_H, CARD_W } from "./shareCard";
import { TAG_SPHERES, tagCounts } from "./tags";

/** «Тип недели»: a playful label from the user's own week (no scores, no judgement). */
export interface Persona {
  emoji: string;
  title: string;
  why: string;
}

export function weekPersona(sessions: Pick<FocusSession, "minutes" | "startedAt">[], checkins: CheckIn[]): Persona {
  const hour = (t: number) => new Date(t).getHours();
  const n = sessions.length;
  const minutes = sessions.reduce((a, s) => a + s.minutes, 0);
  const night = sessions.filter((s) => hour(s.startedAt) < 4).length;
  const early = sessions.filter((s) => hour(s.startedAt) >= 5 && hour(s.startedAt) < 9).length;
  const long = sessions.filter((s) => s.minutes >= 50).length;
  const top = TAG_SPHERES.flatMap((s) => tagCounts(checkins, s).map((t) => ({ ...t, sphere: s }))).sort((a, b) => b.count - a.count)[0];

  if (n >= 3 && night / n >= 0.5) return { emoji: "🦉", title: "Ночная сова", why: "больше половины сессий — после полуночи" };
  if (n >= 3 && early / n >= 0.5) return { emoji: "🐦", title: "Ранняя пташка", why: "больше половины сессий — до 9 утра" };
  if (long >= 3) return { emoji: "🏃", title: "Марафонец", why: `${long} ${plural(long, ["сессия", "сессии", "сессий"])} по 50 минут` };
  if (top && top.count >= 3) {
    const byTag: Record<string, Persona> = {
      "Плавание": { emoji: "🐬", title: "Дельфин", why: "плавание чаще всего" },
      "Манга, комиксы": { emoji: "🗯️", title: "Мангачитатель", why: "манга чаще всего" },
      "Аниме": { emoji: "🍥", title: "Анимешник", why: "аниме чаще всего" },
      "Книга": { emoji: "📚", title: "Книжный червь", why: "книги чаще всего" },
      "Сериал": { emoji: "📺", title: "Сериальный марафонец", why: "сериалы чаще всего" },
      "Игры": { emoji: "🎮", title: "Геймер", why: "игры чаще всего" },
      "Друзья": { emoji: "👫", title: "Душа компании", why: "встречи с друзьями чаще всего" },
      "Зал": { emoji: "💪", title: "Железный", why: "зал чаще всего" },
      "Бег": { emoji: "🏃", title: "Бегун", why: "бег чаще всего" },
      "Лабы": { emoji: "🧪", title: "Лабораторщик", why: "лабы чаще всего" },
      "Музыка": { emoji: "🎧", title: "Меломан", why: "музыка чаще всего" },
    };
    const p = byTag[top.label];
    if (p) return p;
    return { emoji: top.emoji === "✎" ? "✨" : top.emoji, title: "Верный своему делу", why: `«${top.label}» чаще всего` };
  }
  if (minutes >= 300) return { emoji: "🧠", title: "Машина фокуса", why: `${Math.round(minutes / 60)} ч фокуса за неделю` };
  return { emoji: "🌱", title: "Росток", why: "неделя только начинается" };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface WrappedInput {
  persona: Persona;
  focusMinutes: number;
  sessions: number;
  checkinDays: number;
  bestScore: number | null;
  tags: { emoji: string; label: string }[];
  url: string;
}

/** Night story card «Моя неделя» (1080×1920). */
export function wrappedCardSvg(w: WrappedInput): string {
  const font = "-apple-system, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  const h = Math.floor(w.focusMinutes / 60);
  const m = w.focusMinutes % 60;
  const focus = h ? `${h} ч ${m} мин` : `${m} мин`;
  const tiles: [string, string][] = [
    [focus, "фокуса"],
    [String(w.sessions), plural(w.sessions, ["сессия", "сессии", "сессий"])],
    [String(w.checkinDays), `${plural(w.checkinDays, ["день", "дня", "дней"])} с чек-ином`],
    [w.bestScore === null ? "—" : String(w.bestScore), "лучший Focus Score"],
  ];
  const tile = ([v, l]: [string, string], i: number) => {
    const x = 72 + (i % 2) * 476;
    const y = 960 + Math.floor(i / 2) * 260;
    return `<rect x="${x}" y="${y}" width="460" height="236" rx="44" fill="#1C1C1E"/>
<text x="${x + 44}" y="${y + 120}" font-family="${font}" font-weight="700" font-size="76" letter-spacing="-2" fill="#FFFFFF">${esc(v)}</text>
<text x="${x + 44}" y="${y + 180}" font-family="${font}" font-weight="500" font-size="36" fill="#98989F">${esc(l)}</text>`;
  };
  const tagLine = w.tags
    .slice(0, 3)
    .map((t) => `${t.emoji} ${t.label}`)
    .join("   ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
<rect width="100%" height="100%" fill="#000000"/>
<text x="96" y="210" font-family="${font}" font-weight="600" font-size="40" fill="#98989F">FOCUSAI · МОЯ НЕДЕЛЯ</text>
<text x="540" y="520" text-anchor="middle" font-size="220">${esc(w.persona.emoji)}</text>
<text x="540" y="690" text-anchor="middle" font-family="${font}" font-weight="700" font-size="96" letter-spacing="-2" fill="#FFFFFF">${esc(w.persona.title)}</text>
<text x="540" y="780" text-anchor="middle" font-family="${font}" font-weight="500" font-size="42" fill="#9BDB7E">${esc(w.persona.why)}</text>
${tiles.map(tile).join("\n")}
${tagLine ? `<text x="540" y="1560" text-anchor="middle" font-family="${font}" font-weight="500" font-size="44" fill="#FFFFFF">${esc(tagLine)}</text>` : ""}
<text x="540" y="1790" text-anchor="middle" font-family="${font}" font-weight="600" font-size="40" fill="#7EA2FF">А какой тип недели у тебя?</text>
<text x="540" y="1846" text-anchor="middle" font-family="${font}" font-weight="500" font-size="32" fill="#98989F">${esc(w.url)}</text>
</svg>`;
}
