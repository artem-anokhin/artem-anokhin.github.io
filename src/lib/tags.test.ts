import { describe, expect, it } from "vitest";
import { emptyCheckIn, sanitizeCheckIn, type CheckInData } from "./checkin";
import { cleanCustom, customText, recentCustom, tagCounts, tagEffects, tagLabels, tagsFor, withoutTags } from "./tags";

const day = (patch: Partial<CheckInData>): CheckInData => ({ ...emptyCheckIn(), ...patch });

describe("check-in tags", () => {
  it("sanitises: unknown ids dropped, duplicates removed, custom cleaned and capped", () => {
    const d = sanitizeCheckIn(
      day({
        rest: { type: "hobby", kinds: ["manga", "manga", "hack", 5 as unknown as string], custom: [" плавание​ с братом ", "ПЛАВАНИЕ С БРАТОМ", "", "a", "b", "c", "d", "e"] },
      }),
    );
    expect(d.rest.kinds).toEqual(["manga"]);
    expect(d.rest.custom).toEqual(["Плавание с братом", "A", "B", "C", "D"]);
    expect(sanitizeCheckIn(day({})).rest).toEqual({ type: "none" });
  });

  it("cleanCustom trims to 24 code points without splitting emoji", () => {
    expect(cleanCustom("🏊".repeat(30))).toHaveLength(48);
    expect(cleanCustom("   ")).toBeNull();
  });

  it("labels, crisis text, carry-over strip", () => {
    const d = day({ activity: { level: "medium", note: "", kinds: ["swim"], custom: ["Скалодром"] } });
    expect(tagLabels(d, "activity")).toEqual(["🏊 Плавание", "✎ Скалодром"]);
    expect(customText(d)).toBe("Скалодром");
    expect(withoutTags(d).activity).toEqual({ level: "medium", note: "" });
  });

  it("work tags depend on mode", () => {
    expect(tagsFor("work", "study").some((t) => t.id === "lectures")).toBe(true);
    expect(tagsFor("work", "work").some((t) => t.id === "lectures")).toBe(false);
    expect(tagsFor("work", "work").some((t) => t.id === "meetings")).toBe(true);
  });

  it("recent custom tags come back newest first, deduped", () => {
    const r = recentCustom([day({ rest: { type: "hobby", custom: ["Фанфики"] } }), day({ rest: { type: "hobby", custom: ["фанфики", "Квиз"] } })]);
    expect(r.rest).toEqual(["Фанфики", "Квиз"]);
  });

  it("tag effects need ≥3 days on both sides and sort by size", () => {
    const swim = day({ activity: { level: "medium", note: "", kinds: ["swim"] } });
    const plain = day({});
    const days = [
      ...[70, 72, 74].map((score) => ({ data: swim, score })),
      ...[60, 62, 64].map((score) => ({ data: plain, score })),
    ];
    expect(tagEffects(days)).toEqual([expect.objectContaining({ key: "swim", diff: 10, withDays: 3, withoutDays: 3 })]);
    expect(tagEffects(days.slice(1))).toEqual([]);
  });

  it("counts tags for statistics", () => {
    const rows = [day({ rest: { type: "hobby", kinds: ["manga"] } }), day({ rest: { type: "hobby", kinds: ["manga", "movie"] } })];
    expect(tagCounts(rows, "rest").map((c) => [c.label, c.count])).toEqual([
      ["Манга, комиксы", 2],
      ["Фильм", 1],
    ]);
  });
});
