import { describe, expect, it } from "vitest";
import { STAGE_AT, daysBetween, stageFor, treeMessages, treeState } from "./tree";

const t = (date: string, score = 60, takenAt = 1) => ({ date, takenAt, score });
const base = { checkinDates: [] as string[], tests: [] as ReturnType<typeof t>[], experiment: null, today: "2026-11-20" };

describe("stages", () => {
  it("maps drops to 5 stages", () => {
    expect(STAGE_AT.map(stageFor)).toEqual([0, 1, 2, 3, 4]);
    expect(stageFor(5)).toBe(0);
    expect(stageFor(1000)).toBe(4);
  });
  it("counts days across DST", () => {
    expect(daysBetween("2026-10-20", "2026-11-02")).toBe(13);
  });
});

describe("treeState", () => {
  it("starts as a seed with no activity", () => {
    const s = treeState(base);
    expect(s).toMatchObject({ drops: 0, stage: 0, stageName: "семя", silentDays: null, wilting: false });
    expect(treeMessages(s)[0]?.text).toMatch(/первое семечко/);
  });

  it("gives one drop per check-in day and per test day (retakes do not add)", () => {
    const s = treeState({ ...base, checkinDates: ["2026-11-19", "2026-11-20"], tests: [t("2026-11-20"), t("2026-11-20", 70, 2)] });
    expect(s.drops).toBe(3);
  });

  it("adds an experiment drop for check-ins inside the 7-day window only", () => {
    const s = treeState({
      ...base,
      checkinDates: ["2026-11-13", "2026-11-14", "2026-11-20", "2026-11-21"],
      experiment: { start: "2026-11-14" },
    });
    // 3 check-ins up to today; 11-14 and 11-20 are inside [11-14, 11-20]
    expect(s.drops).toBe(5);
  });

  it("shows progress inside a stage and caps at bloom", () => {
    const days = Array.from({ length: 9 }, (_, i) => `2026-11-${String(10 + i).padStart(2, "0")}`);
    const s = treeState({ ...base, checkinDates: days });
    expect(s.stage).toBe(1);
    expect(s.progress).toBeCloseTo(3 / 12);
    const many = Array.from({ length: 60 }, (_, i) => `2026-0${1 + Math.floor(i / 28)}-${String(1 + (i % 28)).padStart(2, "0")}`);
    const full = treeState({ ...base, checkinDates: many });
    expect(full.stageName).toBe("цветёт");
    expect(full).toMatchObject({ nextAt: null, progress: 1 });
  });

  it("does not punish one missed day and wilts only after 3 silent days", () => {
    const at = (today: string) => treeState({ ...base, checkinDates: ["2026-11-16"], today });
    expect(at("2026-11-18").wilting).toBe(false); // 17 silent (silentDays 2)
    expect(at("2026-11-19").wilting).toBe(false); // 17, 18 silent (silentDays 3)
    expect(at("2026-11-20").wilting).toBe(true); // 17, 18, 19 silent
    expect(at("2026-11-20").drops).toBe(1); // drops are kept
    const msgs = treeMessages(at("2026-11-20"));
    expect(msgs[0]?.text).toMatch(/капли на месте/);
    expect(msgs[1]?.source?.name).toMatch(/Lally/);
  });

  it("builds week facts and messages from real data only", () => {
    const s = treeState({
      ...base,
      checkinDates: ["2026-11-18", "2026-11-20", "2026-11-01"],
      tests: [t("2026-11-18", 72), t("2026-11-19", 65), t("2026-11-02", 99)],
    });
    expect(s.week).toEqual({ checkins: 2, tests: 2, sessions: 0, best: { score: 72, date: "2026-11-18" } });
    expect(treeMessages(s).map((m) => m.text)).toEqual([
      "За 7 дней чек-инов: 2, тестов: 2.",
      "Лучший Focus Score недели — 72, в среду.",
    ]);
  });

  it("ignores future-dated rows", () => {
    expect(treeState({ ...base, checkinDates: ["2026-11-25"] }).drops).toBe(0);
  });
});

describe("missed-day message", () => {
  it("appears only after exactly one missed day", () => {
    const at = (today: string) => treeMessages(treeState({ ...base, checkinDates: ["2026-11-18"], today }));
    expect(at("2026-11-19").some((m) => m.source)).toBe(false);
    expect(at("2026-11-20")[0]?.text).toMatch(/^Один пропущенный день/);
    expect(at("2026-11-21").some((m) => m.source)).toBe(false);
  });
});

describe("review follow-ups", () => {
  it("excludes check-ins after the 7-day experiment window", () => {
    const s = treeState({ ...base, checkinDates: ["2026-11-20", "2026-11-21"], experiment: { start: "2026-11-14" }, today: "2026-11-25" });
    expect(s.drops).toBe(3); // 2 check-ins + 1 experiment drop (11-20 only)
  });
  it("keeps drops from finished experiments", () => {
    const s = treeState({ ...base, checkinDates: ["2026-11-02", "2026-11-03"], pastExperiments: [{ start: "2026-11-01", end: "2026-11-02" }] });
    expect(s.drops).toBe(3);
  });
  it("gives at most 3 drops a day, even with overlapping windows", () => {
    const s = treeState({
      ...base,
      checkinDates: ["2026-11-20"],
      tests: [t("2026-11-20")],
      experiment: { start: "2026-11-18" },
      pastExperiments: [{ start: "2026-11-19", end: "2026-11-20" }],
    });
    expect(s.drops).toBe(3);
  });
  it("uses the last 7 days including today for week facts", () => {
    const s = treeState({ ...base, checkinDates: ["2026-11-13", "2026-11-14"] });
    expect(s.week.checkins).toBe(1);
  });
  it("counts a test alone as activity and recovers from wilting", () => {
    expect(treeState({ ...base, tests: [t("2026-11-19")] }).silentDays).toBe(1);
    const s = treeState({ ...base, checkinDates: ["2026-11-10", "2026-11-20"] });
    expect(s.wilting).toBe(false);
  });
});

describe("focus sessions water the tree", () => {
  it("adds one drop per day with a session and counts as activity", () => {
    const s = treeState({ checkinDates: [], tests: [], experiment: null, sessionDates: ["2026-11-20", "2026-11-20", "2026-11-21"], today: "2026-11-21" });
    expect(s.drops).toBe(2);
    expect(s.silentDays).toBe(0);
    expect(s.week.sessions).toBe(2);
  });
});

describe("habits water the tree", () => {
  it("adds one drop per day with a habit, separate from the check-in drop", () => {
    const s = treeState({ checkinDates: ["2026-11-21"], tests: [], experiment: null, habitDates: ["2026-11-21", "2026-11-21", "2026-11-20"], today: "2026-11-21" });
    expect(s.drops).toBe(3);
  });
});
