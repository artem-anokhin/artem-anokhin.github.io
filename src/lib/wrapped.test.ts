import { describe, expect, it } from "vitest";
import { emptyCheckIn } from "./checkin";
import { weekPersona, wrappedCardSvg } from "./wrapped";

const at = (h: number, d = 1) => new Date(2026, 10, d, h, 10).getTime();
const ci = (kinds: string[]) => ({ ...emptyCheckIn(), date: "d", createdAt: 1, updatedAt: 1, activity: { level: "medium" as const, note: "", kinds } });

describe("week persona", () => {
  it("time of day first, then long sessions, then top tag, then minutes", () => {
    expect(weekPersona([1, 2, 3].map((d) => ({ minutes: 25, startedAt: at(1, d) })), []).title).toBe("Ночная сова");
    expect(weekPersona([1, 2, 3].map((d) => ({ minutes: 25, startedAt: at(7, d) })), []).title).toBe("Ранняя пташка");
    expect(weekPersona([1, 2, 3].map((d) => ({ minutes: 50, startedAt: at(14, d) })), []).title).toBe("Марафонец");
    expect(weekPersona([], [ci(["swim"]), ci(["swim"]), ci(["swim"])]).title).toBe("Дельфин");
    expect(weekPersona([], []).title).toBe("Росток");
  });

  it("escapes text in the card", () => {
    const svg = wrappedCardSvg({ persona: { emoji: "✨", title: "<b>", why: "a&b" }, focusMinutes: 125, sessions: 3, checkinDays: 4, bestScore: null, tags: [{ emoji: "✎", label: "\"x\"" }], url: "x.app" });
    expect(svg).toContain("&lt;b&gt;");
    expect(svg).toContain("a&amp;b");
    expect(svg).toContain("2 ч 5 мин");
    expect(svg).not.toContain("<b>");
  });
});
