import { describe, expect, it } from "vitest";
import { FocusDB } from "./db";
import { MAX_GOALS, addGoal, addStep, countGoalsDone, goalProgress, listGoals, sanitizeGoal, setGoalDone, toggleStep } from "./goals";
import { saveNote, listNotes, sanitizeNote, NOTE_MAX } from "./notes";
import { deleteAllData, exportData, importData } from "./privacy";

const consent = (db: FocusDB) => db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
const NOW = new Date(2026, 10, 21, 12).getTime();

describe("goals", () => {
  it("needs consent, validates, tracks steps and completion", async () => {
    const db = new FocusDB("goals-test");
    expect(await addGoal({ title: "Матан" }, db, NOW)).toEqual({ ok: false, reason: "consent" });
    await consent(db);
    expect(await addGoal({ title: "  " }, db, NOW)).toEqual({ ok: false, reason: "invalid" });
    expect(await addGoal({ title: "Старое", due: "2026-11-01" }, db, NOW)).toEqual({ ok: false, reason: "invalid" });
    const r = await addGoal({ title: "Сдать матан", due: "2026-12-20", steps: ["Конспект", " ", "Задачи"] }, db, NOW);
    expect(r.ok && r.goal.steps).toEqual([{ text: "Конспект", done: false }, { text: "Задачи", done: false }]);
    const id = r.ok ? r.goal.id! : -1;
    await toggleStep(id, 0, db);
    await addStep(id, "Консультация", db);
    const g = (await listGoals(db))[0]!;
    expect(goalProgress(g)).toBeCloseTo(1 / 3);
    await setGoalDone(id, true, db, NOW);
    expect(await countGoalsDone(db)).toBe(1);
    for (let i = 0; i < MAX_GOALS; i++) await addGoal({ title: `G${i}` }, db, NOW);
    expect(await addGoal({ title: "Лишняя" }, db, NOW)).toEqual({ ok: false, reason: "full" });
    await db.delete();
  });

  it("sanitizes imported goals and notes", () => {
    expect(sanitizeGoal({ title: "x".repeat(200), steps: [{ text: "a", done: true }, { text: 5 }], done: 1, due: "2026-02-30" })).toMatchObject({
      title: "x".repeat(60),
      steps: [{ text: "a", done: true }],
      done: 1,
    });
    expect(sanitizeGoal({ title: "" })).toBeNull();
    expect(sanitizeNote({ text: "a".repeat(NOTE_MAX + 50), createdAt: 5 })?.text.length).toBe(NOTE_MAX);
    expect(sanitizeNote({ text: "hi", createdAt: "x" })).toBeNull();
  });
});

describe("notes + privacy", () => {
  it("saves, edits, exports, re-imports and deletes notes and goals", async () => {
    const db = new FocusDB("notes-test");
    expect(await saveNote("нет согласия", undefined, db)).toBeNull();
    await consent(db);
    const n = await saveNote("  Идея для курсовой ", undefined, db, NOW);
    await saveNote("Идея для курсовой v2", n!.id, db, NOW + 1);
    expect((await listNotes(db)).map((x) => x.text)).toEqual(["Идея для курсовой v2"]);
    await addGoal({ title: "Цель" }, db, NOW);
    const file = await exportData(db);
    await deleteAllData(db);
    expect(await db.notes.count()).toBe(0);
    expect(await db.goals.count()).toBe(0);
    await consent(db);
    await importData(JSON.parse(JSON.stringify(file)), db);
    expect(await db.notes.count()).toBe(1);
    expect(await db.goals.count()).toBe(1);
    await db.delete();
  });
});

describe("woop plan", () => {
  it("keeps a long «Если…, то…» plan whole", () => {
    const plan = `Если ${"а".repeat(130)}, то ${"б".repeat(130)}`;
    expect(sanitizeGoal({ title: "Цель", plan })?.plan).toBe(plan);
  });
});

describe("openSteps", () => {
  it("offers the next undone step of each active goal", async () => {
    const { openSteps } = await import("./goals");
    const g = (id: number, done: 0 | 1, steps: [string, boolean][]) => ({ id, title: `G${id}`, done, createdAt: 1, steps: steps.map(([text, d]) => ({ text, done: d })) });
    expect(
      openSteps([g(1, 0, [["a", true], ["b", false]]), g(2, 1, [["c", false]]), g(3, 0, [["d", true]]), g(4, 0, [["e", false]])]),
    ).toEqual([
      { goalId: 1, index: 1, text: "b", goal: "G1" },
      { goalId: 4, index: 0, text: "e", goal: "G4" },
    ]);
  });
});
