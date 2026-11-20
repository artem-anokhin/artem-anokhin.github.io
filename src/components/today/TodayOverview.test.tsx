import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyCheckIn } from "@/lib/checkin";
import { TIPS } from "@/lib/tips";
import { TodayOverview } from "./TodayOverview";
import { HistoryScreen } from "@/components/history/HistoryScreen";

describe("TodayOverview", () => {
  it("shows spheres with text status, a sourced tip and a test CTA", async () => {
    const d = emptyCheckIn();
    d.food.breakfast = false;
    d.caffeine = { cups: 0, lastAt: null, water: 5 };
    d.mind.stress = 2;
    render(<TodayOverview data={d} mode="study" onEdit={vi.fn()} />);
    expect(screen.getByText("7 сфер")).toBeInTheDocument();
    expect(screen.getAllByText(/обратите внимание|в норме/).length).toBeGreaterThanOrEqual(6);
    expect(screen.getByText(/Источник:/).closest("a")).toHaveAttribute("href");
    expect(await screen.findByRole("link", { name: "Пройти тест" })).toHaveAttribute("href", expect.stringMatching(/^\/test\/?$/));
    expect(Object.values(TIPS).some((t) => screen.queryByText(t.title))).toBe(true);
  });
});

describe("HistoryScreen", () => {
  it("shows the empty state and 30 day rows without data", async () => {
    render(<HistoryScreen />);
    expect(await screen.findByText(/Пока мало данных/)).toBeInTheDocument();
    expect(screen.getAllByText("Чек-ин: нет")).toHaveLength(30);
  });
});
