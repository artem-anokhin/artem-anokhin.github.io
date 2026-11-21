import { describe, expect, it } from "vitest";
import { emptyCheckIn } from "./checkin";
import { awayDays, daysBetween, memory, weekTags } from "./homeExtras";

const ci = (date: string, patch = {}) => ({ ...emptyCheckIn(), date, createdAt: 1, updatedAt: 1, ...patch });

describe("home extras", () => {
  it("counts calendar days and away gaps", () => {
    expect(daysBetween("2026-11-01", "2026-11-22")).toBe(21);
    expect(awayDays(["2026-11-18"], "2026-11-22")).toBe(4);
    expect(awayDays(["2026-11-20"], "2026-11-22")).toBeNull();
    expect(awayDays(["2026-11-10", "2026-11-22"], "2026-11-22")).toBeNull();
    expect(awayDays([], "2026-11-22")).toBeNull();
  });

  it("top week tags across spheres, last 7 days only", () => {
    const rows = [
      ci("2026-11-22", { activity: { level: "medium", note: "", kinds: ["swim"] } }),
      ci("2026-11-20", { activity: { level: "medium", note: "", kinds: ["swim"] }, rest: { type: "hobby", kinds: ["manga"] } }),
      ci("2026-11-10", { rest: { type: "hobby", kinds: ["movie"] } }),
    ];
    expect(weekTags(rows, "2026-11-22").map((t) => [t.label, t.count])).toEqual([
      ["Плавание", 2],
      ["Манга, комиксы", 1],
    ]);
  });

  it("memory prefers the oldest anniversary and skips empty notes", () => {
    const key = (t: number) => new Date(t).toISOString().slice(0, 10);
    const at = (d: string) => new Date(`${d}T10:00:00Z`).getTime();
    expect(memory([{ text: "Сдал лабу!", createdAt: at("2026-11-15") }], [], "2026-11-22", key)).toEqual({ label: "Неделю назад", text: "Сдал лабу!" });
    expect(memory([], [ci("2026-10-23", { note: "Первый день" })], "2026-11-22", key)).toEqual({ label: "Месяц назад", text: "Первый день" });
    expect(memory([{ text: "  ", createdAt: at("2026-11-15") }], [], "2026-11-22", key)).toBeNull();
  });
});

describe("weekEcho", () => {
  it("names a today tag that repeats ≥3 times this week", async () => {
    const { weekEcho } = await import("./homeExtras");
    const swim = (date: string) => ci(date, { activity: { level: "medium", note: "", kinds: ["swim"] } });
    const rows = [swim("2026-11-18"), swim("2026-11-20"), swim("2026-11-22")];
    expect(weekEcho(rows[2]!, rows)).toBe("🏊 Плавание — 3-й раз за неделю");
    expect(weekEcho(ci("2026-11-22"), rows)).toBeNull();
  });
});

describe("weekEcho window", () => {
  it("a tag 7 days ago does not count", async () => {
    const { weekEcho } = await import("./homeExtras");
    const swim = (date: string) => ci(date, { activity: { level: "medium", note: "", kinds: ["swim"] } });
    const rows = [swim("2026-11-15"), swim("2026-11-20"), swim("2026-11-22")];
    expect(weekEcho(rows[2]!, rows)).toBeNull();
  });
});
