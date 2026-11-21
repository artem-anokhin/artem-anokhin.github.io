import type { CheckIn, FocusSession, FocusTestResult, HabitLog } from "./db";

/**
 * «Награды»: milestones for totals only (no streaks, nothing is ever lost),
 * plus a few secret ones (пасхалки) that stay «???» until earned.
 * Pure function of the user's local data; only «seen» ids are stored (see AWARDS_SEEN_KEY).
 */

export const AWARDS_SEEN_KEY = "awardsSeen";

export type AwardId =
  | "first-checkin"
  | "week-checkins"
  | "month-checkins"
  | "first-session"
  | "five-hours"
  | "twenty-hours"
  | "calm-five"
  | "ten-tests"
  | "habit-ten"
  | "bloom"
  | "first-goal"
  // secret
  | "night-owl"
  | "early-bird"
  | "marathon"
  | "hat-trick"
  | "together"
  | "answer-42";

export interface Award {
  id: AwardId;
  title: string;
  hint: string;
  /** Secret awards hide title and hint until earned. */
  secret?: true;
  /** Current value and goal for the progress bar. */
  have: number;
  need: number;
  done: boolean;
}

export interface AwardInput {
  checkins: Pick<CheckIn, "date">[];
  tests: Pick<FocusTestResult, "date" | "takenAt">[];
  sessions: Pick<FocusSession, "minutes" | "away" | "startedAt" | "date" | "task" | "together">[];
  habitLogs: Pick<HabitLog, "date">[];
  stage: number;
  /** Goals reached (see goals.ts); optional for older callers. */
  goalsDone?: number;
}

const hour = (ts: number) => new Date(ts).getHours();

export function awards({ checkins, tests, sessions, habitLogs, stage, goalsDone = 0 }: AwardInput): Award[] {
  const minutes = sessions.reduce((a, s) => a + s.minutes, 0);
  const calm = sessions.filter((s) => s.away === 0).length;
  const habitDays = new Set(habitLogs.map((l) => l.date)).size;
  const perDay = new Map<string, number>();
  for (const s of sessions) perDay.set(s.date, (perDay.get(s.date) ?? 0) + 1);
  const yes = (b: boolean) => (b ? 1 : 0);

  const list: Omit<Award, "done">[] = [
    { id: "first-checkin", title: "Первый шаг", hint: "Первый чек-ин", have: checkins.length, need: 1 },
    { id: "week-checkins", title: "Неделя наблюдений", hint: "7 дней с чек-ином", have: checkins.length, need: 7 },
    { id: "month-checkins", title: "Исследователь", hint: "30 дней с чек-ином", have: checkins.length, need: 30 },
    { id: "first-session", title: "Первый росток", hint: "Первая фокус-сессия", have: sessions.length, need: 1 },
    { id: "five-hours", title: "5 часов фокуса", hint: "Всего в фокус-сессиях", have: Math.floor(minutes / 60), need: 5 },
    { id: "twenty-hours", title: "20 часов фокуса", hint: "Всего в фокус-сессиях", have: Math.floor(minutes / 60), need: 20 },
    { id: "calm-five", title: "Без отвлечений", hint: "5 сессий, не выходя из приложения", have: calm, need: 5 },
    { id: "ten-tests", title: "10 замеров", hint: "10 тестов реакции", have: tests.length, need: 10 },
    { id: "habit-ten", title: "Маленькие шаги", hint: "10 дней с привычкой", have: habitDays, need: 10 },
    { id: "bloom", title: "Цветущее дерево", hint: "Вырастить дерево до цветения", have: stage, need: 4 },
    { id: "first-goal", title: "Цель достигнута", hint: "Отметить первую цель выполненной", have: goalsDone, need: 1 },
    // Secret ones: described only after they are earned.
    { id: "night-owl", secret: true, title: "Сова", hint: "Фокус-сессия после полуночи. Сон тоже важен 😉", have: yes(sessions.some((s) => hour(s.startedAt) < 4)), need: 1 },
    { id: "early-bird", secret: true, title: "Жаворонок", hint: "Тест реакции рано утром, с 4 до 7", have: yes(tests.some((t) => t.takenAt > 0 && hour(t.takenAt) >= 4 && hour(t.takenAt) < 7)), need: 1 },
    { id: "marathon", secret: true, title: "Марафонец", hint: "Фокус-сессия на 50 минут", have: yes(sessions.some((s) => s.minutes >= 50)), need: 1 },
    { id: "hat-trick", secret: true, title: "Хет-трик", hint: "Три фокус-сессии за один день", have: yes([...perDay.values()].some((n) => n >= 3)), need: 1 },
    { id: "together", secret: true, title: "Вместе веселее", hint: "Сессия с другом по ссылке", have: yes(sessions.some((s) => s.together === true)), need: 1 },
    {
      id: "answer-42",
      secret: true,
      title: "Ответ на главный вопрос",
      hint: "Задача с названием «42». Не паникуйте!",
      have: yes(sessions.some((s) => s.task?.trim() === "42")),
      need: 1,
    },
  ];
  return list.map((a) => ({ ...a, have: Math.min(a.have, a.need), done: a.have >= a.need }));
}
