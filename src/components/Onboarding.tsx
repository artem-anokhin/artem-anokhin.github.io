"use client";

import { BookOpen, ChevronLeft, ChevronRight, ShieldCheck, Sprout } from "lucide-react";
import { useState } from "react";
import type { StroopSummary } from "@/lib/brainTests";
import { HELP_LINES } from "@/lib/crisis";
import { cardHref } from "@/lib/libraryLinks";
import { BLOCKERS, GOALS, TREE_NAME_MAX, completeOnboarding, startPlan, type Blocker, type StartGoal } from "@/lib/start";
import { tap } from "@/lib/haptics";
import { WarmUp } from "./onboarding/WarmUp";
import { btnPrimary } from "./ui/controls";
import { ProgressRing, TreeScene } from "./ui/visuals";

type Step = "hook" | "warmup" | "goal" | "blocker" | "plan" | "consent";
const ORDER: Step[] = ["hook", "warmup", "goal", "blocker", "plan", "consent"];
const SPHERE_BG = { mind: "bg-s-mind", sleep: "bg-s-sleep", activity: "bg-s-activity", rest: "bg-s-rest", caffeine: "bg-s-caffeine" } as const;

/**
 * First experience (Duolingo/Lumosity pattern: value before setup):
 * hook → 20-second warm-up → two questions → start point + personal week plan → safety & consent.
 * Nothing is written until consent; then profile, answers and the warm-up score are saved together.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("hook");
  const [warm, setWarm] = useState<StroopSummary | null>(null);
  const [goal, setGoal] = useState<StartGoal | null>(null);
  const [blocker, setBlocker] = useState<Blocker | null>(null);
  const [treeName, setTreeName] = useState("");
  const [about, setAbout] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const idx = ORDER.indexOf(step);
  const go = (s: Step) => {
    setStep(s);
    window.scrollTo?.(0, 0);
  };

  async function finish() {
    if (!consent || !goal || !blocker) return;
    setSaving(true);
    setError(false);
    try {
      await completeOnboarding({ goal, blocker, score: warm?.score ?? null, treeName }, consent);
      tap("success");
      onDone();
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  if (step === "warmup") {
    return (
      <WarmUp
        onDone={(s) => {
          setWarm(s);
          go("goal");
        }}
        onSkip={() => go("goal")}
      />
    );
  }

  const pick = <T,>(set: (v: T) => void, v: T, next: Step) => {
    set(v);
    tap("light");
    setTimeout(() => go(next), 180);
  };

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="flex min-h-11 items-center justify-between">
          {idx > 0 ? (
            <button
              type="button"
              onClick={() => go(ORDER[idx - 1] === "warmup" ? "hook" : ORDER[idx - 1]!)}
              className="pressable -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-3 font-semibold text-link hover:bg-soft"
            >
              <ChevronLeft aria-hidden size={20} /> Назад
            </button>
          ) : (
            <p className="text-[17px] font-bold tracking-[-0.01em] text-ink">
              Focus<span className="text-link">AI</span>
            </p>
          )}
          <span className="sr-only">
            Шаг {idx + 1} из {ORDER.length}
          </span>
          <span aria-hidden className="flex gap-1.5">
            {ORDER.map((s, i) => (
              <span key={s} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-accent" : i < idx ? "w-1.5 bg-accent/40" : "w-1.5 bg-fill-strong"}`} />
            ))}
          </span>
        </div>

        <section key={step} className="stagger mt-6 flex flex-1 flex-col">
          {step === "hook" && (
            <>
              <TreeScene stage={3} wilting={false} title="Сад фокуса" className="h-56 rounded-card-lg" />
              <h1 className="title mt-8 text-[34px] text-balance">
                Разомнём фокус <span className="text-link">за 20 секунд?</span>
              </h1>
              <p className="mt-3 text-[17px] text-muted">Короткая разминка, два вопроса — и личный план на первую неделю. Без регистрации.</p>
              {about && (
                <ul className="mt-5 space-y-3 rounded-card-lg bg-surface p-4">
                  {[
                    ["30 секунд", "чек-ин дня: сон, кофе, настроение"],
                    ["90 секунд", "тест реакции — ваш Focus Score"],
                    ["25 минут", "фокус-сессия, можно вместе с другом"],
                    ["7 дней", "и вы увидите, что связано с фокусом"],
                  ].map(([a, b]) => (
                    <li key={a} className="flex items-baseline gap-3">
                      <span className="w-24 shrink-0 text-[15px] font-semibold text-ink tabular-nums">{a}</span>
                      <span className="text-[15px] text-ink">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex-1" />
              <button type="button" className={`${btnPrimary} mt-8 w-full`} onClick={() => go("warmup")}>
                Поехали
              </button>
              {!about && (
                <button type="button" onClick={() => setAbout(true)} className="mt-2 min-h-11 text-[15px] text-link">
                  Что умеет приложение?
                </button>
              )}
            </>
          )}

          {step === "goal" && (
            <Question
              title="Что сейчас главное?"
              sub="Подберём план под вашу ситуацию."
              options={GOALS}
              value={goal}
              onPick={(v) => pick(setGoal, v, "blocker")}
            />
          )}

          {step === "blocker" && (
            <Question
              title="Что больше всего мешает сосредоточиться?"
              sub="Выберите главное — остальное можно позже."
              options={BLOCKERS}
              value={blocker}
              onPick={(v) => pick(setBlocker, v, "plan")}
            />
          )}

          {step === "plan" && goal && blocker && (
            <>
              <div className="grid place-items-center rounded-card-lg bg-surface py-6" role="status">
                {warm ? (
                  <>
                    <ProgressRing value={warm.score / 100} size={160} stroke={14}>
                      <span className="stat text-[48px] text-ink">{warm.score}</span>
                    </ProgressRing>
                    <p className="mt-3 text-[17px] font-semibold text-ink">Ваша точка отсчёта</p>
                    <p className="text-[13px] text-muted">«Цвет и слово» — внимание и торможение лишних реакций</p>
                    <p className="mt-1 px-6 text-center text-[13px] text-muted">
                      Точность {Math.round(warm.accuracy * 100)}% · {warm.medianRt} мс. Одна попытка — только примерная оценка, шкала наша. Сравнивайте себя с собой.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="grid size-20 place-items-center rounded-full bg-s-activity-tint text-s-activity-ink">
                      <Sprout aria-hidden size={40} />
                    </span>
                    <p className="mt-3 text-[17px] font-semibold text-ink">Точку отсчёта поставим позже</p>
                    <p className="mt-1 px-6 text-center text-[13px] text-muted">Тест реакции займёт 90 секунд — в любой день.</p>
                  </>
                )}
              </div>
              <h1 className="title mt-6 text-[28px]">Ваша неделя старта</h1>
              <p className="mt-1 text-[15px] text-muted">Три шага по вашим ответам. Это правила приложения, а не ответ AI.</p>
              <ul className="group-list mt-4">
                {startPlan({ goal, blocker }).map((p, i) => (
                  <li key={p.title} className="flex gap-3 px-4 py-3">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-[8px] text-[15px] font-semibold text-white ${SPHERE_BG[p.sphere]}`}>{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-semibold text-ink">{p.title}</span>
                      <span className="block text-[15px] text-muted">{p.text}</span>
                      {p.card && (
                        <a href={cardHref(p.card)} target="_blank" rel="noopener" className="mt-0.5 inline-flex min-h-11 items-center gap-1 text-[13px] text-link">
                          <BookOpen aria-hidden size={14} /> Почему так
                          <span className="sr-only"> (откроется в новой вкладке)</span>
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex-1" />
              <div className="sticky bottom-0 -mx-5 mt-6 bg-bg/95 px-5 pt-2 pb-1 backdrop-blur">
                <button type="button" className={`${btnPrimary} w-full`} onClick={() => go("consent")}>
                  Далее
                </button>
              </div>
            </>
          )}

          {step === "consent" && (
            <>
              <span className="grid size-16 place-items-center rounded-full bg-s-activity-tint text-s-activity-ink">
                <ShieldCheck aria-hidden size={34} />
              </span>
              <h1 className="title mt-5 text-[30px] text-balance">
                Ваши данные{"\u00a0"}— <span className="text-link">только у вас</span>
              </h1>
              <p className="mt-2 text-[15px] text-ink">Всё хранится на этом телефоне: нет аккаунтов и сервера. Выгрузить или удалить можно в настройках.</p>

              <div className="mt-5 rounded-card-lg bg-surface p-4">
                <p className="inline-flex rounded-[8px] bg-sand px-2.5 py-1 text-[13px] font-semibold text-sand-ink">Не является медицинской консультацией</p>
                <p className="mt-2 text-[15px] text-ink">Приложение помогает замечать связи, но не ставит диагнозов. Если станет тяжело, поговорить можно бесплатно:</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-4">
                  {HELP_LINES.map((l) => (
                    <a key={l.phone} href={`tel:${l.phone}`} className="inline-flex min-h-11 items-center gap-2 text-link" aria-label={`${l.phone}, ${l.label}`}>
                      <span className="stat text-[22px]">{l.phone}</span>
                    </a>
                  ))}
                  <span className="text-[13px] text-muted">или психолог вашего вуза</span>
                </p>
              </div>

              <label htmlFor="tree-name" className="mt-5 block px-1 text-[15px] font-semibold text-ink">
                Как назовём ваше дерево? <span className="font-normal text-muted">(необязательно)</span>
              </label>
              <input
                id="tree-name"
                value={treeName}
                maxLength={TREE_NAME_MAX}
                onChange={(e) => setTreeName(e.target.value)}
                placeholder="Росток"
                className="mt-2 min-h-11 w-full rounded-[10px] bg-surface px-3 text-[17px] text-ink ring-1 ring-line ring-inset placeholder:text-muted"
              />

              <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 rounded-card bg-surface p-4 has-[:checked]:ring-2 has-[:checked]:ring-accent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-6 shrink-0 accent-navy" />
                <span className="text-ink">Я согласен(на) хранить свои ответы на этом устройстве для личной статистики</span>
              </label>
              <a href="/privacy/" target="_blank" rel="noopener" className="mt-2 inline-flex min-h-11 items-center text-[15px] font-semibold text-link underline underline-offset-4">
                Политика конфиденциальности
              </a>
              <p className="mt-1 text-[13px] text-muted">До согласия мы ничего не сохраняем: если закрыть страницу, разминку и ответы придётся пройти заново.</p>
              {error && (
                <p role="alert" className="mt-3 text-sm font-medium text-ink">
                  Не удалось сохранить. Попробуйте ещё раз.
                </p>
              )}
              <div className="flex-1" />
              <button
                type="button"
                className={`${btnPrimary} mt-6 w-full`}
                disabled={!consent || saving}
                onClick={finish}
                aria-describedby={!consent ? "consent-hint" : undefined}
              >
                Начать
              </button>
              {!consent && (
                <p id="consent-hint" className="mt-2 text-center text-sm text-muted">
                  Чтобы начать, отметьте согласие
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Question<T extends string>({
  title,
  sub,
  options,
  value,
  onPick,
}: {
  title: string;
  sub: string;
  options: { value: T; label: string; sub: string }[];
  value: T | null;
  onPick: (v: T) => void;
}) {
  return (
    <>
      <h1 className="title text-[30px] text-balance">{title}</h1>
      <p className="mt-2 text-[17px] text-muted">{sub}</p>
      <div className="mt-6 grid gap-3" role="group" aria-label={title}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(o.value)}
              className={`pressable flex min-h-[68px] items-center gap-3 rounded-card-lg px-4 py-3 text-left transition-colors ${on ? "bg-accent text-white" : "bg-surface text-ink active:bg-pressed"}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold">{o.label}</span>
                <span className={`block text-[15px] ${on ? "text-white/85" : "text-muted"}`}>{o.sub}</span>
              </span>
              <ChevronRight aria-hidden size={18} className={on ? "text-white" : "text-chevron"} />
            </button>
          );
        })}
      </div>
    </>
  );
}
