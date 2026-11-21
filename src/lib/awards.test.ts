import { describe, expect, it } from "vitest";
import { awards } from "./awards";

describe("awards", () => {
  it("starts locked and unlocks by totals, capping progress", () => {
    const empty = awards({ checkins: [], tests: [], sessions: [], habitLogs: [], stage: 0 });
    expect(empty.every((a) => !a.done && a.have === 0)).toBe(true);

    const r = awards({
      checkins: Array.from({ length: 8 }, (_, i) => ({ date: `d${i}` })),
      tests: [],
      sessions: Array.from({ length: 12 }, () => ({ minutes: 25, away: 0 })),
      habitLogs: [{ date: "a" }, { date: "a" }],
      stage: 4,
    });
    const by = Object.fromEntries(r.map((a) => [a.id, a]));
    expect(by["week-checkins"]!.done).toBe(true);
    expect(by["month-checkins"]).toMatchObject({ done: false, have: 8 });
    expect(by["five-hours"]).toMatchObject({ done: true, have: 5 });
    expect(by["calm-five"]!.have).toBe(5);
    expect(by["habit-ten"]!.have).toBe(1);
    expect(by["bloom"]!.done).toBe(true);
  });
});
