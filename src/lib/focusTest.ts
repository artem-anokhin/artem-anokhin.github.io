/**
 * Focus test in the style of PVT-B (Basner et al., 2011), shortened to 90 s.
 * Pure functions only: the screen feeds in timestamps, this module decides.
 *
 * Rules:
 * - A stimulus appears after a random 1–4 s delay (inter-stimulus interval).
 * - Pressing before the stimulus, or < 100 ms after it, is a false start;
 *   the delay restarts.
 * - A reaction > 355 ms is a lapse (PVT-B threshold).
 * - No reaction within 3 s counts as a lapse with RT = 3000 ms.
 */

export const TEST_DURATION_MS = 90_000;
export const MIN_ISI_MS = 1_000;
export const MAX_ISI_MS = 4_000;
export const FALSE_START_MS = 100;
export const LAPSE_MS = 355;
export const NO_RESPONSE_MS = 3_000;
/** Fewer valid reactions than this → no score (too little data). */
export const MIN_VALID_TRIALS = 10;

export type Rand = () => number;

/** Random delay before the next stimulus, uniform in [1 s, 4 s]. */
export function randomIsi(rand: Rand = Math.random): number {
  return Math.round(MIN_ISI_MS + rand() * (MAX_ISI_MS - MIN_ISI_MS));
}

export interface Session {
  startedAt: number;
  endsAt: number;
  /** When the current stimulus appears (or appeared). */
  stimulusAt: number;
  /** Reaction times in ms, including lapses (> 355 ms) and no-responses. */
  rts: number[];
  falseStarts: number;
}

export type Phase = "wait" | "stimulus" | "done";

export function startSession(now: number, rand: Rand = Math.random): Session {
  return {
    startedAt: now,
    endsAt: now + TEST_DURATION_MS,
    stimulusAt: now + randomIsi(rand),
    rts: [],
    falseStarts: 0,
  };
}

export function phaseAt(s: Session, now: number): Phase {
  if (now >= s.endsAt) return "done";
  return now >= s.stimulusAt ? "stimulus" : "wait";
}

/** User pressed the button / screen at `now`. */
export function press(s: Session, now: number, rand: Rand = Math.random): Session {
  if (phaseAt(s, now) === "done") return s;
  const next = now + randomIsi(rand);
  const rt = now - s.stimulusAt;
  if (rt < FALSE_START_MS) {
    return { ...s, stimulusAt: next, falseStarts: s.falseStarts + 1 };
  }
  return { ...s, stimulusAt: next, rts: [...s.rts, rt] };
}

/** Advance time: records a no-response if the stimulus waited too long. */
export function tick(s: Session, now: number, rand: Rand = Math.random): Session {
  if (phaseAt(s, now) === "done") return s;
  if (now - s.stimulusAt < NO_RESPONSE_MS) return s;
  const missedAt = s.stimulusAt + NO_RESPONSE_MS;
  return {
    ...s,
    stimulusAt: missedAt + randomIsi(rand),
    rts: [...s.rts, NO_RESPONSE_MS],
  };
}

export interface FocusSummary {
  trials: number;
  falseStarts: number;
  lapses: number;
  medianRt: number | null;
  /** Mean reaction speed, 1/RT in 1/s. */
  meanSpeed: number | null;
  /** 0–100, or null when there are fewer than MIN_VALID_TRIALS reactions. */
  score: number | null;
}

/** Speed (1/s) that maps to 0 and 100 points: 500 ms → 0, ≈222 ms → 100. */
const SPEED_FLOOR = 2.0;
const SPEED_CEIL = 4.5;
const SPEED_WEIGHT = 0.7;
const ACCURACY_WEIGHT = 0.3;

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function median(xs: number[]): number {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
}

/**
 * Focus Score formula (0–100), documented here on purpose:
 *
 *   speed    = mean(1000 / RT) over all reactions ≥ 100 ms   (1/s)
 *   speedPts = clamp((speed − 2.0) / (4.5 − 2.0), 0, 1) × 100
 *   errors   = lapses (RT > 355 ms) + false starts
 *   accPts   = (1 − errors / (reactions + false starts)) × 100
 *   score    = round(0.7 × speedPts + 0.3 × accPts)
 *
 * Mean 1/RT and lapses + false starts are the PVT-B outcomes most sensitive
 * to lowered alertness (Basner 2011). The 2.0–4.5 /s range and the 70/30
 * weights are our own scaling for a readable 0–100 number, not lab norms.
 */
export function summarize(rts: number[], falseStarts: number): FocusSummary {
  const valid = rts.filter((rt) => rt >= FALSE_START_MS);
  const lapses = valid.filter((rt) => rt > LAPSE_MS).length;
  if (valid.length === 0) {
    return { trials: 0, falseStarts, lapses: 0, medianRt: null, meanSpeed: null, score: null };
  }
  const meanSpeed = valid.reduce((sum, rt) => sum + 1000 / rt, 0) / valid.length;
  const medianRt = Math.round(median(valid));
  let score: number | null = null;
  if (valid.length >= MIN_VALID_TRIALS) {
    const speedPts = clamp((meanSpeed - SPEED_FLOOR) / (SPEED_CEIL - SPEED_FLOOR), 0, 1) * 100;
    const accPts = (1 - (lapses + falseStarts) / (valid.length + falseStarts)) * 100;
    score = Math.round(SPEED_WEIGHT * speedPts + ACCURACY_WEIGHT * accPts);
  }
  return { trials: valid.length, falseStarts, lapses, medianRt, meanSpeed, score };
}
