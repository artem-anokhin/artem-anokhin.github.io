/**
 * Daily check-in reminder without a server: a recurring calendar event the
 * user adds to their own calendar. Only the time and a fixed title are used.
 */

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const REMINDER_TITLE = "FocusAI: чек-ин за 1 минуту";

export function isTime(t: string): boolean {
  return TIME_RE.test(t);
}

/** Only plain http(s) app addresses go into the event. */
export function safeUrl(u: string): string {
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

/** RFC 5545 line folding: max 75 octets per line, continuation lines start with a space. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74; // continuation lines carry a leading space
    if (enc.encode(cur + ch).length > limit) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Next occurrence of `time` as a floating local "YYYYMMDDTHHMMSS". */
function firstStart(time: string, now: Date): string {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  if (d <= now) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`;
}

function plus5min(start: string): string {
  const h = Number(start.slice(9, 11));
  const m = Number(start.slice(11, 13)) + 5;
  // Same day is fine for a 5-minute event except right before midnight; clamp to 23:59.
  return m >= 60 ? (h === 23 ? `${start.slice(0, 9)}235900` : `${start.slice(0, 9)}${pad(h + 1)}${pad(m - 60)}00`) : `${start.slice(0, 11)}${pad(m)}00`;
}

/** iCalendar file text (RFC 5545), daily, with an alarm at the start time. */
export function buildIcs(time: string, appUrl: string, now = new Date()): string {
  if (!isTime(time)) throw new Error("bad time");
  const url = safeUrl(appUrl);
  const start = firstStart(time, now);
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FocusAI//Reminder//RU",
    "BEGIN:VEVENT",
    `UID:focusai-checkin-${stamp}@focusai`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${plus5min(start)}`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${REMINDER_TITLE}`,
    `DESCRIPTION:Отметьте день и пройдите тест${url ? `: ${url}` : "."}`,
    ...(url ? [`URL:${url}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${REMINDER_TITLE}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(foldLine)
    .join("\r\n")
    .concat("\r\n");
}

/** Google Calendar "add event" link (opened only if the user taps it). */
export function googleCalendarUrl(time: string, appUrl: string, now = new Date()): string {
  if (!isTime(time)) throw new Error("bad time");
  const start = firstStart(time, now);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: REMINDER_TITLE,
    dates: `${start}/${plus5min(start)}`,
    recur: "RRULE:FREQ=DAILY",
    details: `Отметьте день и пройдите тест${safeUrl(appUrl) ? `: ${safeUrl(appUrl)}` : "."}`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}
