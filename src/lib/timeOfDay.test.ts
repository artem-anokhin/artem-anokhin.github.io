import { describe, expect, it } from "vitest";
import { partOf, timeOfDay } from "./timeOfDay";

const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0).getTime();
const t = (day: number, hour: number, score: number) => ({ date: `2026-11-${String(day).padStart(2, "0")}`, takenAt: at(day, hour), score });

describe("time of day", () => {
  it("maps hours to parts, late night counts as evening", () => {
    expect(partOf(at(1, 9))).toBe("morning");
    expect(partOf(at(1, 13))).toBe("day");
    expect(partOf(at(1, 22))).toBe("evening");
    expect(partOf(at(1, 2))).toBe("evening");
  });

  it("needs 7 days, 3 tests per part and a 5-point gap", () => {
    expect(timeOfDay([t(1, 9, 80)])).toBeNull();
    const tests = [1, 2, 3, 4, 5, 6, 7].flatMap((d) => [t(d, 9, 80), t(d, 20, 60)]);
    const r = timeOfDay(tests)!;
    expect(r.days).toBe(7);
    expect(r.best?.key).toBe("morning");
    expect(r.parts.find((p) => p.key === "day")!.avg).toBeNull();
    const flat = [1, 2, 3, 4, 5, 6, 7].flatMap((d) => [t(d, 9, 70), t(d, 20, 68)]);
    expect(timeOfDay(flat)!.best).toBeNull();
  });
});
