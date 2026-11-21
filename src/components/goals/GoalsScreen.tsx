"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Flag, Plus, Trash2, Undo2 } from "lucide-react";
import type { Goal } from "@/lib/db";
import { dayKey } from "@/lib/db";
import {
  GOAL_TITLE_MAX,
  GOAL_WHY_MAX,
  MAX_GOALS,
  MAX_STEPS,
  STEP_MAX,
  addGoal,
  addStep,
  deleteGoal,
  goalProgress,
  listGoals,
  setGoalDone,
  toggleStep,
} from "@/lib/goals";
import { daysUntil } from "@/lib/exams";
import { hasCrisisWording } from "@/lib/crisis";
import { plural } from "@/lib/plural";
import { tap } from "@/lib/haptics";
import { cardHref } from "@/lib/libraryLinks";
import { CrisisCard } from "@/components/CrisisCard";
import { btnPrimary } from "@/components/ui/controls";

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const input = "min-h-11 w-full rounded-[10px] bg-fill px-3 text-[17px] text-ink placeholder:text-muted";

function dueText(due: string): string {
  const d = daysUntil(due);
  const date = dateFmt.format(new Date(`${due}T12:00:00`));
  if (d < 0) return `${date} · срок прошёл`;
  if (d === 0) return `${date} · сегодня`;
  return `до ${date} · ${d} ${plural(d, ["день", "дня", "дней"])}`;
}

