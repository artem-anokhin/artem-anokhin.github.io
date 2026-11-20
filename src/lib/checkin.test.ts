import { emptyCheckIn, formatHours, isAnswered, sanitizeCheckIn, sleepHours, type CheckInData } from "./checkin";

describe("sleepHours", () => {
  it("crosses midnight", () => {
    expect(sleepHours("23:30", "07:30")).toBe(8);
    expect(sleepHours("01:15", "08:00")).toBe(6.75);
  });
  it("handles same-day naps and equal times", () => {
    expect(sleepHours("13:00", "14:30")).toBe(1.5);
    expect(sleepHours("07:00", "07:00")).toBe(0);
    expect(sleepHours("23:59", "00:00")).toBe(0);
    expect(sleepHours("23:45", "00:00")).toBe(0.25);
  });
  it("throws on invalid time", () => {
    expect(() => sleepHours("25:00", "07:00")).toThrow();
  });
});

describe("formatHours", () => {
  it("uses a decimal comma", () => {
    expect(formatHours(7.5)).toBe("7,5 ч");
    expect(formatHours(8)).toBe("8 ч");
  });
});

describe("sanitizeCheckIn", () => {
  it("keeps valid data unchanged", () => {
    expect(sanitizeCheckIn(emptyCheckIn())).toEqual(emptyCheckIn());
  });
  it("clamps numbers, fixes enums and trims text", () => {
    const bad = {
      ...emptyCheckIn(),
      sleep: { bedtime: "99:99", wake: "07:00", quality: 9 },
      caffeine: { cups: 0, lastAt: "15:00", water: -3 },
      work: { hours: 30, difficulty: 0 },
      rest: { type: "nap" },
      note: "  " + "а".repeat(600),
    } as unknown as CheckInData;
    const s = sanitizeCheckIn(bad);
    expect(s.sleep.bedtime).toBe("23:30");
    expect(s.sleep.quality).toBe(3);
    expect(s.caffeine.lastAt).toBeNull();
    expect(s.caffeine.water).toBe(0);
    expect(s.work.hours).toBe(16);
    expect(s.work.difficulty).toBe(3);
    expect(s.rest.type).toBe("none");
    expect(s.note).toHaveLength(500);
  });
  it("drops last-coffee time when rounded cups are 0 or NaN", () => {
    for (const cups of [0.4, Number.NaN]) {
      const s = sanitizeCheckIn({ ...emptyCheckIn(), caffeine: { cups, lastAt: "15:00", water: 2 } });
      expect(s.caffeine).toEqual({ cups: 0, lastAt: null, water: 2 });
    }
  });
});

describe("answered spheres", () => {
  it("sanitizes the answered list and keeps undefined as 'all answered'", () => {
    const base = emptyCheckIn();
    expect(sanitizeCheckIn(base).answered).toBeUndefined();
    const s = sanitizeCheckIn({ ...base, answered: ["rest", "sleep", "bogus" as never, "sleep"] });
    expect(s.answered).toEqual(["sleep", "rest"]);
    expect(isAnswered(s, "sleep")).toBe(true);
    expect(isAnswered(s, "food")).toBe(false);
    expect(isAnswered(base, "food")).toBe(true);
  });
});
