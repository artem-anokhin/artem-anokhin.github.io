import { afterEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { exportData, importData } from "./privacy";
import { completeOnboarding, getStart, sanitizeStart, saveStart, sessionFor, startDay, startPlan } from "./start";

afterEach(async () => {
  await db.settings.clear();
});

describe("start plan", () => {
  it("builds three points: blocker, goal, common check-in; each sourced or a feature", () => {
    const p = startPlan({ goal: "thesis", blocker: "start" });
    expect(p.map((x) => x.title)).toEqual(["Начинайте с 15 минут", "Разбейте работу на шаги", "Чек-ин 30 секунд в день"]);
    expect(p[0]!.card).toBe("if-then");
    expect(p[1]!.card).toBe("woop");
  });

  it("suggests session length by answers", () => {
    expect(sessionFor({ goal: "work", blocker: "start" })).toBe(15);
    expect(sessionFor({ goal: "work", blocker: "phone" })).toBe(50);
    expect(sessionFor({ goal: "exams", blocker: "stress" })).toBe(25);
  });

  it("counts the start week in calendar days", () => {
    const at = new Date(2026, 10, 20, 23, 50).getTime();
    expect(startDay(at, "2026-11-20")).toBe(1);
    expect(startDay(at, "2026-11-21")).toBe(2);
    expect(startDay(at, "2026-11-26")).toBe(7);
    expect(startDay(at, "2026-11-27")).toBeNull();
  });

  it("sanitises: bad enums, score range, tree name control chars and length", () => {
    expect(sanitizeStart({ goal: "x", blocker: "phone", score: 1 })).toBeNull();
    expect(sanitizeStart({ goal: "daily", blocker: "phone", score: 101 })).toBeNull();
    expect(sanitizeStart({ goal: "daily", blocker: "phone", score: null, treeName: " Дуб\u0007" + "я".repeat(40) })!.treeName).toHaveLength(24);
    expect(sanitizeStart({ goal: "daily", blocker: "phone", score: 70.4, treeName: "  " })).toEqual({ goal: "daily", blocker: "phone", score: 70 });
  });

  it("strips bidi/zero-width chars and never splits an emoji", () => {
    expect(sanitizeStart({ goal: "daily", blocker: "phone", score: null, treeName: "\u202eДуб\u200b" })!.treeName).toBe("Дуб");
    expect(Array.from(sanitizeStart({ goal: "daily", blocker: "phone", score: null, treeName: "🌳".repeat(30) })!.treeName!)).toHaveLength(24);
  });

  it("completeOnboarding writes profile and answers together", async () => {
    const p = await completeOnboarding({ goal: "work", blocker: "phone", score: 50 }, true, db, 5);
    expect(p).toEqual({ mode: "work", consentAt: 5 });
    expect(await getStart()).toEqual({ goal: "work", blocker: "phone", score: 50 });
  });

  it("stores only after consent and survives export → import", async () => {
    expect(await saveStart({ goal: "exams", blocker: "tired", score: 64 })).toBeNull();
    expect(await getStart()).toBeNull();
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    await saveStart({ goal: "exams", blocker: "tired", score: 64, treeName: "Дуб" });
    const file = await exportData();
    await db.settings.clear();
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    await importData(JSON.parse(JSON.stringify(file)));
    expect(await getStart()).toEqual({ goal: "exams", blocker: "tired", score: 64, treeName: "Дуб" });
  });
});
