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
