import { describe, expect, it } from "vitest";
import { emptyCheckIn, type CheckInData } from "./checkin";
import type { CheckIn, FocusTestResult } from "./db";
import {
  METRICS,
  computeInsights,
  experimentDay,
  experimentResult,
  pairDays,
  pickExperiment,
  ranks,
  spearman,
  strength,
  topInsights,
  usableDays,
} from "./insights";

/** Deterministic pseudo-random generator for synthetic data. */
function lcg(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
}

const date = (i: number) => {
  const d = new Date(2026, 9, 1 + i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Synthetic user: sleep hours drive the score, everything else is noise. */
function synthetic(days: number, seed = 1, patch?: (d: CheckInData, i: number) => void) {
  const rand = lcg(seed);
  const checkins: CheckIn[] = [];
  const tests: FocusTestResult[] = [];
  for (let i = 0; i < days; i++) {
    const d = emptyCheckIn();
    const sleepH = 5 + Math.floor(rand() * 5); // 5–9 h
    const bed = 24 - sleepH + 7 - 24; // wake at 07:00
    d.sleep.bedtime = `${String((bed + 24) % 24).padStart(2, "0")}:00`;
    d.sleep.wake = "07:00";
    d.mind.stress = (1 + Math.floor(rand() * 5)) as CheckInData["mind"]["stress"];
    d.caffeine.water = Math.floor(rand() * 8);
    patch?.(d, i);
    checkins.push({ ...d, date: date(i), createdAt: i, updatedAt: i });
    tests.push({ date: date(i), takenAt: i, score: Math.round(40 + sleepH * 5 + rand() * 6) });
  }
  return { checkins, tests };
}

describe("ranks & spearman", () => {
  it("averages tied ranks", () => {
    expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
  });
  it("is 1 / −1 for monotonic data and null for constants", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 1000])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(spearman([1], [1])).toBeNull();
  });
  it("matches a known value with ties", () => {
    // Ranks x=[1,2.5,2.5,4,5], y=[2,1,3,4.5,4.5] → Pearson of ranks = 7.5 / 9.5
    expect(spearman([1, 2, 2, 3, 4], [2, 1, 3, 4, 4])).toBeCloseTo(7.5 / 9.5, 10);
  });
});

describe("strength", () => {
  it("labels by |rho| and caps «сильная» below 14 days", () => {
    expect(strength(0.25, 20)).toBe("слабая");
    expect(strength(-0.4, 20)).toBe("заметная");
    expect(strength(0.6, 20)).toBe("сильная");
    expect(strength(0.6, 10)).toBe("заметная");
  });
});

describe("computeInsights", () => {
  it("needs at least 7 paired days", () => {
    const { checkins, tests } = synthetic(6);
    expect(computeInsights(pairDays(checkins, tests))).toEqual([]);
  });

  it("finds the planted sleep association first, with «связано»-style text and day count", () => {
    const { checkins, tests } = synthetic(21);
    const [top] = topInsights(pairDays(checkins, tests));
    expect(top?.metric.key).toBe("sleepHours");
    expect(top!.rho).toBeGreaterThan(0.8);
    expect(top!.days).toBe(21);
    expect(top!.strength).toBe("сильная");
    expect(top!.text).toBe("В ваших данных Focus Score чаще был выше в дни, когда вы спали дольше.");
    expect(top!.text).not.toMatch(/вызыва|из-за|потому/);
  });

  it("returns at most 3 and skips unanswered (carried-over) days", () => {
    const { checkins, tests } = synthetic(21, 2, (d, i) => {
      if (i >= 10) d.answered = ["food"]; // sleep not answered after day 10
    });
    const sleep = computeInsights(pairDays(checkins, tests)).find((x) => x.metric.key === "sleepHours");
    expect(sleep?.days).toBe(10);
    expect(topInsights(pairDays(checkins, tests)).length).toBeLessThanOrEqual(3);
  });

  it("ignores days without a test and uses the latest test of a day", () => {
    const { checkins, tests } = synthetic(8);
    const pairs = pairDays(checkins, [...tests.slice(1), { date: date(1), takenAt: 999, score: 1 }]);
    expect(pairs).toHaveLength(7);
    expect(pairs[0]?.score).toBe(1);
  });

  it("words negative associations from the higher-score side", () => {
    const { checkins, tests } = synthetic(14, 3, (d, i) => {
      d.food.breakfast = i % 2 === 0;
    });
    // Make breakfast days clearly lower.
    tests.forEach((t, i) => (t.score = i % 2 === 0 ? 30 : 80));
    const b = computeInsights(pairDays(checkins, tests)).find((x) => x.metric.key === "breakfast");
    expect(b?.rho).toBeLessThan(0);
    expect(b?.text).toBe("В ваших данных Focus Score чаще был выше в дни без завтрака.");
  });
});

