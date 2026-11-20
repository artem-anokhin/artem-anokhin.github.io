import { describe, expect, it } from "vitest";
import {
  FALSE_START_MS,
  MAX_ISI_MS,
  MIN_ISI_MS,
  NO_RESPONSE_MS,
  TEST_DURATION_MS,
  phaseAt,
  press,
  randomIsi,
  startSession,
  summarize,
  tick,
} from "./focusTest";

const fixed = (x: number) => () => x;

describe("randomIsi", () => {
  it("stays within 1–4 s", () => {
    expect(randomIsi(fixed(0))).toBe(MIN_ISI_MS);
    expect(randomIsi(fixed(0.999999))).toBe(MAX_ISI_MS);
    for (let i = 0; i < 100; i++) {
      const v = randomIsi();
      expect(v).toBeGreaterThanOrEqual(MIN_ISI_MS);
      expect(v).toBeLessThanOrEqual(MAX_ISI_MS);
    }
  });
});

describe("session", () => {
  const s0 = startSession(0, fixed(0)); // stimulus at 1000

  it("moves through wait → stimulus → done", () => {
    expect(phaseAt(s0, 500)).toBe("wait");
    expect(phaseAt(s0, 1000)).toBe("stimulus");
    expect(phaseAt(s0, TEST_DURATION_MS)).toBe("done");
  });

  it("records a reaction and schedules the next stimulus", () => {
    const s = press(s0, 1250, fixed(0));
    expect(s.rts).toEqual([250]);
    expect(s.stimulusAt).toBe(2250);
    expect(s.falseStarts).toBe(0);
  });

  it("counts presses before the stimulus and < 100 ms as false starts", () => {
    const early = press(s0, 900, fixed(0));
    expect(early.falseStarts).toBe(1);
    expect(early.rts).toEqual([]);
    expect(early.stimulusAt).toBe(1900);
    const tooFast = press(s0, 1000 + FALSE_START_MS - 1, fixed(0));
    expect(tooFast.falseStarts).toBe(1);
    expect(press(s0, 1000 + FALSE_START_MS, fixed(0)).rts).toEqual([FALSE_START_MS]);
  });

  it("records a no-response as a 3 s lapse", () => {
    expect(tick(s0, 1000 + NO_RESPONSE_MS - 1)).toBe(s0);
    const s = tick(s0, 1000 + NO_RESPONSE_MS, fixed(0));
    expect(s.rts).toEqual([NO_RESPONSE_MS]);
    expect(s.stimulusAt).toBe(1000 + NO_RESPONSE_MS + MIN_ISI_MS);
  });

  it("ignores input after the end", () => {
    expect(press(s0, TEST_DURATION_MS + 1)).toBe(s0);
    expect(tick(s0, TEST_DURATION_MS + 1)).toBe(s0);
  });
});

describe("summarize", () => {
  it("returns no score with too little data", () => {
    expect(summarize([], 0).score).toBeNull();
    const few = summarize([250, 260, 270], 0);
    expect(few.score).toBeNull();
    expect(few.medianRt).toBe(260);
  });

  it("gives 100 for fast, error-free reactions", () => {
    expect(summarize(Array(20).fill(200), 0).score).toBe(100);
  });

  it("gives 0 for only slow reactions", () => {
    const r = summarize(Array(20).fill(600), 0);
    expect(r.lapses).toBe(20);
    expect(r.score).toBe(0);
  });

  it("follows the documented formula", () => {
    // 250 ms → speed 4/s → speedPts 80; 2 lapses + 2 false starts of 22 → accPts ≈ 81.8
    const rts = [...Array(18).fill(250), 400, 400];
    const r = summarize(rts, 2);
    expect(r.lapses).toBe(2);
    expect(r.trials).toBe(20);
    const speed = (18 * 4 + 2 * 2.5) / 20;
    const expected = Math.round(0.7 * ((speed - 2) / 2.5) * 100 + 0.3 * (1 - 4 / 22) * 100);
    expect(r.score).toBe(expected);
  });

  it("lowers the score with more lapses", () => {
    const good = summarize(Array(20).fill(280), 0).score!;
    const worse = summarize([...Array(15).fill(280), ...Array(5).fill(500)], 0).score!;
    expect(worse).toBeLessThan(good);
  });
});

describe("boundaries", () => {
  const s0 = startSession(0, fixed(0)); // stimulus at 1000

  it("needs 10 valid trials for a score", () => {
    expect(summarize(Array(9).fill(250), 0).score).toBeNull();
    expect(summarize(Array(10).fill(250), 0).score).not.toBeNull();
  });

  it("treats 355 ms as not a lapse and 356 ms as a lapse", () => {
    expect(summarize([355], 0).lapses).toBe(0);
    expect(summarize([356], 0).lapses).toBe(1);
  });

  it("counts a second tap after a reaction as a false start (PVT rule)", () => {
    const s = press(press(s0, 1250, fixed(0)), 1300, fixed(0));
    expect(s.rts).toEqual([250]);
    expect(s.falseStarts).toBe(1);
  });
});
