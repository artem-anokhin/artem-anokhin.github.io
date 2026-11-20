import { buildIcs, googleCalendarUrl, isTime } from "./reminder";

const now = new Date(2026, 10, 21, 22, 0);

describe("reminder", () => {
  it("validates time", () => {
    expect(isTime("21:00")).toBe(true);
    expect(isTime("24:00")).toBe(false);
    expect(isTime("9:00")).toBe(false);
  });

  it("builds a daily ics starting at the next occurrence", () => {
    const ics = buildIcs("21:00", "https://focusai.app", now);
    expect(ics).toContain("DTSTART:20261122T210000"); // 21:00 today already passed
    expect(ics).toContain("DTEND:20261122T210500");
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(buildIcs("23:00", "x", now)).toContain("DTSTART:20261121T230000");
  });

  it("handles end near midnight and hour rollover", () => {
    expect(buildIcs("23:58", "x", now)).toContain("DTEND:20261121T235900");
    expect(buildIcs("22:57", "x", now)).toContain("DTEND:20261121T230200");
  });

  it("folds long lines to 75 octets and drops unsafe URLs", () => {
    const ics = buildIcs("21:00", "https://focusai.app", now);
    const enc = new TextEncoder();
    for (const line of ics.split("\r\n")) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
    expect(ics.replace(/\r\n /g, "")).toContain("DESCRIPTION:Отметьте день и пройдите тест: https://focusai.app/");
    const bad = buildIcs("21:00", "javascript:alert(1)\r\nX:1", now);
    expect(bad).not.toContain("javascript");
    expect(bad).not.toContain("URL:");
  });

  it("builds a Google Calendar link with only time and fixed text", () => {
    const u = new URL(googleCalendarUrl("08:30", "https://focusai.app", now));
    expect(u.hostname).toBe("calendar.google.com");
    expect(u.searchParams.get("dates")).toBe("20261122T083000/20261122T083500");
    expect(u.searchParams.get("recur")).toBe("RRULE:FREQ=DAILY");
  });
});
