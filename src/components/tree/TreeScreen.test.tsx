import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { db, dayKey } from "@/lib/db";
import { emptyCheckIn } from "@/lib/checkin";
import { TreeScreen } from "./TreeScreen";

afterEach(async () => {
  await Promise.all([db.checkins.clear(), db.focusTests.clear(), db.settings.clear()]);
});

describe("TreeScreen", () => {
  it("shows a seed and the first-step message with no data", async () => {
    render(<TreeScreen />);
    expect(await screen.findByRole("img", { name: /Дерево: семя/ })).toBeInTheDocument();
    expect(screen.getByText(/первое семечко/)).toBeInTheDocument();
    expect(screen.getByText("До стадии «росток»: 0 из 6")).toBeInTheDocument();
  });

  it("counts today's check-in and test as drops", async () => {
    const date = dayKey();
    await db.checkins.put({ ...emptyCheckIn(), date, createdAt: 1, updatedAt: 1 });
    await db.focusTests.add({ date, takenAt: 1, score: 70 });
    render(<TreeScreen />);
    expect(await screen.findByText("До стадии «росток»: 2 из 6")).toBeInTheDocument();
    expect(screen.getByText("За 7 дней чек-инов: 1, тестов: 1.")).toBeInTheDocument();
  });
});
