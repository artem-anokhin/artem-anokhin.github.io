import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FocusTest } from "./FocusTest";

describe("FocusTest", () => {
  it("runs intro → running → result without enough data", () => {
    render(<FocusTest />);
    expect(screen.getByText(/менее точна, чем лабораторный тест/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Начать" }));
    // A press right after start is always before the stimulus → false start.
    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByText("Рано, ничего страшного")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Закончить" }));
    expect(screen.getByText(/Мало нажатий/)).toBeInTheDocument();
    expect(screen.getByText("Ранние нажатия").nextSibling).toHaveTextContent("1");
  });
});
