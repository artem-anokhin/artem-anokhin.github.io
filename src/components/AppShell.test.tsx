import { render, screen, waitFor } from "@testing-library/react";
import { AppShell } from "./AppShell";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/insights/", useRouter: () => ({ replace }) }));

describe("AppShell", () => {
  it("renders all 5 sections and marks the current one", () => {
    render(<AppShell><p>content</p></AppShell>);
    for (const label of ["Сегодня", "Тест", "Инсайты", "Дерево", "Библиотека"]) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
    const current = screen.getAllByRole("link", { current: "page" });
    expect(current.every((a) => a.textContent === "Инсайты")).toBe(true);
    expect(screen.getAllByText("Не является медицинской консультацией").length).toBeGreaterThan(0);
  });

  it("redirects to onboarding when there is no consent yet", async () => {
    render(<AppShell><p>content</p></AppShell>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/welcome/"));
  });
});
