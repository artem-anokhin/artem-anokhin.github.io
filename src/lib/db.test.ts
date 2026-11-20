import { FocusDB, dayKey, saveCheckIn } from "./db";
import { emptyCheckIn } from "./checkin";

describe("dayKey", () => {
  it("formats local date as YYYY-MM-DD", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 0, 5, 0, 0))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });
});

describe("FocusDB", () => {
  it("stores one check-in per day (upsert by date)", async () => {
    const db = new FocusDB("test-db");
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    await saveCheckIn(emptyCheckIn(), "2026-11-20", db, 1);
    const edited = { ...emptyCheckIn(), note: "  второй раз  " };
    await saveCheckIn(edited, "2026-11-20", db, 2);
    expect(await db.checkins.count()).toBe(1);
    const row = await db.checkins.get("2026-11-20");
    expect(row?.createdAt).toBe(1);
    expect(row?.updatedAt).toBe(2);
    expect(row?.note).toBe("второй раз");
    await db.delete();
  });
});

it("stores nothing without consent", async () => {
  const db = new FocusDB("test-db-noconsent");
  expect(await saveCheckIn(emptyCheckIn(), "2026-11-20", db, 1)).toBeNull();
  expect(await db.checkins.count()).toBe(0);
  await db.delete();
});

it("upgrades a v1 database to v2 keeping data and adding sessions", async () => {
  const { default: Dexie } = await import("dexie");
  const old = new Dexie("upgrade-test");
  old.version(1).stores({ checkins: "&date", focusTests: "++id, date", settings: "&key" });
  await old.open();
  await old.table("focusTests").add({ date: "2026-11-01", takenAt: 1, score: 50 });
  old.close();
  const db = new FocusDB("upgrade-test");
  expect(await db.focusTests.count()).toBe(1);
  expect(await db.sessions.count()).toBe(0);
  await db.delete();
});
