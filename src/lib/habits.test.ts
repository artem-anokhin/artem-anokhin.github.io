import { FocusDB } from "./db";
import { MAX_HABITS, activeHabits, addHabit, archiveHabit, doneInLastDays, habitDays, toggleHabit } from "./habits";

async function fresh(name: string) {
  const db = new FocusDB(name);
  await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
  return db;
}

describe("habits", () => {
  it("needs consent, trims, rejects duplicates and caps at 5", async () => {
    const db = new FocusDB("habits-1");
    expect(await addHabit("Вода", "caffeine", undefined, db)).toEqual({ ok: false, reason: "consent" });
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    const r = await addHabit("  Стакан   воды утром ", "caffeine", "water-morning", db);
    expect(r.ok && r.habit.title).toBe("Стакан воды утром");
    expect(await addHabit("стакан воды утром", "caffeine", undefined, db)).toEqual({ ok: false, reason: "duplicate" });
    expect(await addHabit("   ", "sleep", undefined, db)).toEqual({ ok: false, reason: "empty" });
    for (let i = 0; i < MAX_HABITS - 1; i++) await addHabit(`Привычка ${i}`, "rest", undefined, db, 10 + i);
    expect(await addHabit("Лишняя", "rest", undefined, db)).toEqual({ ok: false, reason: "limit" });
    await db.delete();
  });

  it("toggles marks per day and keeps history after archiving", async () => {
    const db = await fresh("habits-2");
    const r = await addHabit("Прогулка 10 минут", "activity", undefined, db);
    const id = r.ok ? r.habit.id! : -1;
    expect(await toggleHabit(id, "2026-11-20", db)).toBe(true);
    expect(await toggleHabit(id, "2026-11-21", db)).toBe(true);
    expect(await toggleHabit(id, "2026-11-21", db)).toBe(false);
    expect(await toggleHabit(id, "2026-11-21", db)).toBe(true);
    const logs = await db.habitLogs.toArray();
    expect(habitDays(logs).sort()).toEqual(["2026-11-20", "2026-11-21"]);
    expect(doneInLastDays(logs, id, "2026-11-21")).toBe(2);
    await archiveHabit(id, db);
    expect(await activeHabits(db)).toEqual([]);
    expect(await toggleHabit(id, "2026-11-22", db)).toBeNull();
    expect(await db.habitLogs.count()).toBe(2);
    await db.delete();
  });
});
