import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { emptyCheckIn } from "@/lib/checkin";
import { db, dayKey } from "@/lib/db";
import { TIPS } from "@/lib/tips";
import { HomeScreen, subline } from "./HomeScreen";
import { HistoryScreen } from "@/components/history/HistoryScreen";

const consent = () => db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });

afterEach(async () => {
  await Promise.all([db.checkins.clear(), db.focusTests.clear(), db.sessions.clear(), db.settings.clear()]);
});

const seedDays = async (n: number) => {
  for (let i = 1; i <= n; i++) {
    const date = `2026-10-${String(i).padStart(2, "0")}`;
    await db.checkins.put({ ...emptyCheckIn(), date, createdAt: 1, updatedAt: 1 });
    await db.focusTests.add({ date, takenAt: 1, score: 60 });
  }
};

describe("HomeScreen", () => {
  it("offers check-in, test and focus session before today's check-in", async () => {
    await consent();
    render(<HomeScreen />);
    expect(await screen.findByRole("link", { name: /Отметить день/ })).toHaveAttribute("href", expect.stringMatching(/^\/checkin\/?$/));
    expect(screen.getByRole("link", { name: /Фокус-сессия/ })).toHaveAttribute("href", expect.stringMatching(/^\/focus\/?$/));
    expect(screen.getByRole("link", { name: "Пройти тест" })).toHaveAttribute("href", expect.stringMatching(/^\/test\/?$/));
    expect(screen.getByRole("img", { name: /Кольца дня: чек-ин не сделан, фокус 0 из 25 минут/ })).toBeInTheDocument();
    expect(screen.getByText("До инсайтов 7 дней")).toBeInTheDocument();
    expect(screen.getByText("Нет")).toBeInTheDocument();
  });

  it("after check-in shows done state, a sourced tip and today's score", async () => {
    await consent();
    const d = { ...emptyCheckIn(), date: dayKey(), createdAt: 1, updatedAt: 1 };
    d.food.breakfast = false;
    await db.checkins.put(d);
    await db.focusTests.add({ date: dayKey(), takenAt: 1, score: 77 });
    render(<HomeScreen />);
    expect(await screen.findByText("Чек-ин готов")).toBeInTheDocument();
    expect(screen.getByText("Готов")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Отметить день/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Focus Score 77/ })).toHaveAttribute("href", expect.stringMatching(/^\/history\/?$/));
    expect(screen.getByText(/Источник:/).closest("a")).toHaveAttribute("href");
    expect(Object.values(TIPS).some((t) => screen.queryByText(t.title))).toBe(true);
  });

  it("counts down to insights with Russian plurals and hides it once unlocked", async () => {
    await consent();
    await seedDays(6);
    const { unmount } = render(<HomeScreen />);
    expect(await screen.findByText("До инсайтов 1 день")).toBeInTheDocument();
    unmount();
    await seedDays(7);
    render(<HomeScreen />);
    await screen.findByText("Действия");
    expect(screen.queryByText(/До инсайтов/)).not.toBeInTheDocument();
  });
});

describe("HistoryScreen", () => {
  it("shows the empty state, 7 day rows and all 30 on demand", async () => {
    render(<HistoryScreen />);
    expect(await screen.findByText(/Пока мало данных/)).toBeInTheDocument();
    expect(screen.getAllByText("Чек-ин: нет")).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: "Показать все 30 дней" }));
    expect(screen.getAllByText("Чек-ин: нет")).toHaveLength(30);
  });
});

describe("subline", () => {
  const base = { exam: null, focusToday: 0, goal: 25 };
  it("prefers a close exam, then the reached goal", () => {
    expect(subline(base)).toBeNull();
    expect(subline({ ...base, focusToday: 25 })).toBe("Цель фокуса на сегодня выполнена");
    expect(subline({ ...base, exam: { title: "Матан", days: 0 } })).toBe("Сегодня «Матан». Удачи!");
    expect(subline({ ...base, exam: { title: "Матан", days: 1 } })).toBe("Завтра «Матан»");
    expect(subline({ ...base, focusToday: 99, exam: { title: "Матан", days: 5 } })).toBe("До «Матан» 5 дней");
  });
});
