import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { emptyCheckIn, type CheckInData } from "@/lib/checkin";
import { CheckInWizard } from "./CheckInWizard";
import { CheckInSummary } from "./CheckInSummary";

const next = () => fireEvent.click(screen.getByRole("button", { name: "Далее" }));

describe("CheckInWizard", () => {
  it("walks through 7 spheres and a note, then saves the answers", async () => {
    const onSave = vi.fn<(d: CheckInData) => Promise<void>>().mockResolvedValue();
    render(<CheckInWizard initial={emptyCheckIn()} mode="study" onSave={onSave} />);

    expect(screen.getByText("Сфера 1 из 7")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /5 из 5/ }));
    next(); // food
    fireEvent.click(screen.getByRole("radio", { name: "Нет" }));
    next(); // caffeine
    fireEvent.click(screen.getByRole("button", { name: "Увеличить: Кофе и энергетики" }));
    expect(screen.getByLabelText("Когда была последняя?")).toBeInTheDocument();
    next(); next(); next();
    expect(screen.getByRole("heading", { name: "Учёба" })).toBeInTheDocument();
    next(); next();
    expect(screen.getByText("Последний шаг")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Иногда не хочу жить" } });
    expect(screen.getByRole("note", { name: "Где найти поддержку" })).toHaveTextContent("111");

    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const saved = onSave.mock.calls[0]?.[0] as CheckInData;
    expect(saved.sleep.quality).toBe(5);
    expect(saved.food.breakfast).toBe(false);
    expect(saved.caffeine.cups).toBe(1);
    expect(saved.caffeine.lastAt).toBe("14:00");
  });

  it("lets you tell what the day was filled with: chips, own tags, rest type auto-filled", async () => {
    const onSave = vi.fn<(d: CheckInData) => Promise<void>>().mockResolvedValue();
    render(<CheckInWizard initial={emptyCheckIn()} mode="study" onSave={onSave} recent={{ mind: [], activity: [], work: [], rest: ["Фанфики"] }} />);
    next(); next(); next(); // mind
    fireEvent.click(screen.getByRole("button", { name: /Вдохновение/ }));
    next(); // activity
    fireEvent.click(screen.getByRole("button", { name: /Плавание/ }));
    next(); // work
    fireEvent.click(screen.getByRole("button", { name: /Лабы/ }));
    next(); // rest
    fireEvent.click(screen.getByRole("button", { name: /Манга/ }));
    expect(screen.getByRole("radio", { name: "Хобби" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /Фанфики/ }));
    fireEvent.click(screen.getByRole("button", { name: /Своё/ }));
    fireEvent.change(screen.getByLabelText("Своё занятие"), { target: { value: "квиз с друзьями" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));
    expect(screen.getByRole("button", { name: /Квиз с друзьями/ })).toHaveAttribute("aria-pressed", "true");
    next();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const saved = onSave.mock.calls[0]?.[0] as CheckInData;
    expect(saved.mind.kinds).toEqual(["inspired"]);
    expect(saved.activity.kinds).toEqual(["swim"]);
    expect(saved.work.kinds).toEqual(["labs"]);
    expect(saved.rest).toMatchObject({ type: "hobby", kinds: ["manga"], custom: ["Фанфики", "Квиз с друзьями"] });
  });

  it("rest type follows chips over a carried-over type; at most 12 tags", () => {
    const initial = { ...emptyCheckIn(), rest: { type: "physical" as const }, answered: [] };
    render(<CheckInWizard initial={initial} mode="study" onSave={vi.fn()} />);
    for (let i = 0; i < 6; i++) next();
    fireEvent.click(screen.getByRole("button", { name: /Книга/ }));
    expect(screen.getByRole("radio", { name: "Хобби" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /^Ещё/ }));
    const chips = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "false");
    chips.slice(0, 14).forEach((b) => fireEvent.click(b));
    expect(screen.getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true")).toHaveLength(12);
    expect(screen.getByText(/Не больше 12 отметок/)).toBeInTheDocument();
  });

  it("marks only touched spheres as answered when values were carried over", async () => {
    const onSave = vi.fn<(d: CheckInData) => Promise<void>>().mockResolvedValue();
    render(<CheckInWizard initial={{ ...emptyCheckIn(), answered: [] }} mode="study" onSave={onSave} />);
    next(); // food
    fireEvent.click(screen.getByRole("radio", { name: "Нет" }));
    for (let i = 0; i < 6; i++) next();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect((onSave.mock.calls[0]?.[0] as CheckInData).answered).toEqual(["food"]);
  });

  it("treats a first check-in with neutral defaults as fully answered", async () => {
    const onSave = vi.fn<(d: CheckInData) => Promise<void>>().mockResolvedValue();
    render(<CheckInWizard initial={emptyCheckIn()} mode="study" onSave={onSave} />);
    for (let i = 0; i < 7; i++) next();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect((onSave.mock.calls[0]?.[0] as CheckInData).answered).toBeUndefined();
  });

  it("keeps answers and shows an error when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("quota"));
    render(<CheckInWizard initial={emptyCheckIn()} mode="work" onSave={onSave} />);
    for (let i = 0; i < 7; i++) next();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось сохранить");
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
  });
});

describe("CheckInSummary", () => {
  it("lists all 7 spheres and offers editing", () => {
    const onEdit = vi.fn();
    render(<CheckInSummary data={emptyCheckIn()} mode="work" onEdit={onEdit} />);
    expect(screen.getByText("Сон").nextSibling).toHaveTextContent("8 ч, качество 3/5");
    expect(screen.getByText("Работа")).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Изменить/ }));
    expect(onEdit).toHaveBeenCalled();
  });
});
