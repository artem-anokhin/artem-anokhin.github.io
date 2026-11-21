import { db as defaultDb, dayKey, type BrainTest, type FocusDB } from "./db";
import { getProfile } from "./settings";

/**
 * Mini-tests beyond the reaction test. Scores are our own scale for comparing
 * yourself over time, not clinical norms (practice effects exist: compare trends).
 */

// ---------- «Цвет и слово» (Stroop) ----------

export const STROOP_COLORS = [
  { key: "red", word: "КРАСНЫЙ", label: "Красный", ink: "#FF453A" },
  { key: "blue", word: "СИНИЙ", label: "Синий", ink: "#409CFF" },
  { key: "green", word: "ЗЕЛЁНЫЙ", label: "Зелёный", ink: "#30D158" },
  { key: "yellow", word: "ЖЁЛТЫЙ", label: "Жёлтый", ink: "#FFD60A" },
] as const;
export type StroopColor = (typeof STROOP_COLORS)[number]["key"];
export const STROOP_TRIALS = 24;

export interface StroopTrial {
  word: StroopColor;
  ink: StroopColor;
}
export interface StroopAnswer {
  trial: StroopTrial;
  answer: StroopColor;
  rt: number;
}

/** Half congruent, half incongruent, shuffled; never the same trial twice in a row. */
export function stroopTrials(rand: () => number = Math.random, n = STROOP_TRIALS): StroopTrial[] {
  const keys = STROOP_COLORS.map((c) => c.key);
  const pick = () => keys[Math.floor(rand() * keys.length)]!;
  const out: StroopTrial[] = [];
  for (let i = 0; i < n; i++) {
    const congruent = i % 2 === 0;
    let t: StroopTrial;
    do {
      const word = pick();
      let ink = word;
      if (!congruent) while (ink === word) ink = pick();
      t = { word, ink };
    } while (out.length && out.at(-1)!.word === t.word && out.at(-1)!.ink === t.ink);
    out.push(t);
  }
  // Fisher–Yates shuffle keeps the 50/50 balance.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export interface StroopSummary {
  score: number;
  accuracy: number;
  medianRt: number;
  interference: number | null;
}

/** Score 0–100 = accuracy × speed (1 at ≤600 ms, 0 at ≥1600 ms, floor 0.5). Our own scale. */
export function scoreStroop(answers: StroopAnswer[]): StroopSummary | null {
  const valid = answers.filter((a) => a.rt >= 150 && a.rt <= 5000);
  if (valid.length < STROOP_TRIALS / 2) return null;
  const correct = valid.filter((a) => a.answer === a.trial.ink);
  const accuracy = correct.length / valid.length;
  const rts = correct.map((a) => a.rt);
  const med = median(rts) ?? 1600;
  const cong = median(correct.filter((a) => a.trial.word === a.trial.ink).map((a) => a.rt));
  const inc = median(correct.filter((a) => a.trial.word !== a.trial.ink).map((a) => a.rt));
  const speed = 0.5 + 0.5 * Math.max(0, Math.min(1, (1600 - med) / 1000));
  return {
    score: Math.round(accuracy * speed * 100),
    accuracy: Math.round(accuracy * 100) / 100,
    medianRt: Math.round(med),
    interference: cong !== null && inc !== null ? Math.round(inc - cong) : null,
  };
}

// ---------- «Запомни порядок» (memory span, Corsi-like) ----------

export const SPAN_TILES = 9;
export const SPAN_START = 3;
export const SPAN_MAX = 9;

/** A random sequence of distinct-neighbour tiles. */
export function spanSequence(length: number, rand: () => number = Math.random): number[] {
  const out: number[] = [];
  while (out.length < length) {
    const t = Math.floor(rand() * SPAN_TILES);
    if (t !== out.at(-1)) out.push(t);
  }
  return out;
}

/** Next level after a try: up on success, end after two misses at the same length. */
export function spanStep(state: { length: number; misses: number; best: number }, ok: boolean) {
  if (ok) {
    const best = Math.max(state.best, state.length);
    return state.length >= SPAN_MAX ? { ...state, best, done: true } : { length: state.length + 1, misses: 0, best, done: false };
  }
  const misses = state.misses + 1;
  return misses >= 2 ? { ...state, misses, done: true } : { ...state, misses, done: false };
}

// ---------- storage ----------

export async function saveBrainTest(row: Omit<BrainTest, "id" | "date">, db: FocusDB = defaultDb): Promise<BrainTest | null> {
  if (!Number.isFinite(row.score) || row.score < 0 || row.score > 100) return null;
  return db.transaction("rw", db.brainTests, db.settings, async () => {
    if (!(await getProfile(db))) return null;
    const full: BrainTest = { ...row, date: dayKey(new Date(row.takenAt)) };
    full.id = await db.brainTests.add(full);
    return full;
  });
}

export async function brainHistory(kind: BrainTest["kind"], db: FocusDB = defaultDb): Promise<BrainTest[]> {
  return (await db.brainTests.where("kind").equals(kind).toArray()).sort((a, b) => a.takenAt - b.takenAt);
}

/** Import validation. */
export function sanitizeBrainTest(v: unknown): Omit<BrainTest, "id"> | null {
  if (!v || typeof v !== "object") return null;
  const b = v as Record<string, unknown>;
  const num = (x: unknown, lo: number, hi: number) => typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;
  if ((b.kind !== "stroop" && b.kind !== "span") || !num(b.takenAt, 1, 8.64e15) || !num(b.score, 0, 100)) return null;
  if (typeof b.date !== "string" || b.date !== dayKey(new Date(b.takenAt as number))) return null;
  return {
    kind: b.kind,
    date: b.date,
    takenAt: b.takenAt as number,
    score: Math.round(b.score as number),
    ...(num(b.accuracy, 0, 1) ? { accuracy: b.accuracy as number } : {}),
    ...(num(b.medianRt, 0, 10_000) ? { medianRt: b.medianRt as number } : {}),
    ...(num(b.interference, -10_000, 10_000) ? { interference: b.interference as number } : {}),
  };
}
