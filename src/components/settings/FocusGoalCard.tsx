"use client";

import { useEffect, useState } from "react";
import { ChoiceField } from "@/components/ui/controls";
import { DEFAULT_GOAL, GOALS, getFocusGoal, setFocusGoal, type Goal } from "@/lib/focusGoal";

const OPTIONS = GOALS.map((g) => ({ value: String(g), label: `${g} мин` }));

/** «Цель фокуса»: minutes per day that close the focus ring on Today. */
export function FocusGoalCard() {
  const [goal, setGoal] = useState<Goal>(DEFAULT_GOAL);

  useEffect(() => {
    let alive = true;
    getFocusGoal()
      .then((g) => alive && setGoal(g))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function change(v: string) {
    const saved = await setFocusGoal(Number(v)).catch(() => null);
    if (saved) setGoal(saved);
  }

  return (
    <section aria-labelledby="s-goal">
      <h2 id="s-goal" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
        Цель фокуса
      </h2>
      <div className="group-list p-4">
        <ChoiceField legend="Минут фокус-сессий в день" name="goal" value={String(goal)} options={OPTIONS} onChange={change} columns={2} />
      </div>
      <p className="px-4 pt-1.5 text-[13px] leading-snug text-muted">Кольцо «Фокус» на главной замкнётся, когда наберёте эти минуты. Начните с малого.</p>
    </section>
  );
}
