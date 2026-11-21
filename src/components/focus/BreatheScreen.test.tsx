import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BreatheScreen, EXHALE_MS, INHALE_MS, breathPhase } from "./BreatheScreen";

describe("breathing", () => {
  it("alternates 4 s inhale and 6 s exhale", () => {
    expect(breathPhase(0)).toEqual({ inhale: true, breaths: 0 });
    expect(breathPhase(INHALE_MS)).toEqual({ inhale: false, breaths: 0 });
    expect(breathPhase(INHALE_MS + EXHALE_MS)).toEqual({ inhale: true, breaths: 1 });
    expect(breathPhase(-5).inhale).toBe(true);
  });

  it("starts with a chosen length and shows the phase", () => {
    render(<BreatheScreen />);
    fireEvent.click(screen.getByLabelText("3 мин"));
    fireEvent.click(screen.getByRole("button", { name: "Начать" }));
    expect(screen.getByText("Вдох")).toBeInTheDocument();
    expect(screen.getByText(/Осталось 180 с/)).toBeInTheDocument();
  });
});
