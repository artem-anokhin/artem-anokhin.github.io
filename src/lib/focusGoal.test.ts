import { describe, expect, it } from "vitest";
import { FocusDB } from "./db";
import { DEFAULT_GOAL, getFocusGoal, setFocusGoal } from "./focusGoal";

describe("focus goal", () => {
  it("defaults, needs consent and rejects odd values", async () => {
    const db = new FocusDB("goal-test");
    expect(await getFocusGoal(db)).toBe(DEFAULT_GOAL);
    expect(await setFocusGoal(50, db)).toBeNull();
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    expect(await setFocusGoal(33, db)).toBeNull();
    expect(await setFocusGoal(100, db)).toBe(100);
    expect(await getFocusGoal(db)).toBe(100);
    await db.delete();
  });
});
