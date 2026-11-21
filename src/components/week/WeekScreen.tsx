"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SPHERES } from "@/lib/checkin";
import { db, dayKey } from "@/lib/db";
import { minutesByTask } from "@/lib/focusSession";
import { daysUntil, upcomingExams } from "@/lib/exams";
import { MIN_DAYS, computeInsights, pairDays, usableDays, type Insight } from "@/lib/insights";
import { plural } from "@/lib/plural";
import { loadTree } from "@/lib/garden";
import { SPHERE_STYLE } from "@/lib/spheres";
import { latestTestByDay } from "@/lib/today";
import type { TreeState } from "@/lib/tree";
import { weeklyReview, type WeeklyReview } from "@/lib/weekly";
import { btnPrimary } from "@/components/ui/controls";

type Data = {
  review: WeeklyReview;
  scores: (number | null)[];
  tree: TreeState;
  top: Insight | null;
  usable: number;
  /** Task with the most focus minutes this week (labelled sessions only). */
  topTask: { task: string; minutes: number } | null;
  nextExam: { title: string; days: number } | null;
};

const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const weekday = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return WD[new Date(y!, m! - 1, d!).getDay()]!;
};

/** «Итоги недели»: story-style review of the last 7 days (docs/DESIGN.md §4). */
export function WeekScreen() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const key = dayKey();
      const [checkins, tests, sessions, habitLogs] = await Promise.all([
        db.checkins.toArray(),
        db.focusTests.toArray(),
        db.sessions.toArray(),
        db.habitLogs.toArray(),
      ]);
      const review = weeklyReview(checkins, tests, sessions, key, habitLogs);
      const byDay = latestTestByDay(tests);
      const pairs = pairDays(checkins, tests);
      const usable = usableDays(pairs);
      const tree = await loadTree();
      const from = review.days[0]!.date;
      const labelled = sessions.filter((s) => s.date >= from && s.date <= key && s.task);
      const topTask = labelled.length ? minutesByTask(labelled)[0]! : null;
      const exam = (await upcomingExams())[0];
      if (alive)
        setData({
          review,
          scores: review.days.map((d) => byDay.get(d.date)?.score ?? null),
          tree,
          top: usable >= MIN_DAYS ? (computeInsights(pairs)[0] ?? null) : null,
          usable,
          topTask,
          nextExam: exam ? { title: exam.title, days: daysUntil(exam.date, key) } : null,
        });
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-xl px-5 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-medium text-muted first-letter:uppercase">Итоги недели</p>
          <Link href="/insights/" aria-label="Закрыть итоги" className="pressable grid size-11 place-items-center text-link">
            <X aria-hidden size={22} />
          </Link>
        </div>
        {!data ? <div aria-busy="true" className="mt-6 h-96 animate-pulse rounded-card-lg bg-white/60" /> : <Story data={data} />}
      </div>
    </div>
  );
}

