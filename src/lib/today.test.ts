import { describe, expect, it } from "vitest";
import { emptyCheckIn, type CheckInData } from "./checkin";
import { caffeineLate, historyDays, latestTestByDay, pickTip, sphereStatus } from "./today";

function day(patch: (d: CheckInData) => void): CheckInData {
  const d = emptyCheckIn();
  d.sleep = { bedtime: "23:00", wake: "07:00", quality: 4 };
  d.caffeine = { cups: 1, lastAt: "10:00", water: 6 };
  d.food = { breakfast: true, regularity: "normal" };
  d.mind = { stress: 2, mood: 4 };
  d.activity = { level: "medium", note: "" };
  d.rest = { type: "hobby" };
  patch(d);
  return d;
}

describe("caffeineLate", () => {
  it("flags caffeine within 6 h of bedtime or after it", () => {
    expect(caffeineLate(day(() => {}))).toBe(false);
    expect(caffeineLate(day((d) => (d.caffeine.lastAt = "17:00")))).toBe(false);
    expect(caffeineLate(day((d) => (d.caffeine.lastAt = "17:01")))).toBe(true);
    expect(caffeineLate(day((d) => (d.caffeine.lastAt = "23:30")))).toBe(true);
    expect(caffeineLate(day((d) => (d.caffeine.lastAt = "01:00")))).toBe(true);
  });
  it("handles bedtime after midnight", () => {
    const d = day((x) => (x.sleep = { bedtime: "01:00", wake: "09:00", quality: 3 }));
    d.caffeine.lastAt = "19:00";
    expect(caffeineLate(d)).toBe(false);
    d.caffeine.lastAt = "20:00";
    expect(caffeineLate(d)).toBe(true);
  });
  it("returns false when bedtime equals wake time", () => {
    const d = day((x) => (x.sleep = { bedtime: "07:00", wake: "07:00", quality: 3 }));
    d.caffeine.lastAt = "06:30";
    expect(caffeineLate(d)).toBe(false);
  });
  it("ignores days without caffeine", () => {
    expect(caffeineLate(day((d) => (d.caffeine = { cups: 0, lastAt: "23:00", water: 5 })))).toBe(false);
  });
});

describe("pickTip", () => {
  it("returns default when nothing fires", () => {
    expect(pickTip(day(() => {}))).toBe("default");
  });
  it("follows priority order", () => {
    expect(pickTip(day((d) => { d.sleep.bedtime = "01:00"; d.food.breakfast = false; }))).toBe("sleepShort");
    expect(pickTip(day((d) => { d.caffeine.cups = 5; d.rest.type = "none"; }))).toBe("caffeineMuch");
    expect(pickTip(day((d) => (d.mind.stress = 4)))).toBe("highStress");
    expect(pickTip(day((d) => (d.activity.level = "minimal")))).toBe("lowActivity");
    expect(pickTip(day((d) => (d.rest.type = "none")))).toBe("noRest");
  });
});

describe("sphereStatus", () => {
  it("marks attention per sphere and leaves work without a rule", () => {
    const s = sphereStatus(day((d) => { d.caffeine.cups = 4; d.food.breakfast = false; }));
    expect(s).toMatchObject({ sleep: "ok", food: "attention", caffeine: "attention", work: null });
  });
});

describe("history", () => {
  const t = (date: string, takenAt: number, score: number) => ({ date, takenAt, score });
  it("keeps the latest test of a day", () => {
    const m = latestTestByDay([t("2026-11-20", 2, 80), t("2026-11-20", 1, 50), t("2026-11-19", 1, 60)]);
    expect(m.get("2026-11-20")?.score).toBe(80);
    expect(m.size).toBe(2);
  });
  it("builds a gap-aware day list ending today", () => {
    const days = historyDays([{ date: "2026-11-19" }], [t("2026-11-20", 1, 70)], new Date(2026, 10, 20), 3);
    expect(days).toEqual([
      { date: "2026-11-18", score: null, checkedIn: false },
      { date: "2026-11-19", score: null, checkedIn: true },
      { date: "2026-11-20", score: 70, checkedIn: false },
    ]);
  });
  it("crosses month boundaries", () => {
    expect(historyDays([], [], new Date(2026, 11, 1), 2).map((d) => d.date)).toEqual(["2026-11-30", "2026-12-01"]);
  });
});
