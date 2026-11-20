import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { FocusScreen } from "./FocusScreen";

const consent = () => db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });

afterEach(async () => {
  await Promise.all([db.sessions.clear(), db.settings.clear(), db.checkins.clear(), db.focusTests.clear()]);
});

describe("FocusScreen", () => {
  it("starts a session, hides nav and can be stopped early without a drop", async () => {
    await consent();
    render(<FocusScreen />);
    fireEvent.click(await screen.findByRole("radio", { name: "50 мин" }, { timeout: 4000 }));
    fireEvent.click(await screen.findByRole("button", { name: "Начать 50 минут" }, { timeout: 4000 }));
    expect(await screen.findByRole("img", { name: /Осталось (50:00|49:5\d)/ }, { timeout: 4000 })).toBeInTheDocument();
    expect(document.documentElement.dataset.immersive).toBe("1");
    fireEvent.click(await screen.findByRole("button", { name: "Завершить раньше" }, { timeout: 4000 }));
    fireEvent.click(await screen.findByRole("button", { name: "Завершить" }, { timeout: 4000 }));
    expect(await screen.findByRole("heading", { name: "Фокус-сессия" }, { timeout: 4000 })).toBeInTheDocument();
    expect(await db.sessions.count()).toBe(0);
    await waitFor(() => expect(document.documentElement.dataset.immersive).toBeUndefined());
  }, 15_000);

  it("saves a session whose time ran out while the app was closed", async () => {
    await consent();
    await db.settings.put({ key: "activeSession", value: { startedAt: Date.now() - 26 * 60_000, minutes: 25 } });
    render(<FocusScreen />);
    expect(await screen.findByRole("heading", { name: "25 минут фокуса" }, { timeout: 4000 })).toBeInTheDocument();
    await waitFor(async () => expect(await db.sessions.count()).toBe(1));
  });
});
