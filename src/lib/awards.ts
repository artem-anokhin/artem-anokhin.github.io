import type { CheckIn, FocusSession, FocusTestResult, HabitLog } from "./db";

/**
 * «Награды»: milestones for totals only (no streaks, nothing is ever lost).
 * Pure function of the user's local data; nothing extra is stored.
 */

export type AwardIcon = "check" | "timer" | "zap" | "sprout" | "leaf" | "moon" | "flower" | "target";

export interface Award {
  id: string;
  title: string;
  hint: string;
  icon: AwardIcon;
  /** Current value and goal for the progress bar. */
  have: number;
  need: number;
  done: boolean;
}

export interface AwardInput {
  checkins: Pick<CheckIn, "date">[];
  tests: Pick<FocusTestResult, "date">[];
  sessions: Pick<FocusSession, "minutes" | "away">[];
  habitLogs: Pick<HabitLog, "date">[];
  stage: number;
}

export function awards({ checkins, tests, sessions, habitLogs, stage }: AwardInput): Award[] {
  const minutes = sessions.reduce((a, s) => a + s.minutes, 0);
  const calm = sessions.filter((s) => s.away === 0).length;
  const habitDays = new Set(habitLogs.map((l) => l.date)).size;
  const list: Omit<Award, "done">[] = [
    { id: "first-checkin", title: "Первый шаг", hint: "Первый чек-ин", icon: "check", have: checkins.length, need: 1 },
    { id: "week-checkins", title: "Неделя наблюдений", hint: "7 дней с чек-ином", icon: "check", have: checkins.length, need: 7 },
    { id: "month-checkins", title: "Исследователь", hint: "30 дней с чек-ином", icon: "target", have: checkins.length, need: 30 },
    { id: "first-session", title: "Первый росток", hint: "Первая фокус-сессия", icon: "timer", have: sessions.length, need: 1 },
    { id: "five-hours", title: "5 часов фокуса", hint: "Всего в фокус-сессиях", icon: "timer", have: Math.floor(minutes / 60), need: 5 },
    { id: "twenty-hours", title: "20 часов фокуса", hint: "Всего в фокус-сессиях", icon: "timer", have: Math.floor(minutes / 60), need: 20 },
    { id: "calm-five", title: "Без отвлечений", hint: "5 сессий, не выходя из приложения", icon: "moon", have: calm, need: 5 },
    { id: "ten-tests", title: "10 замеров", hint: "10 тестов реакции", icon: "zap", have: tests.length, need: 10 },
    { id: "habit-ten", title: "Маленькие шаги", hint: "10 дней с привычкой", icon: "leaf", have: habitDays, need: 10 },
    { id: "bloom", title: "Цветущее дерево", hint: "Вырастить дерево до цветения", icon: "flower", have: stage, need: 4 },
  ];
  return list.map((a) => ({ ...a, have: Math.min(a.have, a.need), done: a.have >= a.need }));
}
