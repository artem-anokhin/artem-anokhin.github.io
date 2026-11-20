import { FocusDB } from "./db";
import { cancelSession, finishSession, getActiveSession, minutesByDay, remainingMs, startSession } from "./focusSession";

const T0 = new Date(2026, 10, 21, 10, 0).getTime();

describe("focus session", () => {
  it("needs consent, survives reload, saves only when time is up", async () => {
    const db = new FocusDB("session-test");
    expect(await startSession(25, db, T0)).toBeNull();
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    const a = await startSession(25, db, T0);
    expect(a).toEqual({ startedAt: T0, minutes: 25 });
    expect(await getActiveSession(db)).toEqual(a);
    expect(remainingMs(a!, T0 + 60_000)).toBe(24 * 60_000);
    expect(await finishSession(db, T0 + 10 * 60_000)).toBeNull();
    const row = await finishSession(db, T0 + 25 * 60_000);
    expect(row).toMatchObject({ date: "2026-11-21", minutes: 25 });
    expect(await getActiveSession(db)).toBeNull();
    await startSession(50, db, T0);
    await cancelSession(db);
    expect(await db.sessions.count()).toBe(1);
    await db.delete();
  });

  it("rejects unknown lengths and sums minutes per day", async () => {
    const db = new FocusDB("session-test-2");
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    expect(await startSession(7 as never, db, T0)).toBeNull();
    expect(minutesByDay([{ date: "d", startedAt: 1, minutes: 25 }, { date: "d", startedAt: 2, minutes: 50 }]).get("d")).toBe(75);
    await db.delete();
  });
});

describe("focus session edge cases", () => {
  it("finishes once, dates by start day, keeps a running session", async () => {
    const db = new FocusDB("session-test-3");
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    const late = new Date(2026, 10, 21, 23, 50).getTime();
    await startSession(25, db, late);
    expect(await startSession(50, db, late + 1000)).toEqual({ startedAt: late, minutes: 25 });
    const row = await finishSession(db, late + 30 * 60_000);
    expect(row?.date).toBe("2026-11-21");
    expect(await finishSession(db, late + 31 * 60_000)).toBeNull();
    expect(await db.sessions.count()).toBe(1);
    await db.delete();
  });
});
