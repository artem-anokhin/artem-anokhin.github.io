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

describe("importData", () => {
  it("round-trips an export and keeps the current consent", async () => {
    const src = await seeded("privacy-import-src");
    const { emptyCheckIn } = await import("./checkin");
    await src.checkins.put({ ...emptyCheckIn(), date: "2026-11-19", createdAt: 1, updatedAt: 1 });
    const file = JSON.parse(JSON.stringify(await exportData(src)));
    const { importData } = await import("./privacy");
    const dst = new FocusDB("privacy-import-dst");
    expect(await importData(file, dst)).toBeNull(); // no consent on target
    await dst.settings.put({ key: "profile", value: { mode: "work", consentAt: 99 } });
    const res = await importData(file, dst);
    expect(res).toEqual({ checkins: 1, focusTests: 1, skipped: 1 }) // seeded stub row is incomplete;
    expect((await dst.settings.get("profile"))?.value).toEqual({ mode: "study", consentAt: 99 });
    expect((await dst.settings.get("experimentHistory"))?.value).toHaveLength(1);
    await src.delete();
    await dst.delete();
  });

  it("rejects foreign files and skips broken rows", async () => {
    const { importData } = await import("./privacy");
    const dst = new FocusDB("privacy-import-bad");
    await dst.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    expect(await importData({ hello: 1 }, dst)).toBeNull();
    const res = await importData(
      { format: "focusai-export", version: 1, checkins: [{ date: "bad" }, null], focusTests: [{ date: "2026-11-20", takenAt: 1, score: 500 }, { date: "2026-02-30", takenAt: 1, score: 50 }, { date: "2026-11-20", takenAt: 1, score: 50, medianRt: 0 }], settings: [{ key: "profile", value: { mode: "x" } }] },
      dst,
    );
    expect(res).toEqual({ checkins: 0, focusTests: 0, skipped: 5 });
    expect((await dst.settings.get("profile"))?.value).toEqual({ mode: "study", consentAt: 1 });
    await dst.delete();
  });
});
