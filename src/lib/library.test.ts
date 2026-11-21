import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CARDS } from "./library";
import { METRIC_CARD, TIP_CARD } from "./libraryLinks";
import { METRICS } from "./insights";
import { TIPS } from "./tips";

const sources = readFileSync("docs/sources.md", "utf8");

describe("library cards", () => {
  it("has 19 unique cards", () => {
    expect(CARDS).toHaveLength(19);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(19);
  });

  it("cites only URLs from docs/sources.md and never says «вызывает»", () => {
    for (const c of CARDS) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
      for (const s of c.sources) expect(sources.includes(s.url), `${c.id}: ${s.url}`).toBe(true);
      const text = [c.title, c.summary, ...c.body, c.tryThis ?? "", c.evidence].join(" ");
      expect(text, c.id).not.toMatch(/вызыва/i);
      expect(c.summary.length, c.id).toBeLessThanOrEqual(160);
    }
  });

  it("links every tip and known metric to an existing card", () => {
    const ids = new Set(CARDS.map((c) => c.id));
    for (const k of Object.keys(TIPS)) expect(ids.has(TIP_CARD[k as keyof typeof TIPS])).toBe(true);
    for (const [k, id] of Object.entries(METRIC_CARD)) {
      expect(METRICS.some((m) => m.key === k), k).toBe(true);
      expect(ids.has(id!)).toBe(true);
    }
  });
});
