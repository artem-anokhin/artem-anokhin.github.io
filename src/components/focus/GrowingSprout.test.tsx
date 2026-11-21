import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GrowingSprout, sproutPhase } from "./GrowingSprout";

describe("GrowingSprout", () => {
  it("names each growth phase from seed to flower", () => {
    expect([0, 0.2, 0.4, 0.6, 0.8, 0.95, 1].map(sproutPhase)).toEqual([
      "Семя просыпается",
      "Пробивается росток",
      "Раскрываются листья",
      "Росток крепнет",
      "Набирается бутон",
      "Скоро распустится",
      "Распустился",
    ]);
  });

  it("shows a seed at the start and petals at the end", () => {
    const start = render(<GrowingSprout progress={0} />).container;
    expect(start.querySelectorAll("path").length).toBe(0);
    const end = render(<GrowingSprout progress={1} />).container;
    expect(end.querySelectorAll("ellipse").length).toBeGreaterThanOrEqual(5 + 2);
  });
});
