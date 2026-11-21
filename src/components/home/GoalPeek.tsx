"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronRight, Flag } from "lucide-react";
import type { Goal } from "@/lib/db";
import { goalProgress, listGoals, toggleStep } from "@/lib/goals";
import { tap } from "@/lib/haptics";

/** Today: the nearest active goal with its next step (one tap to tick it). */
export function GoalPeek() {
  const [goal, setGoal] = useState<Goal | null | undefined>(undefined);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let alive = true;
    listGoals()
      .then((g) => alive && setGoal(g.find((x) => !x.done) ?? null))
      .catch(() => alive && setGoal(null));
    return () => {
      alive = false;
    };
  }, [rev]);

  if (!goal) return null;
  const nextIdx = goal.steps.findIndex((s) => !s.done);
  const p = goalProgress(goal);

  return (
    <section aria-labelledby="goal-peek-h">
      <div className="flex items-baseline justify-between px-4">
        <h2 id="goal-peek-h" className="pb-1.5 text-[13px] text-muted uppercase">
          Цель
        </h2>
        <Link href="/goals/" className="-my-3 inline-flex min-h-11 items-center text-[15px] text-link">
          Все цели
        </Link>
      </div>
      <div className="group-list">
        <Link href="/goals/" className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 active:bg-pressed">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-s-rest text-white">
            <Flag size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] text-ink">{goal.title}</span>
            {goal.steps.length > 0 && (
              <span aria-hidden className="mt-1.5 block h-1.5 rounded-full bg-fill">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${p * 100}%` }} />
              </span>
            )}
          </span>
          <ChevronRight aria-hidden size={18} className="text-chevron" />
        </Link>
        {nextIdx >= 0 && (
          <button
            type="button"
            role="checkbox"
            aria-checked={false}
            onClick={async () => {
              await toggleStep(goal.id!, nextIdx).catch(() => null);
              tap("light");
              setRev((n) => n + 1);
            }}
            className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left active:bg-pressed"
          >
            <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-fill-strong">
              <Check size={14} strokeWidth={3} className="opacity-0" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-muted">Следующий шаг</span>
              <span className="block text-[17px] text-ink">{goal.steps[nextIdx]!.text}</span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
