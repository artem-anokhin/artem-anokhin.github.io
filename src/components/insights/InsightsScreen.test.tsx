import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { db, dayKey } from "@/lib/db";
import { emptyCheckIn } from "@/lib/checkin";
import { saveProfile } from "@/lib/settings";
import { plural } from "@/lib/plural";
import { InsightsScreen } from "./InsightsScreen";

afterEach(async () => {
  await Promise.all([db.checkins.clear(), db.focusTests.clear(), db.settings.clear()]);
});

describe("plural", () => {
  it("picks Russian forms", () => {
    const f: [string, string, string] = ["день", "дня", "дней"];
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => plural(n, f))).toEqual(["день", "дня", "дней", "дней", "день", "дня", "дней"]);
  });
});

describe("InsightsScreen", () => {
  it("is locked with fewer than 7 days", async () => {
    render(<InsightsScreen />);
    expect(await screen.findByText("0 из 7 дней")).toBeInTheDocument();
    expect(screen.getByText(/гипотезы, а не причины/)).toBeInTheDocument();
  });

  it("shows insights and an experiment offer with 14 days of data", async () => {
    await saveProfile("study", true);
    for (let i = 0; i < 14; i++) {
      const d = emptyCheckIn();
      const sleepH = 5 + (i % 5);
      d.sleep = { bedtime: `${String((31 - sleepH) % 24).padStart(2, "0")}:00`, wake: "07:00", quality: 3 };
      const date = dayKey(new Date(2026, 9, 1 + i));
      await db.checkins.put({ ...d, date, createdAt: i, updatedAt: i });
      await db.focusTests.add({ date, takenAt: i, score: 40 + sleepH * 5 });
    }
    render(<InsightsScreen />);
    expect(await screen.findByText("В ваших данных Focus Score чаще был выше в дни, когда вы спали дольше.")).toBeInTheDocument();
    expect(screen.getByText("сильная связь в ваших данных")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Начать на 7 дней" })).toBeInTheDocument();
    expect(screen.queryByText(/вызыва/)).toBeNull();
  });
});
