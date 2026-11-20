"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { SPHERES, type SphereKey } from "@/lib/checkin";
import type { Habit } from "@/lib/db";
import { HABIT_FORMATION, HABIT_IDEAS } from "@/lib/habitIdeas";
import { HABIT_TITLE_MAX, MAX_HABITS, activeHabits, addHabit, archiveHabit } from "@/lib/habits";
import { SPHERE_STYLE } from "@/lib/spheres";
import { btnPrimary } from "@/components/ui/controls";

const IDEAS_FIRST = 5;

const REASON: Record<string, string> = {
  limit: `Уже ${MAX_HABITS} привычек — уберите одну, чтобы добавить новую.`,
  duplicate: "Такая привычка уже есть.",
  empty: "Напишите, что хотите делать.",
  consent: "Сначала дайте согласие на хранение данных.",
};

/** /habits/: manage up to 5 habits — sourced ideas or your own. */
export function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [title, setTitle] = useState("");
  const [sphere, setSphere] = useState<SphereKey>("work");
  const [msg, setMsg] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [rev, setRev] = useState(0);
  const load = () => setRev((n) => n + 1);
  useEffect(() => {
    let alive = true;
    activeHabits()
      .then((h) => alive && setHabits(h))
      .catch(() => alive && setHabits([]));
    return () => {
      alive = false;
    };
  }, [rev]);

  async function add(t: string, s: SphereKey, ideaId?: string) {
    const r = await addHabit(t, s, ideaId);
    setMsg(r.ok ? `Добавлено: ${r.habit.title}` : REASON[r.reason]!);
    if (r.ok) setTitle("");
    load();
  }

  async function remove(h: Habit) {
    await archiveHabit(h.id!);
    setMsg(`Убрано: ${h.title}. Отметки прошлых дней сохранены.`);
    load();
  }

  if (habits === null) return <div aria-busy="true" className="h-64 animate-pulse rounded-card-lg bg-soft" />;
  const full = habits.length >= MAX_HABITS;
  const taken = new Set(habits.map((h) => h.ideaId).filter(Boolean));

  return (
    <div className="stagger space-y-8">
      <Link href="/" className="-mt-2 -ml-1.5 flex min-h-11 w-fit items-center gap-0.5 text-[17px] text-link">
        <ChevronLeft aria-hidden size={20} /> Сегодня
      </Link>

      <p role="status" className="min-h-0 text-[15px] font-medium text-link empty:hidden">
        {msg}
      </p>

      <section aria-labelledby="mine-h">
        <h2 id="mine-h" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
          Мои привычки · {habits.length} из {MAX_HABITS}
        </h2>
        {habits.length === 0 ? (
          <p className="rounded-card-lg bg-surface p-4 text-ink">Пока пусто. Выберите 1–3 идеи ниже — начать с малого проще.</p>
        ) : (
          <ul className="group-list">
            {habits.map((h) => {
              const st = SPHERE_STYLE[h.sphere];
              const Icon = st.icon;
              return (
                <li key={h.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
                  <span className={`grid size-[30px] shrink-0 place-items-center rounded-[7px] text-white ${st.base}`}>
                    <Icon aria-hidden size={18} />
                  </span>
                  <span className="min-w-0 flex-1 text-[17px] text-ink">{h.title}</span>
                  <button
                    type="button"
                    onClick={() => remove(h)}
                    aria-label={`Убрать привычку: ${h.title}`}
                    className="pressable grid size-11 place-items-center rounded-full text-muted hover:bg-bg hover:text-danger"
                  >
                    <Trash2 aria-hidden size={20} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="ideas-h">
        <h2 id="ideas-h" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
          Идеи с источниками
        </h2>
        <ul className="group-list">
          {(showAll ? HABIT_IDEAS : HABIT_IDEAS.slice(0, IDEAS_FIRST)).map((idea) => {
            const st = SPHERE_STYLE[idea.sphere];
            const Icon = st.icon;
            const has = taken.has(idea.id);
            return (
              <li key={idea.id} className="px-4 py-2">
                <div className="flex items-start gap-3">
                  <span className={`mt-2.5 grid size-[30px] shrink-0 place-items-center rounded-[7px] text-white ${st.base}`}>
                    <Icon aria-hidden size={18} />
                  </span>
                  <details className="group min-w-0 flex-1">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center text-[17px] text-ink [&::-webkit-details-marker]:hidden">
                      {idea.title}
                    </summary>
                    <p className="text-[13px] leading-snug text-muted">{idea.why}</p>
                    <a href={idea.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-[13px] text-muted underline">
                      Источник: {idea.source}
                      <span className="sr-only"> (откроется в новой вкладке)</span>
                    </a>
                  </details>
                  <button
                    type="button"
                    disabled={has || full}
                    onClick={() => add(idea.title, idea.sphere, idea.id)}
                    aria-label={has ? `Уже добавлено: ${idea.title}` : `Добавить: ${idea.title}`}
                    className={`pressable grid size-11 shrink-0 place-items-center rounded-full ${has ? "bg-leaf text-white" : "bg-soft text-link disabled:opacity-40"}`}
                  >
                    <Plus aria-hidden size={22} className={has ? "rotate-45" : ""} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {!showAll && (
          <button type="button" onClick={() => setShowAll(true)} className="mt-2 inline-flex min-h-11 items-center px-4 text-[17px] text-link">
            Показать ещё {HABIT_IDEAS.length - IDEAS_FIRST}
          </button>
        )}
      </section>

      <section aria-labelledby="own-h" className="rounded-card-lg bg-surface p-4">
        <h2 id="own-h" className="title text-[22px]">
          Своя привычка
        </h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void add(title, sphere);
          }}
        >
          <label className="block">
            <span className="mb-2 block text-[15px] font-semibold text-ink">Что делать каждый день</span>
            <input
              value={title}
              maxLength={HABIT_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: 20 минут чтения"
              className="h-[50px] w-full rounded-[12px] bg-bg px-4 text-ink placeholder:text-muted"
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-[15px] font-semibold text-ink">Сфера</legend>
            <div className="flex flex-wrap gap-2">
              {SPHERES.map(({ key, title: t }) => {
                const on = key === sphere;
                return (
                  <label
                    key={key}
                    className={`pressable inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 text-[14px] font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                      on ? "bg-accent text-white" : "bg-fill text-ink"
                    }`}
                  >
                    <input type="radio" name="sphere" value={key} checked={on} onChange={() => setSphere(key)} className="sr-only" />
                    {t}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <button type="submit" disabled={full || !title.trim()} className={`${btnPrimary} w-full`}>
            Добавить
          </button>
        </form>
      </section>

      <p className="rounded-card-lg bg-surface p-4 text-[15px] text-ink">
        {HABIT_FORMATION.text}{" "}
        <a href={HABIT_FORMATION.url} target="_blank" rel="noopener noreferrer" className="text-sand-ink underline">
          {HABIT_FORMATION.source}
        </a>
      </p>
    </div>
  );
}
