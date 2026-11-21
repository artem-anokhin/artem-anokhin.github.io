import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { NotesScreen } from "./NotesScreen";

afterEach(async () => {
  await Promise.all([db.notes.clear(), db.settings.clear()]);
});

describe("NotesScreen", () => {
  it("adds a note, shows the help card for crisis wording, deletes with inline confirm", async () => {
    await db.settings.put({ key: "profile", value: { mode: "study", consentAt: 1 } });
    render(<NotesScreen />);
    fireEvent.change(await screen.findByLabelText("Текст заметки"), { target: { value: "Идея для курсовой" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));
    expect(await screen.findByRole("button", { name: "Изменить заметку" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Заметки" })).toHaveTextContent("Идея для курсовой");
    fireEvent.change(screen.getByLabelText("Текст заметки"), { target: { value: "не хочу жить" } });
    expect(screen.getByRole("note", { name: "Где найти поддержку" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Удалить заметку" }));
    fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
    expect(await screen.findByText("Здесь появятся ваши заметки.")).toBeInTheDocument();
  });
});
