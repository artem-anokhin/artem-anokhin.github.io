import { FocusDB } from "./db";
import { getProfile, saveProfile } from "./settings";

describe("profile", () => {
  it("is null before onboarding and saved after consent", async () => {
    const db = new FocusDB("test-settings");
    expect(await getProfile(db)).toBeNull();
    await saveProfile("work", true, db, 42);
    expect(await getProfile(db)).toEqual({ mode: "work", consentAt: 42 });
    await db.delete();
  });
  it("ignores a malformed row", async () => {
    const db = new FocusDB("test-settings-bad");
    await db.settings.put({ key: "profile", value: { mode: "x" } });
    expect(await getProfile(db)).toBeNull();
    await db.delete();
  });
});

describe("experiment", () => {
  it("needs consent, validates, and can be ended", async () => {
    const { FocusDB } = await import("./db");
    const { endExperiment, getExperiment, saveProfile, startExperiment } = await import("./settings");
    const db = new FocusDB("test-experiment");
    const e = { metric: "sleepHours", tip: "sleepShort", start: "2026-11-20" };
    expect(await startExperiment(e, db)).toBeNull();
    await saveProfile("study", true, db, 1);
    expect(await startExperiment({ ...e, start: "20.11.2026" }, db)).toBeNull();
    expect(await startExperiment(e, db)).toEqual(e);
    expect(await getExperiment(db)).toEqual(e);
    await endExperiment(db);
    expect(await getExperiment(db)).toBeNull();
    db.close();
    await db.delete();
  });
});

describe("experiment history", () => {
  it("records the finished window, capped at 7 days", async () => {
    const { FocusDB } = await import("./db");
    const { endExperiment, getExperimentHistory, saveProfile, startExperiment } = await import("./settings");
    const db = new FocusDB("test-exp-history");
    await saveProfile("study", true, db, 1);
    await startExperiment({ metric: "sleepHours", tip: "sleepShort", start: "2026-11-01" }, db);
    await endExperiment(db, "2026-11-20");
    await startExperiment({ metric: "stress", tip: "highStress", start: "2026-11-20" }, db);
    await endExperiment(db, "2026-11-22");
    expect(await getExperimentHistory(db)).toEqual([
      { start: "2026-11-01", end: "2026-11-07" },
      { start: "2026-11-20", end: "2026-11-22" },
    ]);
    db.close();
    await db.delete();
  });
});

describe("updateMode", () => {
  it("keeps consentAt and refuses without a profile", async () => {
    const { FocusDB } = await import("./db");
    const { updateMode, saveProfile } = await import("./settings");
    const d = new FocusDB("update-mode");
    expect(await updateMode("work", d)).toBeNull();
    expect(await d.settings.count()).toBe(0);
    await saveProfile("study", true, d, 5);
    expect(await updateMode("work", d)).toEqual({ mode: "work", consentAt: 5 });
    await d.delete();
  });
});