describe("pickExperiment", () => {
  it("picks only factors whose data agrees with sourced advice", () => {
    const sleep = METRICS.find((m) => m.key === "sleepHours")!;
    const cups = METRICS.find((m) => m.key === "cups")!;
    const mood = METRICS.find((m) => m.key === "mood")!;
    const mk = (metric: typeof sleep, rho: number) => ({ metric, rho, days: 14, strength: "заметная" as const, text: "" });
    // More caffeine ~ higher score would contradict FDA advice → skipped.
    expect(pickExperiment([mk(mood, 0.9), mk(cups, 0.8), mk(sleep, 0.4)])?.metric.key).toBe("sleepHours");
    expect(pickExperiment([mk(cups, -0.5)])?.metric.key).toBe("cups");
    expect(pickExperiment([mk(mood, 0.9)])).toBeNull();
  });
});

describe("experiment", () => {
  const t = (d: string, score: number) => ({ date: d, takenAt: 1, score });
  it("counts days from the start", () => {
    expect(experimentDay("2026-11-20", "2026-11-20")).toBe(1);
    expect(experimentDay("2026-10-20", "2026-11-02")).toBe(14); // crosses month and EU DST end
  });
  it("compares 7 days before with 7 days after", () => {
    const tests = [
      t("2026-11-10", 50), t("2026-11-11", 52), t("2026-11-12", 54),
      t("2026-11-17", 60), t("2026-11-18", 62), t("2026-11-19", 64), t("2026-11-25", 99),
    ];
    const r = experimentResult(tests, "2026-11-17");
    expect(r.before).toEqual({ days: 3, mean: 52 });
    expect(r.after.days).toBe(3); // 11-25 is outside the 7-day window
    expect(r.diff).toBe(10);
  });
  it("gives no diff with too few days", () => {
    expect(experimentResult([t("2026-11-17", 60)], "2026-11-17").diff).toBeNull();
  });
});

describe("review follow-ups", () => {
  it("caffeineGap is negative after bedtime and null without caffeine", () => {
    const gap = METRICS.find((m) => m.key === "caffeineGap")!;
    const d = emptyCheckIn();
    d.sleep = { bedtime: "23:30", wake: "07:30", quality: 3 };
    d.caffeine = { cups: 1, lastAt: "03:00", water: 4 };
    expect(gap.value(d)).toBe(-3.5);
    d.caffeine.lastAt = "15:30";
    expect(gap.value(d)).toBe(8);
    d.caffeine = { cups: 0, lastAt: null, water: 4 };
    expect(gap.value(d)).toBeNull();
  });
  it("experimentDay never goes below 1 and day 8 is past the window", () => {
    expect(experimentDay("2026-11-20", "2026-11-18")).toBe(1);
    expect(experimentDay("2026-11-20", "2026-11-26")).toBe(7);
    expect(experimentDay("2026-11-20", "2026-11-27")).toBe(8);
  });
  it("days with nothing answered do not open the 7-day gate", () => {
    const { checkins, tests } = synthetic(7, 4, (d) => (d.answered = []));
    const pairs = pairDays(checkins, tests);
    expect(usableDays(pairs)).toBe(0);
    expect(computeInsights(pairs)).toEqual([]);
  });
});
