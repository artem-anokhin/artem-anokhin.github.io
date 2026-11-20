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
