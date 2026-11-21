import { describe, expect, it } from "vitest";
import { FocusDB } from "./db";
import { STROOP_TRIALS, brainHistory, sanitizeBrainTest, saveBrainTest, scoreStroop, spanSequence, spanStep, stroopTrials } from "./brainTests";

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length]!;
};

describe("stroop", () => {
  it("builds balanced trials", () => {
    const t = stroopTrials(Math.random);
    expect(t).toHaveLength(STROOP_TRIALS);
    expect(t.filter((x) => x.word === x.ink)).toHaveLength(STROOP_TRIALS / 2);
  });
  it("scores accuracy × speed and interference", () => {
    const answers = stroopTrials(seq([0.1, 0.4, 0.7, 0.9, 0.3])).map((trial) => ({
      trial,
      answer: trial.ink,
      rt: trial.word === trial.ink ? 600 : 800,
    }));
    const s = scoreStroop(answers)!;
    expect(s.accuracy).toBe(1);
    expect(s.interference).toBe(200);
    expect(s.score).toBeGreaterThan(80);
    expect(scoreStroop(answers.slice(0, 3))).toBeNull();
  });
});

describe("memory span", () => {
  it("never repeats a tile twice in a row", () => {
    const s = spanSequence(9, seq([0.1, 0.1, 0.5, 0.5, 0.9]));
    expect(s).toHaveLength(9);
    expect(s.every((x, i) => i === 0 || x !== s[i - 1])).toBe(true);
  });
  it("goes up on success, ends after two misses", () => {
    let st = { length: 3, misses: 0, best: 0, done: false };
    st = spanStep(st, true);
    expect(st).toMatchObject({ length: 4, best: 3 });
    st = spanStep(st, false);
    expect(st.done).toBe(false);
    st = spanStep(st, false);
    expect(st).toMatchObject({ done: true, best: 3 });
  });
});

describe("brain test storage", () => {
  it("needs consent, validates, sorts history and imports", async () => {
    const db = new FocusDB("brain-test");
    const t = new Date(2026, 10, 21, 10).getTime();
    expect(await saveBrainTest({ kind: "span", takenAt: t, score: 5 }, db)).toBeNull();
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    await saveBrainTest({ kind: "span", takenAt: t + 1000, score: 6 }, db);
    await saveBrainTest({ kind: "span", takenAt: t, score: 5 }, db);
    expect((await brainHistory("span", db)).map((x) => x.score)).toEqual([5, 6]);
    expect(await saveBrainTest({ kind: "stroop", takenAt: t, score: 500 }, db)).toBeNull();
    expect(sanitizeBrainTest({ kind: "span", takenAt: t, score: 5, date: "2026-11-21" })).toMatchObject({ score: 5 });
    expect(sanitizeBrainTest({ kind: "x", takenAt: t, score: 5, date: "2026-11-21" })).toBeNull();
    await db.delete();
  });
});

describe("brain tests privacy", () => {
  it("are exported, re-imported and deleted with everything else", async () => {
    const { exportData, importData, deleteAllData } = await import("./privacy");
    const db = new FocusDB("brain-privacy");
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    await saveBrainTest({ kind: "stroop", takenAt: new Date(2026, 10, 21, 9).getTime(), score: 70, accuracy: 0.9 }, db);
    const file = JSON.parse(JSON.stringify(await exportData(db)));
    await deleteAllData(db);
    expect(await db.brainTests.count()).toBe(0);
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    await importData(file, db);
    expect((await db.brainTests.toArray())[0]).toMatchObject({ kind: "stroop", score: 70, accuracy: 0.9 });
    await db.delete();
  });
});
