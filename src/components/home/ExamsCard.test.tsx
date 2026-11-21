import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { db, dayKey } from "@/lib/db";
import { ExamsCard } from "./ExamsCard";

afterEach(async () => {
  await db.delete();
  await db.open();
});

describe("ExamsCard", () => {
  it("adds an exam and shows the countdown", async () => {
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    const n = new Date();
    const in3 = dayKey(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 3));
    render(<ExamsCard />);
    fireEvent.click(await screen.findByRole("button", { name: /Экзамены и дедлайны/ }));
    fireEvent.change(screen.getByLabelText("Что сдаёте"), { target: { value: "Матанализ" } });
    fireEvent.change(screen.getByLabelText("Дата"), { target: { value: in3 } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));
    expect(await screen.findByText("Матанализ")).toBeInTheDocument();
    expect(screen.getByText(/Через 3 дня/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Удалить «Матанализ»" }));
    expect(await screen.findByRole("button", { name: /Экзамены и дедлайны/ })).toBeInTheDocument();
  });
});
