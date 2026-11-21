import { describe, expect, it } from "vitest";
import { awards } from "./awards";

const at = (h: number, day = 1) => new Date(2026, 10, day, h, 0).getTime();

describe("awards", () => {
  it("starts locked and unlocks by totals, capping progress", () => {
    const empty = awards({ checkins: [], tests: [], sessions: [], habitLogs: [], stage: 0 });
    expect(empty.every((a) => !a.done && a.have === 0)).toBe(true);

    const r = awards({
      checkins: Array.from({ length: 8 }, (_, i) => ({ date: `d${i}` })),
      tests: [],
      sessions: Array.from({ length: 12 }, (_, i) => ({ minutes: 25, away: 0, startedAt: at(12, i + 1), date: `d${i}` })),
      habitLogs: [{ date: "a" }, { date: "a" }],
      stage: 4,
      goalsDone: 1,
    });
    const by = Object.fromEntries(r.map((a) => [a.id, a]));
    expect(by["week-checkins"]!.done).toBe(true);
    expect(by["month-checkins"]).toMatchObject({ done: false, have: 8 });
    expect(by["five-hours"]).toMatchObject({ done: true, have: 5 });
    expect(by["calm-five"]!.have).toBe(5);
    expect(by["habit-ten"]!.have).toBe(1);
    expect(by["bloom"]!.done).toBe(true);
    expect(by["first-goal"]!.done).toBe(true);
    expect(r.filter((a) => a.secret).every((a) => !a.done)).toBe(true);
  });

  it("unlocks the secret ones (пасхалки)", () => {
    const r = awards({
      checkins: [],
      tests: [{ date: "d", takenAt: at(6) }],
      sessions: [
        { minutes: 50, startedAt: at(1), date: "d" },
        { minutes: 15, startedAt: at(10), date: "d", task: " 42 " },
        { minutes: 15, startedAt: at(11), date: "d", together: true },
      ],
      habitLogs: [],
      stage: 0,
    });
    const done = r.filter((a) => a.done).map((a) => a.id);
    expect(done).toEqual(expect.arrayContaining(["night-owl", "early-bird", "marathon", "hat-trick", "together", "answer-42"]));
  });
});

describe("secret award hour edges", () => {
  const one = (tests: { date: string; takenAt: number }[], sessions: { minutes: number; startedAt: number; date: string }[]) =>
    Object.fromEntries(awards({ checkins: [], tests, sessions, habitLogs: [], stage: 0 }).map((a) => [a.id, a.done]));
  it("night owl is 00:00–03:59, early bird 04:00–06:59", () => {
    expect(one([], [{ minutes: 15, startedAt: at(3) + 59 * 60_000, date: "d" }])["night-owl"]).toBe(true);
    expect(one([], [{ minutes: 15, startedAt: at(4), date: "d" }])["night-owl"]).toBe(false);
    expect(one([], [{ minutes: 15, startedAt: at(23) + 59 * 60_000, date: "d" }])["night-owl"]).toBe(false);
    expect(one([{ date: "d", takenAt: at(6) + 59 * 60_000 }], [])["early-bird"]).toBe(true);
    expect(one([{ date: "d", takenAt: at(7) }], [])["early-bird"]).toBe(false);
  });
});