/** «Цели»: a few goals with small steps; reaching one is celebrated, nothing is ever «failed». */
export function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [cheer, setCheer] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listGoals()
      .then(setGoals)
      .catch(() => setGoals([]));
  }, []);
  useEffect(load, [load]);

  if (goals === null) return <div aria-busy="true" className="h-48 animate-pulse rounded-card-lg bg-surface" />;
  const active = goals.filter((g) => !g.done);
  const reached = goals.filter((g) => g.done);

  async function reach(g: Goal) {
    if (!(await setGoalDone(g.id!, true).catch(() => false))) return setError("Не получилось сохранить. Попробуйте ещё раз.");
    tap("success");
    setCheer(g.id!);
    load();
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="px-4 text-[15px] text-danger">
          {error}
        </p>
      )}
      {cheer !== null && (
        <p role="status" className="animate-pop rounded-card-lg bg-leaf/12 p-4 text-center text-[17px] font-semibold text-ink">
          🎉 Цель достигнута! Загляните в «Сад» — там новая награда.
        </p>
      )}

      {active.length === 0 && !adding && (
        <section className="rounded-card-lg bg-surface p-5 text-center">
          <Flag aria-hidden size={32} className="mx-auto text-link" />
          <p className="mt-3 text-[17px] font-semibold text-ink">Пока нет целей</p>
          <p className="mt-1 text-[15px] text-muted">Например: «Сдать матанализ на 4+» и 3 шага к ней.</p>
        </section>
      )}

      {active.map((g) => (
        <GoalCard key={g.id} goal={g} onChange={load} onReach={() => reach(g)} onError={setError} />
      ))}

      {adding ? (
        <NewGoal
          onDone={(ok, msg) => {
            if (ok) {
              setAdding(false);
              setError(null);
              load();
            } else setError(msg ?? null);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          disabled={active.length >= MAX_GOALS}
          onClick={() => setAdding(true)}
          className="flex min-h-[56px] w-full items-center gap-3 rounded-card-lg bg-surface px-4 text-left text-[17px] text-link active:bg-pressed disabled:text-muted"
        >
          <Plus aria-hidden size={22} /> {active.length >= MAX_GOALS ? `Не больше ${MAX_GOALS} целей сразу` : "Новая цель"}
        </button>
      )}

      <p className="px-4 text-[13px] text-muted">
        Помогает записать шаг как план «Если…, то…».{" "}
        <a href={cardHref("if-then")} className="text-link underline">
          Почему это работает
        </a>
      </p>

      {reached.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-[15px] text-link">
            Достигнуто · {reached.length}
            <span aria-hidden className="transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <ul className="group-list mt-1">
            {reached.map((g) => (
              <li key={g.id} className="flex min-h-[52px] items-center gap-3 py-2 pr-1 pl-4">
                <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-leaf text-white">
                  <Check size={16} strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[17px] text-ink">{g.title}</span>
                <button
                  type="button"
                  aria-label={`Вернуть в активные: ${g.title}`}
                  onClick={async () => {
                    await setGoalDone(g.id!, false).catch(() => {});
                    load();
                  }}
                  className="grid size-11 place-items-center text-muted"
                >
                  <Undo2 aria-hidden size={18} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function GoalCard({ goal, onChange, onReach, onError }: { goal: Goal; onChange: () => void; onReach: () => void; onError: (m: string | null) => void }) {
  const [step, setStep] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const p = goalProgress(goal);
  const allDone = goal.steps.length > 0 && p === 1;

  return (
    <section aria-labelledby={`goal-${goal.id}`} className="rounded-card-lg bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id={`goal-${goal.id}`} className="text-[20px] leading-tight font-bold text-ink">
            {goal.title}
          </h2>
          {goal.why && <p className="mt-1 text-[15px] text-muted">{goal.why}</p>}
          {goal.due && <p className="mt-1 text-[13px] font-semibold text-s-rest-ink">{dueText(goal.due)}</p>}
        </div>
        <button type="button" aria-label={`Удалить цель «${goal.title}»`} onClick={() => setConfirmDel(true)} className="-mt-2 -mr-2 grid size-11 place-items-center text-muted">
          <Trash2 aria-hidden size={18} />
        </button>
      </div>

      {confirmDel && (
        <div role="group" aria-label="Удалить цель?" className="mt-3 flex items-center gap-2 rounded-[12px] bg-danger-tint p-3">
          <span className="flex-1 text-[15px] text-ink">Удалить цель и её шаги?</span>
          <button type="button" onClick={() => setConfirmDel(false)} className="min-h-11 px-3 text-[15px] text-link">
            Нет
          </button>
          <button
            type="button"
            onClick={async () => {
              await deleteGoal(goal.id!).catch(() => {});
              onChange();
            }}
            className="min-h-11 px-3 text-[15px] font-semibold text-danger"
          >
            Удалить
          </button>
        </div>
      )}

      {goal.steps.length > 0 && (
        <>
          <div className="mt-3 flex items-center gap-2" aria-hidden>
            <div className="h-2 flex-1 rounded-full bg-fill">
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${p * 100}%` }} />
            </div>
            <span className="text-[13px] text-muted tabular-nums">
              {goal.steps.filter((s) => s.done).length}/{goal.steps.length}
            </span>
          </div>
          <ul className="mt-2">
            {goal.steps.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={s.done}
                  onClick={async () => {
                    await toggleStep(goal.id!, i).catch(() => null);
                    if (!s.done) tap("light");
                    onChange();
                  }}
                  className="flex min-h-11 w-full items-center gap-3 text-left"
                >
                  <span
                    aria-hidden
                    className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${s.done ? "border-accent bg-accent text-white" : "border-fill-strong"}`}
                  >
                    {s.done && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className={`text-[17px] ${s.done ? "text-muted line-through" : "text-ink"}`}>{s.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {goal.steps.length < MAX_STEPS && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await addStep(goal.id!, step).catch(() => null);
            if (r) {
              setStep("");
              onError(null);
              onChange();
            }
          }}
        >
          <label className="sr-only" htmlFor={`step-${goal.id}`}>
            Новый шаг
          </label>
          <input id={`step-${goal.id}`} value={step} maxLength={STEP_MAX} onChange={(e) => setStep(e.target.value)} placeholder="+ шаг" autoComplete="off" className={input} />
          {step.trim() && (
            <button type="submit" className="min-h-11 shrink-0 px-3 text-[15px] font-semibold text-link">
              Добавить
            </button>
          )}
        </form>
      )}
      {hasCrisisWording(`${goal.title} ${goal.why ?? ""} ${step}`) && (
        <div className="mt-3">
          <CrisisCard />
        </div>
      )}

      <button type="button" onClick={onReach} className={`${allDone ? btnPrimary : "min-h-11 text-[15px] font-semibold text-link"} mt-3 w-full`}>
        {allDone ? "🎉 Цель достигнута" : "Отметить цель достигнутой"}
      </button>
    </section>
  );
}

function NewGoal({ onDone, onCancel }: { onDone: (ok: boolean, msg?: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [due, setDue] = useState("");
  const [steps, setSteps] = useState(["", "", ""]);

  return (
    <form
      aria-label="Новая цель"
      className="space-y-3 rounded-card-lg bg-surface p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await addGoal({ title, why, due: due || undefined, steps: steps.filter((s) => s.trim()) }).catch(() => null);
        if (r?.ok) onDone(true);
        else
          onDone(
            false,
            r?.reason === "full"
              ? `Не больше ${MAX_GOALS} целей сразу.`
              : r?.reason === "consent"
                ? "Нет согласия на хранение данных — откройте приложение заново."
                : "Проверьте название и дату (не раньше сегодня).",
          );
      }}
    >
      <div>
        <label htmlFor="g-title" className="block text-[15px] font-semibold text-ink">
          Цель
        </label>
        <input id="g-title" required value={title} maxLength={GOAL_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Например, сдать сессию без долгов" autoComplete="off" className={`${input} mt-1.5`} />
      </div>
      <div>
        <label htmlFor="g-why" className="block text-[15px] font-semibold text-ink">
          Зачем мне это <span className="font-normal text-muted">· необязательно</span>
        </label>
        <input id="g-why" value={why} maxLength={GOAL_WHY_MAX} onChange={(e) => setWhy(e.target.value)} placeholder="Чтобы летом спокойно отдохнуть" autoComplete="off" className={`${input} mt-1.5`} />
      </div>
      <div>
        <label htmlFor="g-due" className="block text-[15px] font-semibold text-ink">
          Срок <span className="font-normal text-muted">· необязательно</span>
        </label>
        <input id="g-due" type="date" value={due} min={dayKey()} onChange={(e) => setDue(e.target.value)} className={`${input} mt-1.5`} />
      </div>
      <fieldset>
        <legend className="text-[15px] font-semibold text-ink">Первые шаги</legend>
        <div className="mt-1.5 space-y-2">
          {steps.map((s, i) => (
            <input
              key={i}
              aria-label={`Шаг ${i + 1}`}
              value={s}
              maxLength={STEP_MAX}
              onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={["Если пара закончилась, то 25 минут на конспект", "Решить 10 задач из сборника", "Записаться на консультацию"][i]}
              autoComplete="off"
              className={input}
            />
          ))}
        </div>
      </fieldset>
      {hasCrisisWording(`${title} ${why} ${steps.join(" ")}`) && <CrisisCard />}
      <div className="flex gap-2">
        <button type="submit" className={`${btnPrimary} flex-1`}>
          Сохранить
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 flex-1 text-[17px] text-link">
          Отмена
        </button>
      </div>
    </form>
  );
}
