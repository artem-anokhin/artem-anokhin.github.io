import { emptyCheckIn } from "./checkin";
import type { CheckIn } from "./db";
import { weeklyReview } from "./weekly";

const ci = (date: string): CheckIn => ({ ...emptyCheckIn(), date, createdAt: 1, updatedAt: 1 });

describe("weeklyReview", () => {
  it("compares this week with the previous one", () => {
    const r = weeklyReview(
      [ci("2026-11-21"), ci("2026-11-20"), ci("2026-11-10")],
      [
        { date: "2026-11-21", takenAt: 1, score: 60 },
        { date: "2026-11-21", takenAt: 2, score: 80 }, // latest of the day wins
        { date: "2026-11-19", takenAt: 1, score: 70 },
        { date: "2026-11-12", takenAt: 1, score: 50 },
      ],
      [{ date: "2026-11-20", startedAt: 1, minutes: 25 }, { date: "2026-11-21", startedAt: 1, minutes: 50 }],
      "2026-11-21",
    );
    expect(r.current).toMatchObject({ checkinDays: 2, testDays: 2, avgScore: 75, focusMinutes: 75, avgSleep: 8, best: { date: "2026-11-21", score: 80 } });
    expect(r.previous).toMatchObject({ checkinDays: 1, avgScore: 50, focusMinutes: 0 });
    expect(r.scoreDelta).toBe(25);
    expect(r.days.map((d) => d.date)).toEqual(["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]);
    expect(r.days.at(-1)).toEqual({ date: "2026-11-21", checkin: true, test: true, session: true, habit: false });
  });

  it("returns nulls without data", () => {
    const r = weeklyReview([], [], [], "2026-11-21");
    expect(r.current.avgScore).toBeNull();
    expect(r.current.avgSleep).toBeNull();
    expect(r.scoreDelta).toBeNull();
  });
});

describe("weeklyReview habits", () => {
  it("counts habit marks per week", () => {
    const r = weeklyReview([], [], [], "2026-11-21", [
      { habitId: 1, date: "2026-11-21", doneAt: 1 },
      { habitId: 2, date: "2026-11-21", doneAt: 1 },
      { habitId: 1, date: "2026-11-10", doneAt: 1 },
    ]);
    expect(r.current.habitMarks).toBe(2);
    expect(r.previous.habitMarks).toBe(1);
    expect(r.days.at(-1)?.habit).toBe(true);
  });
});
