"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { db, dayKey, type Habit, type HabitLog } from "@/lib/db";
import { activeHabits, doneInLastDays, toggleHabit } from "@/lib/habits";
import { SPHERE_STYLE } from "@/lib/spheres";
import { tap } from "@/lib/haptics";

/** «Привычки» block on Сегодня: one tap to mark, gentle «N из 7» instead of streaks. */
export function HabitsToday({ onChange }: { onChange?: () => void }) {
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const today = dayKey();

  const [rev, setRev] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([activeHabits(), db.habitLogs.toArray()])
      .then(([h, l]) => {
        if (!alive) return;
        setHabits(h);
        setLogs(l);
      })
      .catch(() => alive && setHabits([]));
    return () => {
      alive = false;
    };
  }, [rev]);

  async function toggle(id: number) {
    // Date at tap time, not render time (a screen left open past midnight).
    const res = await toggleHabit(id, dayKey()).catch(() => null);
    if (res === null) return;
    tap(res ? "success" : "light");
    setRev((n) => n + 1);
    onChange?.();
  }

  if (habits === null) return null;

  if (habits.length === 0) {
    return (
      <Link href="/habits/" className="flex min-h-[60px] items-center gap-3 rounded-card-lg bg-surface px-4 py-2 active:bg-pressed">
        <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-s-activity text-white">
          <Plus aria-hidden size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] text-ink">Добавьте привычки</span>
          <span className="block text-[13px] text-muted">1–3 маленьких шага для фокуса</span>
        </span>
      </Link>
    );
  }

  const done = habits.filter((h) => logs.some((l) => l.habitId === h.id && l.date === today)).length;

  return (
    <section aria-labelledby="habits-h">
      <div className="flex items-baseline justify-between px-4">
        <h2 id="habits-h" className="pb-1.5 text-[13px] text-muted uppercase">
          Привычки · <span className="tabular-nums">{done}/{habits.length}</span>
        </h2>
        <Link href="/habits/" className="-my-3 inline-flex min-h-11 items-center text-[15px] text-link">
          Изменить
        </Link>
      </div>
      <ul className="group-list">
        {habits.map((h) => {
          const st = SPHERE_STYLE[h.sphere];
          const Icon = st.icon;
          const on = logs.some((l) => l.habitId === h.id && l.date === today);
          const week = doneInLastDays(logs, h.id!, today);
          return (
            <li key={h.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(h.id!)}
                className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left active:bg-pressed"
              >
                <span
                  aria-hidden
                  className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors ${on ? "animate-pop bg-accent text-white" : "ring-[1.5px] ring-chevron ring-inset"}`}
                >
                  {on && <Check size={15} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[17px] ${on ? "text-muted" : "text-ink"}`}>{h.title}</span>
                  <span className="block text-[13px] text-muted">{week} из 7 дней</span>
                </span>
                <Icon aria-hidden size={18} className={st.text} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
