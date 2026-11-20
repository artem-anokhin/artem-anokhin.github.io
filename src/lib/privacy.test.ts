import { FocusDB } from "./db";
import { deleteAllData, exportData, exportFileName } from "./privacy";

async function seeded(name: string) {
  const db = new FocusDB(name);
  await db.settings.bulkPut([
    { key: "profile", value: { mode: "study", consentAt: 1 } },
    { key: "experiment", value: { metric: "sleep", tip: "x", start: "2026-11-01" } },
    { key: "experimentHistory", value: [{ start: "2026-10-01", end: "2026-10-07" }] },
  ]);
  await db.checkins.put({ date: "2026-11-20", createdAt: 1, updatedAt: 1, note: "n" } as never);
  await db.focusTests.add({ date: "2026-11-20", takenAt: 1, score: 70 });
  return db;
}

describe("privacy", () => {
  it("exports every table including all settings", async () => {
    const db = await seeded("privacy-export");
    const out = await exportData(db, new Date("2026-11-21T10:00:00Z"));
    expect(out.format).toBe("focusai-export");
    expect(out.exportedAt).toBe("2026-11-21T10:00:00.000Z");
    expect(out.checkins).toHaveLength(1);
    expect(out.focusTests).toHaveLength(1);
    expect((out.settings as { key: string }[]).map((s) => s.key).sort()).toEqual([
      "experiment",
      "experimentHistory",
      "profile",
    ]);
    await db.delete();
  });

  it("deletes all data", async () => {
    const db = await seeded("privacy-delete");
    await deleteAllData(db);
    expect(await db.checkins.count()).toBe(0);
    expect(await db.focusTests.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
    await db.delete();
  });

  it("names the file by local date", () => {
    expect(exportFileName(new Date(2026, 0, 5))).toBe("focusai-2026-01-05.json");
  });
});
