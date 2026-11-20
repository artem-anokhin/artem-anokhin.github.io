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
