import { FocusDB, dayKey } from "./db";

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
    await db.checkins.put({ date: "2026-11-20", createdAt: 1, updatedAt: 1 });
    await db.checkins.put({ date: "2026-11-20", createdAt: 1, updatedAt: 2 });
    expect(await db.checkins.count()).toBe(1);
    expect((await db.checkins.get("2026-11-20"))?.updatedAt).toBe(2);
    await db.delete();
  });
});
