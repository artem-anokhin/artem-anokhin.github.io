import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
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

describe("InsightsCountdown", () => {
  afterEach(async () => {
    await Promise.all([db.checkins.clear(), db.focusTests.clear()]);
  });

  const seedDays = async (n: number) => {
    for (let i = 1; i <= n; i++) {
      const date = `2026-11-${String(i).padStart(2, "0")}`;
      await db.checkins.put({ ...emptyCheckIn(), date, createdAt: 1, updatedAt: 1 });
      await db.focusTests.add({ date, takenAt: 1, score: 60 });
    }
  };

  it("counts down to day 7 with Russian plurals", async () => {
    await seedDays(6);
    render(<TodayOverview data={emptyCheckIn()} mode="study" onEdit={vi.fn()} />);
    expect(await screen.findByText("До ваших инсайтов: 1 день")).toBeInTheDocument();
  });

  it("is hidden once insights are unlocked", async () => {
    await seedDays(7);
    render(<TodayOverview data={emptyCheckIn()} mode="study" onEdit={vi.fn()} />);
    await screen.findByRole("link", { name: "Пройти тест" });
    expect(screen.queryByText(/До ваших инсайтов/)).not.toBeInTheDocument();
  });
});

describe("HistoryScreen", () => {
  it("shows the empty state and 30 day rows without data", async () => {
    render(<HistoryScreen />);
    expect(await screen.findByText(/Пока мало данных/)).toBeInTheDocument();
    expect(screen.getAllByText("Чек-ин: нет")).toHaveLength(30);
  });
});
