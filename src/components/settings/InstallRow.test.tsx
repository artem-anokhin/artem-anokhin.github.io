import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InstallRow } from "./InstallRow";

describe("InstallRow", () => {
  it("is hidden until the browser offers install, then opens the native prompt", async () => {
    render(<InstallRow />);
    expect(screen.queryByText(/Установить/)).not.toBeInTheDocument();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const e = Object.assign(new Event("beforeinstallprompt"), { prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });
    await act(async () => {
      window.dispatchEvent(e);
    });
    fireEvent.click(await screen.findByRole("button", { name: /Установить на экран/ }));
    expect(prompt).toHaveBeenCalled();
  });
});
