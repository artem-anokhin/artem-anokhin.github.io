import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { emptyCheckIn } from "@/lib/checkin";
import { db, dayKey } from "@/lib/db";
import { WeekScreen } from "./WeekScreen";

afterEach(async () => {
  await Promise.all([db.checkins.clear(), db.focusTests.clear(), db.sessions.clear(), db.settings.clear()]);
});

describe("WeekScreen", () => {
  it("shows the week's average score, focus minutes and the insight countdown", async () => {
    const key = dayKey();
    await db.checkins.put({ ...emptyCheckIn(), date: key, createdAt: 1, updatedAt: 1 });
    await db.focusTests.add({ date: key, takenAt: 1, score: 70 });
    await db.sessions.add({ date: key, startedAt: 1, minutes: 25 });
    render(<WeekScreen />);
    expect(await screen.findByText("Средний Focus Score")).toBeInTheDocument();
    expect(screen.getByText("70", { selector: ".stat" })).toBeInTheDocument();
    expect(screen.getByText("фокуса").previousSibling).toHaveTextContent("25мин");
    expect(screen.getByText(/Инсайты откроются через 6 дней/)).toBeInTheDocument();
  });
});
