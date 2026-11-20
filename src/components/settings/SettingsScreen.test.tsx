import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { SettingsScreen } from "./SettingsScreen";

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all([db.checkins.clear(), db.focusTests.clear(), db.settings.clear()]);
});

const seed = () => db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1_700_000_000_000 } });

describe("SettingsScreen", () => {
  it("changes mode and keeps the consent time", async () => {
    await seed();
    render(<SettingsScreen />);
    fireEvent.click(await screen.findByLabelText(/Работаю/));
    expect(await screen.findByText("Сохранено")).toBeInTheDocument();
    expect((await db.settings.get("profile"))?.value).toEqual({ mode: "work", consentAt: 1_700_000_000_000 });
  });

  it("deletes everything only after inline confirmation", async () => {
    await seed();
    await db.focusTests.add({ date: "2026-11-20", takenAt: 1, score: 70 });
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    render(<SettingsScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Удалить все данные" }));
    expect(screen.getByRole("button", { name: "Отмена" })).toHaveFocus();
    expect(await db.focusTests.count()).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(screen.getByRole("button", { name: "Удалить все данные" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Удалить все данные" }));
    fireEvent.click(screen.getByRole("button", { name: "Да, удалить" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/welcome/"));
    expect(await db.settings.count()).toBe(0);
    expect(await db.focusTests.count()).toBe(0);
  });

  it("shows the disclaimer and help lines", async () => {
    await seed();
    render(<SettingsScreen />);
    expect(await screen.findByText("Не является медицинской консультацией.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /111/ })).toHaveAttribute("href", "tel:111");
    expect(screen.getByRole("link", { name: /150/ })).toHaveAttribute("href", "tel:150");
  });
});
