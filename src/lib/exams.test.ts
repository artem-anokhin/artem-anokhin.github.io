import { describe, expect, it } from "vitest";
import { FocusDB } from "./db";
import { MAX_EXAMS, addExam, daysUntil, removeExam, sanitizeExams, upcomingExams } from "./exams";

describe("exams", () => {
  it("needs consent, validates, sorts and removes", async () => {
    const db = new FocusDB("exams-test");
    expect(await addExam("Матан", "2026-12-20", db, "2026-11-21")).toBeNull(); // no consent
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    expect(await addExam("  ", "2026-12-20", db, "2026-11-21")).toBeNull();
    expect(await addExam("Старый", "2026-11-20", db, "2026-11-21")).toBeNull();
    expect(await addExam("Матан", "2026-13-40", db, "2026-11-21")).toBeNull();
    const b = await addExam("Физика", "2026-12-25", db, "2026-11-21");
    const a = await addExam("  Матан  ", "2026-12-20", db, "2026-11-21");
    expect((await upcomingExams(db, "2026-11-21")).map((e) => e.title)).toEqual(["Матан", "Физика"]);
    expect(await upcomingExams(db, "2026-12-21")).toEqual([b]);
    await removeExam(a!.id, db);
    expect(await upcomingExams(db, "2026-11-21")).toEqual([b]);
    await db.delete();
  });

  it("caps the list and drops junk on import", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `e${i}`, title: `E${i}`, date: "2026-12-01" }));
    expect(sanitizeExams(many)).toHaveLength(MAX_EXAMS);
    expect(sanitizeExams([{ id: "x", title: "<b>", date: "bad" }, null, "s"])).toEqual([]);
  });

  it("counts calendar days", () => {
    expect(daysUntil("2026-11-21", "2026-11-21")).toBe(0);
    expect(daysUntil("2026-12-01", "2026-11-21")).toBe(10);
    expect(daysUntil("2027-03-29", "2027-03-27")).toBe(2); // across DST change in some zones
  });
});