function Story({ data }: { data: Data }) {
  const { review, scores, top, usable, topTask, nextExam } = data;
  const { current: c, scoreDelta } = review;
  const max = Math.max(...scores.map((s) => s ?? 0), 1);
  const bestDate = c.best?.date;

  return (
    <div className="stagger mt-4 space-y-8">
      {/* 1. Average Focus Score */}
      <section aria-labelledby="avg-h">
        <h1 id="avg-h" className="text-[15px] font-medium text-muted">
          {c.avgScore === null ? "Неделя без теста" : "Средний Focus Score"}
        </h1>
        {c.avgScore !== null ? (
          <div className="mt-1 flex items-baseline gap-3">
            <span className="stat text-[72px] text-ink">{c.avgScore}</span>
            {scoreDelta !== null && scoreDelta !== 0 && (
              <span
                className={`rounded-full px-3 py-1 text-[14px] font-semibold ${scoreDelta > 0 ? "bg-s-activity-tint text-s-activity-ink" : "bg-fill text-ink"}`}
              >
                {scoreDelta > 0 ? "+" : "−"}
                {Math.abs(scoreDelta)} к прошлой неделе
              </span>
            )}
          </div>
        ) : (
          <p className="mt-2 text-[17px] text-muted">Пройдите тест реакции хотя бы раз — и здесь появится ваш средний результат.</p>
        )}
      </section>

      {/* 2. 7-day bars */}
      <section aria-label="Focus Score по дням" className="rounded-card-lg bg-surface p-4">
        <div className="flex h-40 items-end gap-2" role="img" aria-label={scores.map((s, i) => `${weekday(review.days[i]!.date)}: ${s ?? "нет теста"}`).join(", ")}>
          {scores.map((s, i) => {
            const d = review.days[i]!;
            const best = d.date === bestDate;
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[13px] font-semibold text-ink tabular-nums">{s ?? ""}</span>
                <div
                  className={`w-full origin-bottom animate-grow rounded-t-[10px] rounded-b-[4px] ${s === null ? "bg-soft" : best ? "bg-accent" : "bg-accent-weak"}`}
                  style={{ height: `${s === null ? 8 : Math.max(14, (s / max) * 110)}px`, animationDelay: `${i * 50}ms` }}
                />
                <span className={`text-[13px] ${best ? "font-bold text-link" : "text-muted"}`}>{weekday(d.date)}</span>
              </div>
            );
          })}
        </div>
        {c.best && <p className="mt-3 text-[15px] text-ink">Лучший день — {weekday(c.best.date)}, {c.best.score} баллов.</p>}
      </section>

      {/* 3. Habits in numbers */}
      <section aria-label="Неделя в цифрах" className="grid grid-cols-2 gap-2">
        {[
          [String(c.checkinDays), plural(c.checkinDays, ["день", "дня", "дней"]), "с чек-ином"],
          [String(c.focusMinutes), "мин", "фокуса"],
          [c.avgSleep === null ? "—" : String(c.avgSleep).replace(".", ","), "ч", "сон в среднем"],
          [String(c.habitMarks), plural(c.habitMarks, ["отметка", "отметки", "отметок"]), "привычек"],
        ].map(([v, u, l]) => (
          <div key={l} className="rounded-card bg-surface p-3">
            <p className="stat text-[30px] text-ink">
              {v}
              <span className="ml-1 font-sans text-[13px] font-semibold tracking-normal text-muted">{u}</span>
            </p>
            <p className="mt-1 text-[13px] text-muted">{l}</p>
          </div>
        ))}
      </section>

      {(topTask || nextExam) && (
        <section aria-label="Учёба" className="group-list">
          {topTask && (
            <p className="flex min-h-[52px] items-center gap-3 px-4 py-2 text-[15px] text-ink">
              <span className="flex-1">Больше всего фокуса — «{topTask.task}»</span>
              <span className="font-semibold tabular-nums">{topTask.minutes} мин</span>
            </p>
          )}
          {nextExam && (
            <p className="flex min-h-[52px] items-center gap-3 px-4 py-2 text-[15px] text-ink">
              <span className="flex-1">Ближайшее — «{nextExam.title}»</span>
              <span className="font-semibold">
                {nextExam.days === 0 ? "сегодня" : `через ${nextExam.days} ${plural(nextExam.days, ["день", "дня", "дней"])}`}
              </span>
            </p>
          )}
        </section>
      )}

      {/* 4. Strongest link */}
      {top ? (
        <section aria-labelledby="top-h" className={`rounded-card-lg p-5 ${SPHERE_STYLE[top.metric.sphere].tint}`}>
          <h2 id="top-h" className={`eyebrow ${SPHERE_STYLE[top.metric.sphere].ink}`}>
            Сильнее всего связано · {SPHERES.find((s) => s.key === top.metric.sphere)?.title}
          </h2>
          <p className="mt-2 text-[17px] font-semibold text-ink">{top.text}</p>
          <p className="mt-2 text-[13px] text-muted">
            По {top.days} {plural(top.days, ["дню", "дням", "дням"])} ваших данных. Это связь, а не причина.
          </p>
        </section>
      ) : (
        <section className="rounded-card-lg bg-surface p-4">
          <p className="font-semibold text-ink">
            Инсайты откроются через {MIN_DAYS - usable} {plural(MIN_DAYS - usable, ["день", "дня", "дней"])}
          </p>
          <p className="mt-1 text-[15px] text-muted">Нужны дни, где есть и чек-ин, и тест.</p>
        </section>
      )}

      <Link href="/insights/" className={`${btnPrimary} w-full`}>
        Выбрать эксперимент
      </Link>
      <p className="text-center text-[13px] text-muted">Сравнение последних 7 дней с предыдущими 7. Не является медицинской консультацией.</p>
    </div>
  );
}
