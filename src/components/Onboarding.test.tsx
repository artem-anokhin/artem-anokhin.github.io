import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { getProfile } from "@/lib/settings";
import { getStart } from "@/lib/start";
import { Onboarding } from "./Onboarding";

afterEach(async () => {
  vi.useRealTimers();
  await db.settings.clear();
});

const advance = () => act(() => vi.advanceTimersByTime(300));

describe("Onboarding", () => {
  it("warm-up skipped → two questions → plan → nothing stored until consent", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const done = vi.fn();
    render(<Onboarding onDone={done} />);
    fireEvent.click(screen.getByRole("button", { name: "Поехали" }));
    fireEvent.click(screen.getByRole("button", { name: "Пропустить" }));
    fireEvent.click(screen.getByRole("button", { name: /Работа/ }));
    advance();
    fireEvent.click(screen.getByRole("button", { name: /Трудно начать/ }));
    advance();
    expect(screen.getByText("Ваша неделя старта")).toBeInTheDocument();
    expect(screen.getByText("Начинайте с 15 минут")).toBeInTheDocument();
    expect(screen.getByText("Сессии по 50 минут с перерывом")).toBeInTheDocument();
    expect(screen.getByText(/не ответ AI/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Далее" }));
    vi.useRealTimers(); // Dexie needs real timers
    expect(await getProfile()).toBeNull();
    expect(screen.getByText("Не является медицинской консультацией")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /111/ })).toHaveAttribute("href", "tel:111");
    expect(screen.getByRole("button", { name: "Начать" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Как назовём/), { target: { value: "Дуб" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Начать" }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect((await getProfile())!.mode).toBe("work");
    expect(await getStart()).toEqual({ goal: "work", blocker: "start", score: null, treeName: "Дуб" });
  });

  it("a completed warm-up shows the start point", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Onboarding onDone={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Поехали" }));
    fireEvent.click(screen.getByRole("button", { name: /Я готов/ }));
    for (let i = 0; i < 8; i++) {
      act(() => vi.advanceTimersByTime(700));
      const word = screen.getByLabelText(/цвет букв — выберите/);
      const ink = getComputedStyle(word).color;
      const btns = screen.getAllByRole("button").filter((b) => b.closest('[aria-label="Цвет букв"]'));
      const right = btns.find((b) => getComputedStyle(b.querySelector("span")!).backgroundColor === ink) ?? btns[0]!;
      fireEvent.click(right);
    }
    fireEvent.click(screen.getByRole("button", { name: /Сессия и экзамены/ }));
    advance();
    fireEvent.click(screen.getByRole("button", { name: /Телефон/ }));
    advance();
    expect(screen.getByText("Ваша точка отсчёта")).toBeInTheDocument();
    expect(screen.getByText("Телефон — вне поля зрения")).toBeInTheDocument();
  });
});
