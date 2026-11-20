import { describe, expect, it } from "vitest";
import { FocusDB } from "./db";
import { saveFocusTest } from "./focusResults";
import { summarize } from "./focusTest";
import { saveProfile } from "./settings";

const now = new Date(2026, 10, 20, 10).getTime();

describe("saveFocusTest", () => {
  it("stores nothing without a consented profile", async () => {
    const db = new FocusDB("test-focus-noconsent");
    expect(await saveFocusTest(summarize(Array(20).fill(250), 0), now, db)).toBeNull();
    expect(await db.focusTests.count()).toBe(0);
    db.close();
    await db.delete();
  });

  it("stores a scored test with details and rejects unscored or invalid ones", async () => {
    const db = new FocusDB("test-focus");
    await saveProfile("study", true, db, now);
    const row = await saveFocusTest(summarize(Array(20).fill(250), 1), now, db);
    expect(row?.date).toBe("2026-11-20");
    expect(await db.focusTests.get(row!.id!)).toMatchObject({ score: row!.score, medianRt: 250, falseStarts: 1, trials: 20 });
    expect(await saveFocusTest(summarize([250], 0), now, db)).toBeNull();
    const good = summarize(Array(20).fill(250), 0);
    expect(await saveFocusTest({ ...good, score: 101 }, now, db)).toBeNull();
    expect(await saveFocusTest({ ...good, medianRt: NaN }, now, db)).toBeNull();
    expect(await saveFocusTest({ ...good, lapses: -1 }, now, db)).toBeNull();
    expect(await db.focusTests.count()).toBe(1);
    db.close();
    await db.delete();
  });
});
