import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { db, dayKey } from "@/lib/db";
import { HABIT_IDEAS } from "@/lib/habitIdeas";
import { HabitsScreen } from "./HabitsScreen";
import { HabitsToday } from "./HabitsToday";

const consent = () => db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });

afterEach(async () => {
  await Promise.all([db.habits.clear(), db.habitLogs.clear(), db.settings.clear()]);
});

describe("habits UI", () => {
  it("adds a sourced idea and a custom habit", async () => {
    await consent();
    render(<HabitsScreen />);
    const idea = HABIT_IDEAS[0]!;
    fireEvent.click(await screen.findByRole("button", { name: `Добавить: ${idea.title}` }));
    expect(await screen.findByRole("button", { name: `Уже добавлено: ${idea.title}` })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/20 минут чтения/), { target: { value: "Читать 20 минут" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));
    expect(await screen.findByText("Мои привычки · 2 из 5")).toBeInTheDocument();
    expect(screen.getAllByText(/Источник:/).length).toBe(HABIT_IDEAS.length);
  });

  it("marks a habit for today with one tap", async () => {
    await consent();
    const id = (await db.habits.add({ title: "Прогулка", sphere: "activity", createdAt: 1, archived: 0 })) as number;
    render(<HabitsToday />);
    const box = await screen.findByRole("checkbox", { name: /Прогулка/ });
    expect(box).toHaveAttribute("aria-checked", "false");
    fireEvent.click(box);
    expect(await screen.findByText("Привычки · 1 из 1")).toBeInTheDocument();
    expect(await db.habitLogs.get([id, dayKey()])).toBeTruthy();
  });

  it("invites to add habits when there are none", async () => {
    await consent();
    render(<HabitsToday />);
    expect(await screen.findByRole("link", { name: /Добавьте привычки/ })).toHaveAttribute("href", expect.stringMatching(/^\/habits\/?$/));
  });
});
