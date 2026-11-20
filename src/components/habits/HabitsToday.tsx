"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Plus, SlidersHorizontal } from "lucide-react";
import { db, dayKey, type Habit, type HabitLog } from "@/lib/db";
import { activeHabits, doneInLastDays, toggleHabit } from "@/lib/habits";
import { SPHERE_STYLE } from "@/lib/spheres";

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
    setRev((n) => n + 1);
    onChange?.();
  }

  if (habits === null) return null;

  if (habits.length === 0) {
    return (
      <Link href="/habits/" className="pressable flex items-center gap-4 rounded-card-lg bg-surface p-4 shadow-soft">
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-s-activity-tint text-s-activity-ink">
          <Plus aria-hidden size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">Добавьте привычки</span>
          <span className="block text-[14px] text-muted">1–3 маленьких шага, которые поддержат фокус</span>
        </span>
      </Link>
    );
  }

  const done = habits.filter((h) => logs.some((l) => l.habitId === h.id && l.date === today)).length;

  return (
    <section aria-labelledby="habits-h">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="habits-h" className="eyebrow">
          Привычки · {done} из {habits.length}
        </h2>
        <Link href="/habits/" className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-navy">
          <SlidersHorizontal aria-hidden size={16} /> Настроить
        </Link>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-card-lg bg-surface shadow-soft">
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
                className="pressable flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg"
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-[14px] ${st.tint} ${st.ink}`}>
                  <Icon aria-hidden size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-semibold ${on ? "text-muted line-through decoration-2" : "text-ink"}`}>{h.title}</span>
                  <span className="block text-[13px] text-muted">{week} из 7 дней</span>
                </span>
                <span
                  aria-hidden
                  className={`grid size-8 shrink-0 place-items-center rounded-full transition-colors ${on ? "animate-pop bg-leaf text-white" : "border-2 border-line"}`}
                >
                  {on && <Check size={18} strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
