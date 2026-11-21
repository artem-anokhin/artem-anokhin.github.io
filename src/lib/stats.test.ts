import { describe, expect, it } from "vitest";
import { focusCalendar, hourBins, level, scoreTrend, weeklyMinutes } from "./stats";

const today = new Date(2026, 10, 21, 12); // Saturday

describe("stats", () => {
  it("sums minutes per Monday-based week", () => {
    const w = weeklyMinutes([{ date: "2026-11-16", minutes: 25 }, { date: "2026-11-21", minutes: 50 }, { date: "2026-11-15", minutes: 15 }], today, 2);
    expect(w).toEqual([{ start: "2026-11-09", minutes: 15 }, { start: "2026-11-16", minutes: 75 }]);
  });
  it("builds a 12×7 calendar with future days empty", () => {
    const c = focusCalendar([{ date: "2026-11-21", minutes: 30 }], today);
    expect(c).toHaveLength(12);
    expect(c[11]![5]).toEqual({ date: "2026-11-21", minutes: 30 });
    expect(c[11]![6]!.minutes).toBeNull();
    expect([0, 10, 30, 60, 120].map(level)).toEqual([0, 1, 2, 3, 4]);
  });
  it("trend needs 3 tests in the 7-day window", () => {
    const t = [19, 20, 21].map((d) => ({ date: `2026-11-${d}`, takenAt: 1, score: 60 + d - 19 }));
    const r = scoreTrend(t, today, 7);
    expect(r.at(-1)).toEqual({ date: "2026-11-21", score: 62, avg7: 61 });
    expect(r.at(-2)!.avg7).toBeNull();
  });
  it("bins session starts by 2 hours", () => {
    const b = hourBins([{ startedAt: new Date(2026, 10, 21, 9, 30).getTime(), minutes: 25 }]);
    expect(b[4]).toEqual({ from: 8, minutes: 25 });
  });
});
