import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { StroopTest } from "./StroopTest";

afterEach(async () => {
  window.history.replaceState(null, "", "/");
  await db.settings.clear();
});

describe("StroopTest challenge", () => {
  it("shows the friend's score from ?vs= and sends a guest's close button to onboarding", async () => {
    window.history.replaceState(null, "", "/tests/stroop/?vs=74");
    render(<StroopTest />);
    expect(await screen.findByText(/Вас вызвали: у друга 74/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Закрыть тест" })).toHaveAttribute("href", expect.stringMatching(/^\/welcome\/?$/));
  });

  it("ignores a malformed challenge", async () => {
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    window.history.replaceState(null, "", "/tests/stroop/?vs=999");
    render(<StroopTest />);
    await screen.findByRole("link", { name: "Закрыть тест" });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/Вас вызвали/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Закрыть тест" })).toHaveAttribute("href", expect.stringMatching(/^\/tests\/?$/));
  });
});
