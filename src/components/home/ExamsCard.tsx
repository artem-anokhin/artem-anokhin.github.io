"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Plus, Timer, Trash2 } from "lucide-react";
import { db, dayKey } from "@/lib/db";
import { EXAM_TITLE_MAX, MAX_EXAMS, addExam, daysUntil, prepMinutes, removeExam, upcomingExams, type Exam } from "@/lib/exams";
import { hasCrisisWording } from "@/lib/crisis";
import { plural } from "@/lib/plural";
import { CrisisCard } from "@/components/CrisisCard";
import { btnPrimary } from "@/components/ui/controls";

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

function when(days: number): string {
  if (days === 0) return "Сегодня";
  if (days === 1) return "Завтра";
  return `Через ${days} ${plural(days, ["день", "дня", "дней"])}`;
}

/** «Экзамены и дедлайны» on Today: countdown to a few dates the student cares about. */
export function ExamsCard({ onChange }: { onChange?: () => void } = {}) {
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [prep, setPrep] = useState<Map<string, number>>(new Map());
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState(false);
  const [rev, setRev] = useState(0);
  const today = dayKey();

  useEffect(() => {
    let alive = true;
    Promise.all([upcomingExams(), db.sessions.toArray()])
      .then(([e, s]) => {
        if (!alive) return;
        setExams(e);
        setPrep(prepMinutes(e, s));
      })
      .catch(() => alive && setExams([]));
    return () => {
      alive = false;
    };
  }, [rev]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const ok = await addExam(title, date).catch(() => null);
    if (!ok) return setError(true);
    setTitle("");
    setDate("");
    setError(false);
    setAdding(false);
    setRev((n) => n + 1);
    onChange?.();
  }

  async function onRemove(id: string) {
    await removeExam(id).catch(() => {});
    setRev((n) => n + 1);
    onChange?.();
  }

  if (exams === null) return null;

  const form = adding && (
    <form onSubmit={onAdd} className="space-y-3 rounded-card-lg bg-surface p-4" aria-label="Новый экзамен или дедлайн">
      <div>
        <label htmlFor="exam-title" className="block text-[15px] font-semibold text-ink">
          Что сдаёте
        </label>
        <input
          id="exam-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={EXAM_TITLE_MAX}
          placeholder="Например, экзамен по матанализу"
          required
          autoComplete="off"
          className="mt-1.5 min-h-11 w-full rounded-[10px] bg-fill px-3 text-[17px] text-ink placeholder:text-muted"
        />
      </div>
      <div>
        <label htmlFor="exam-date" className="block text-[15px] font-semibold text-ink">
          Дата
        </label>
        <input
          id="exam-date"
          type="date"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
          required
          className="mt-1.5 min-h-11 w-full rounded-[10px] bg-fill px-3 text-[17px] text-ink"
        />
      </div>
      {hasCrisisWording(title) && <CrisisCard />}
      {error && (
        <p role="alert" className="text-[15px] text-danger">
          Не получилось добавить. Проверьте название и дату (не раньше сегодня).
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className={`${btnPrimary} flex-1`}>
          Добавить
        </button>
        <button type="button" onClick={() => setAdding(false)} className="min-h-11 flex-1 rounded-full text-[17px] text-link">
          Отмена
        </button>
      </div>
    </form>
  );

  if (exams.length === 0) {
    return (
      <div className="space-y-3">
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-[60px] w-full items-center gap-3 rounded-card-lg bg-surface px-4 py-2 text-left active:bg-pressed"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-s-rest text-white">
              <GraduationCap aria-hidden size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] text-ink">Экзамены и дедлайны</span>
              <span className="block text-[13px] text-muted">Добавьте дату — покажем, сколько дней осталось</span>
            </span>
            <Plus aria-hidden size={20} className="text-link" />
          </button>
        )}
        {form}
      </div>
    );
  }

  return (
    <section aria-labelledby="exams-h" className="space-y-3">
      <div>
        <div className="flex items-baseline justify-between px-4">
          <h2 id="exams-h" className="pb-1.5 text-[13px] text-muted uppercase">
            Экзамены и дедлайны
          </h2>
          {!adding && exams.length < MAX_EXAMS && (
            <button type="button" onClick={() => setAdding(true)} className="-my-3 inline-flex min-h-11 items-center text-[15px] text-link">
              Добавить
            </button>
          )}
        </div>
        <ul className="group-list">
          {exams.map((e) => {
            const d = daysUntil(e.date, today);
            return (
              <li key={e.id} className="flex min-h-[60px] items-center gap-3 py-2 pl-4 pr-1">
                <span
                  className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-[10px] leading-none tabular-nums ${
                    d <= 3 ? "bg-accent text-white" : "bg-fill text-ink"
                  }`}
                  aria-hidden
                >
                  <span className="text-[17px] font-bold">{d}</span>
                  <span className={`mt-0.5 text-[10px] font-medium ${d <= 3 ? "text-white/85" : "text-muted"}`}>дн.</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] text-ink">{e.title}</span>
                  <span className="block text-[13px] text-muted first-letter:uppercase">
                    {when(d)} · {dateFmt.format(new Date(`${e.date}T12:00:00`))}
                    {(prep.get(e.id) ?? 0) > 0 && ` · готовились ${prep.get(e.id)} мин`}
                  </span>
                </span>
                <Link
                  href={`/focus/?task=${encodeURIComponent(e.title)}`}
                  aria-label={`Фокус-сессия: ${e.title}`}
                  className="grid size-11 shrink-0 place-items-center text-link"
                >
                  <Timer aria-hidden size={20} />
                </Link>
                <button
                  type="button"
                  onClick={() => onRemove(e.id)}
                  aria-label={`Удалить «${e.title}»`}
                  className="grid size-11 shrink-0 place-items-center text-muted"
                >
                  <Trash2 aria-hidden size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {form}
    </section>
  );
}
