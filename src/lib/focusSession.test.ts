import { FocusDB } from "./db";
import { TASK_MAX, cancelSession, cleanTask, finishSession, getActiveSession, markAway, minutesByDay, minutesByTask, feelByLength, parseTogether, rateSession, togetherLink, recentTasks, remainingMs, startSession } from "./focusSession";

const T0 = new Date(2026, 10, 21, 10, 0).getTime();

describe("focus session", () => {
  it("needs consent, survives reload, saves only when time is up", async () => {
    const db = new FocusDB("session-test");
    expect(await startSession(25, db, T0)).toBeNull();
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    const a = await startSession(25, db, T0);
    expect(a).toEqual({ startedAt: T0, minutes: 25, away: 0 });
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
    expect(await startSession(50, db, late + 1000)).toEqual({ startedAt: late, minutes: 25, away: 0 });
    const row = await finishSession(db, late + 30 * 60_000);
    expect(row?.date).toBe("2026-11-21");
    expect(await finishSession(db, late + 31 * 60_000)).toBeNull();
    expect(await db.sessions.count()).toBe(1);
    await db.delete();
  });
});

describe("task label and away count", () => {
  it("stores a cleaned task and counts leaving the app", async () => {
    const db = new FocusDB("session-test-4");
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    const t = new Date(2026, 10, 21, 10, 0).getTime();
    await startSession(15, db, t, "  Курсовая   глава 2 ");
    await markAway(db, t + 60_000);
    await markAway(db, t + 120_000);
    await markAway(db, t + 16 * 60_000); // after time is up: not counted
    const row = await finishSession(db, t + 16 * 60_000);
    expect(row).toMatchObject({ task: "Курсовая глава 2", away: 2, minutes: 15 });
    await db.delete();
  });

  it("cleans, dedupes and groups tasks", () => {
    expect(cleanTask("   ")).toBeUndefined();
    expect(cleanTask("x".repeat(80))?.length).toBe(TASK_MAX);
    const s = [
      { date: "d", startedAt: 1, minutes: 25, task: "Матан" },
      { date: "d", startedAt: 2, minutes: 50, task: "матан" },
      { date: "d", startedAt: 3, minutes: 15 },
      { date: "d", startedAt: 4, minutes: 25, task: "Английский" },
    ];
    expect(recentTasks(s)).toEqual(["Английский", "матан"]);
    expect(minutesByTask(s)).toEqual([
      { task: "Матан", minutes: 75, count: 2 },
      { task: "Английский", minutes: 25, count: 1 },
      { task: "Без названия", minutes: 15, count: 1 },
    ]);
  });
});

describe("session rating", () => {
  it("saves a 1–3 feel on a finished session", async () => {
    const db = new FocusDB("session-test-5");
    const id = (await db.sessions.add({ date: "2026-11-21", startedAt: 1, minutes: 25 }))!;
    expect(await rateSession(id, 3, db)).toBe(true);
    expect(await rateSession(id, 7, db)).toBe(false);
    expect(await rateSession(999, 2, db)).toBe(false);
    expect(await rateSession(0, 2, db)).toBe(false);
    expect((await db.sessions.get(id))?.feel).toBe(3);
    await db.delete();
  });
});

describe("feel by length", () => {
  it("averages ratings per length with a minimum count", () => {
    const s = [
      ...[3, 3, 2].map((feel) => ({ minutes: 25, feel: feel as 1 | 2 | 3 })),
      ...[1, 2].map((feel) => ({ minutes: 50, feel: feel as 1 | 2 | 3 })),
      { minutes: 50 },
    ];
    const r = feelByLength(s);
    expect(r.find((x) => x.minutes === 25)).toMatchObject({ rated: 3, avg: 8 / 3 });
    expect(r.find((x) => x.minutes === 50)).toMatchObject({ rated: 2, avg: null });
  });
});

describe("study together link", () => {
  it("round-trips and rejects late, future or junk links", () => {
    const now = 1_800_000_000_000;
    const link = togetherLink("https://x.kz", { startedAt: now - 60_000, minutes: 25 });
    expect(link).toBe(`https://x.kz/focus/?together=${now - 60_000}&m=25`);
    expect(parseTogether(new URL(link).search, now)).toEqual({ ok: true, startedAt: now - 60_000, minutes: 25 });
    expect(parseTogether(`?together=${now - 10 * 60_000}&m=25`, now)).toEqual({ ok: false, reason: "late" });
    expect(parseTogether(`?together=${now + 5 * 60_000}&m=25`, now)).toEqual({ ok: false, reason: "future" });
    expect(parseTogether(`?together=${now}&m=33`, now)).toBeNull();
    expect(parseTogether(`?together=abc&m=25`, now)).toBeNull();
    expect(parseTogether("", now)).toBeNull();
  });
});
