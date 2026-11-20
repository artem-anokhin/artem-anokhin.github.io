import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CARDS } from "@/lib/library";
import { LibraryScreen } from "./LibraryScreen";

afterEach(() => {
  window.location.hash = "";
});

describe("LibraryScreen", () => {
  it("lists all cards and filters by topic", () => {
    const { container } = render(<LibraryScreen />);
    expect(container.querySelectorAll("details")).toHaveLength(15);
    fireEvent.click(screen.getByRole("button", { name: "Сон" }));
    expect(screen.getByRole("button", { name: "Сон" })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelectorAll("details").length).toBe(CARDS.filter((c) => c.topic === "Сон").length);
  });

  it("opens a card from a deep link and notes unknown ids", async () => {
    window.location.hash = "#caffeine-timing";
    const { container } = render(<LibraryScreen />);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect((container.querySelector("#caffeine-timing") as HTMLDetailsElement).open).toBe(true);
    window.location.hash = "#nope";
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(await screen.findByText("Такой карточки нет. Вот все материалы.")).toBeInTheDocument();
  });
});

describe("LibraryScreen deep-link edge cases", () => {
  const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

  it("survives malformed percent-encoding", async () => {
    window.location.hash = "#%E0%A4%A";
    render(<LibraryScreen />);
    expect(await screen.findByText("Такой карточки нет. Вот все материалы.")).toBeInTheDocument();
  });

  it("clears the topic filter so the target opens, and clears the unknown note on empty hash", async () => {
    const { container } = render(<LibraryScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Кофеин" }));
    window.location.hash = "#sleep-hours";
    fireEvent(window, new HashChangeEvent("hashchange"));
    await frame();
    expect((container.querySelector("#sleep-hours") as HTMLDetailsElement).open).toBe(true);
    expect(screen.getByRole("button", { name: "Все" })).toHaveAttribute("aria-pressed", "true");
    window.location.hash = "#nope";
    fireEvent(window, new HashChangeEvent("hashchange"));
    await screen.findByText(/Такой карточки нет/);
    window.location.hash = "";
    fireEvent(window, new HashChangeEvent("hashchange"));
    await frame();
    expect(screen.queryByText(/Такой карточки нет/)).toBeNull();
  });
});
