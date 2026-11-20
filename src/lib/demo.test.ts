import { FocusDB } from "./db";
import { buildDemo, clearDemo, isDemo, loadDemo, DEMO_DAYS } from "./demo";
import { sanitizeCheckIn } from "./checkin";

const today = new Date(2026, 10, 21, 12);

describe("demo data", () => {
  it("builds 21 valid days ending yesterday, deterministic", () => {
    const a = buildDemo(today);
    expect(a.checkins).toHaveLength(DEMO_DAYS);
    expect(a.checkins.at(-1)?.date).toBe("2026-11-20");
    expect(a.checkins[0]?.date).toBe("2026-10-31");
    for (const c of a.checkins) expect(sanitizeCheckIn(c)).toMatchObject({ sleep: c.sleep, mind: c.mind });
    expect(a.tests.every((t) => t.score >= 0 && t.score <= 100)).toBe(true);
    expect(buildDemo(today)).toEqual(a);
  });

  it("loads only into an empty consented app and can be cleared", async () => {
    const db = new FocusDB("demo-test");
    expect(await loadDemo(db, today)).toBe(false); // no consent
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    expect(await loadDemo(db, today)).toBe(true);
    expect(await isDemo(db)).toBe(true);
    expect(await db.checkins.count()).toBe(DEMO_DAYS);
    expect(await loadDemo(db, today)).toBe(false); // data exists
    // A real check-in and test made while the demo is shown must survive clearing.
    await db.checkins.put({ ...(await db.checkins.toCollection().first())!, date: "2026-11-21", demo: undefined });
    await db.focusTests.add({ date: "2026-11-21", takenAt: 2, score: 60 });
    await clearDemo(db);
    expect(await isDemo(db)).toBe(false);
    expect((await db.checkins.toArray()).map((c) => c.date)).toEqual(["2026-11-21"]);
    expect(await db.focusTests.count()).toBe(1);
    expect(await db.settings.get("profile")).toBeTruthy();
    await db.delete();
  });
});

it("does not load demo over existing habits", async () => {
  const db = new FocusDB("demo-habits");
  await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
  await db.habits.add({ title: "Моя", sphere: "rest", createdAt: 1, archived: 0 });
  expect(await loadDemo(db, today)).toBe(false);
  expect(await db.habits.count()).toBe(1);
  await db.delete();
});
