"use client";

import { useEffect, useRef, useState } from "react";
import { CrisisCard } from "@/components/CrisisCard";
import Link from "next/link";
import { PenLine, X } from "lucide-react";
import { ChoiceField, ScaleField, Stepper, TimeField, YesNoField } from "@/components/ui/controls";
import { SPHERE_STYLE } from "@/lib/spheres";
import {
  ACTIVITY_NOTE_MAX,
  ACTIVITY_OPTIONS,
  FOOD_OPTIONS,
  LIMITS,
  NOTE_MAX,
  REST_OPTIONS,
  SPHERES,
  SPHERE_KEYS,
  formatHours,
  sleepHours,
  type CheckInData,
  type SphereKey,
} from "@/lib/checkin";
import { hasCrisisWording } from "@/lib/crisis";
import type { Mode } from "@/lib/settings";

const TOTAL = SPHERES.length + 1; // 7 spheres + optional note

export function CheckInWizard({
  initial,
  mode,
  onSave,
}: {
  initial: CheckInData;
  mode: Mode;
  onSave: (data: CheckInData) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<CheckInData>(initial);
  // Spheres the user touched; untouched carried-over values are not real answers for insights.
  const [touched, setTouched] = useState<ReadonlySet<SphereKey> | null>(
    initial.answered === undefined ? null : new Set(initial.answered),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the new sphere title so keyboard and screen-reader users follow the step.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo?.({ top: 0 });
  }, [step]);

  const patch = <K extends SphereKey>(key: K, value: Partial<CheckInData[K]>) => {
    setD((prev) => ({ ...prev, [key]: { ...(prev[key] as object), ...value } }));
    setTouched((prev) => (prev === null || prev.has(key) ? prev : new Set(prev).add(key)));
  };

  const isNote = step === SPHERES.length;
  const title = isNote ? "Заметка" : step === 5 ? (mode === "work" ? "Работа" : "Учёба") : (SPHERES[step]?.title ?? "");
  const progress = Math.round(((step + 1) / TOTAL) * 100);

  async function save() {
    setSaving(true);
    setError(false);
    try {
      await onSave({ ...d, answered: touched === null ? undefined : SPHERE_KEYS.filter((k) => touched.has(k)) });
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  const sphereKey = isNote ? null : SPHERES[step]!.key;
  const st = sphereKey ? SPHERE_STYLE[sphereKey] : null;
  const theme = st ?? { base: "bg-navy", tint: "bg-bg", ink: "text-navy" };
  const Icon = st?.icon ?? PenLine;
  const question = isNote ? "Как прошёл день?" : QUESTIONS[sphereKey!];

  return (
    <form
      className="flex min-h-dvh flex-col bg-bg"
      onSubmit={(e) => {
        e.preventDefault();
        if (isNote) void save();
        else setStep(step + 1);
      }}
    >
      <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-[calc(8px+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Закрыть чек-ин" className="pressable grid size-11 shrink-0 place-items-center text-accent">
            <X aria-hidden size={22} />
          </Link>
          <div
            role="progressbar"
            aria-label="Прогресс отметки"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="grid flex-1 grid-cols-8 gap-1"
          >
            {[...SPHERES.map((x) => x.key), "note" as const].map((k, i) => (
              <span
                key={k}
                className={`h-1 rounded-full transition-colors ${
                  i < step ? (k === "note" ? "bg-accent" : SPHERE_STYLE[k].base) : i === step ? theme.base : "bg-[#d1d1d6]"
                }`}
              />
            ))}
          </div>
        </div>

        <section key={step} className="stagger mt-6 space-y-6 pb-6" aria-labelledby="sphere-title">
          <div>
            <span className={`grid size-14 place-items-center rounded-[14px] text-white ${st?.base ?? "bg-accent"}`}>
              <Icon aria-hidden size={28} strokeWidth={2.2} />
            </span>
            <p className="mt-4 text-[13px] font-semibold text-muted">{isNote ? "Последний шаг" : `Сфера ${step + 1} из ${SPHERES.length}`}</p>
            <h2 id="sphere-title" ref={headingRef} tabIndex={-1} className="title text-[34px] focus:outline-none">
              {title}
            </h2>
            <p className="mt-0.5 text-[17px] text-muted">{question}</p>
          </div>

          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <TimeField label="Отход ко сну" value={d.sleep.bedtime} onChange={(v) => patch("sleep", { bedtime: v })} />
                <TimeField label="Пробуждение" value={d.sleep.wake} onChange={(v) => patch("sleep", { wake: v })} />
              </div>
              <p className="-mt-3 text-[15px] text-muted" aria-live="polite">
                Сон: <b>{safeHours(d.sleep.bedtime, d.sleep.wake)}</b>
              </p>
              <ScaleField legend="Качество сна" name="sleepq" value={d.sleep.quality} onChange={(v) => patch("sleep", { quality: v })} low="плохо" high="отлично" theme={theme} glyph="face" words={["Плохо", "Так себе", "Нормально", "Хорошо", "Отлично"]} />
            </>
          )}

          {step === 1 && (
            <>
              <YesNoField legend="Был завтрак?" name="breakfast" value={d.food.breakfast} onChange={(v) => patch("food", { breakfast: v })} theme={theme} />
              <ChoiceField legend="Питание за день" name="food" columns={3} value={d.food.regularity} options={FOOD_OPTIONS} onChange={(v) => patch("food", { regularity: v })} theme={theme} />
            </>
          )}

          {step === 2 && (
            <>
              <Stepper label="Кофе и энергетики" unit="чаш." value={d.caffeine.cups} max={LIMITS.cups} theme={theme} onChange={(v) => patch("caffeine", { cups: v, lastAt: v > 0 ? (d.caffeine.lastAt ?? "14:00") : null })} />
              {d.caffeine.cups > 0 && (
                <TimeField label="Когда была последняя?" value={d.caffeine.lastAt ?? "14:00"} onChange={(v) => patch("caffeine", { lastAt: v })} />
              )}
              <Stepper label="Вода" unit="стак." value={d.caffeine.water} max={LIMITS.water} theme={theme} onChange={(v) => patch("caffeine", { water: v })} />
            </>
          )}

          {step === 3 && (
            <>
              <ScaleField legend="Настроение" name="mood" value={d.mind.mood} onChange={(v) => patch("mind", { mood: v })} low="плохое" high="отличное" theme={theme} glyph="face" words={["Плохое", "Грустно", "Ровное", "Хорошее", "Отличное"]} />
              <ScaleField legend="Уровень стресса" name="stress" value={d.mind.stress} onChange={(v) => patch("mind", { stress: v })} low="спокойно" high="очень сильный" theme={theme} words={["Спокойно", "Немного", "Средний", "Высокий", "Очень сильный"]} />
            </>
          )}

          {step === 4 && (
            <>
              <ChoiceField legend="Сколько двигались сегодня?" name="activity" columns={2} value={d.activity.level} options={ACTIVITY_OPTIONS} onChange={(v) => patch("activity", { level: v })} theme={theme} />
              <label className="block">
                <span className="mb-2 block text-[15px] font-semibold text-ink">
                  Чем занимались? <span className="font-normal text-muted">необязательно</span>
                </span>
                <input
                  type="text"
                  maxLength={ACTIVITY_NOTE_MAX}
                  value={d.activity.note}
                  onChange={(e) => patch("activity", { note: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                  enterKeyHint="done"
                  placeholder="Например: прогулка 30 минут"
                  className="h-[50px] w-full rounded-[12px] bg-surface px-4 text-ink ring-1 ring-line ring-inset placeholder:text-muted"
                />
              </label>
            </>
          )}

          {step === 5 && (
            <>
              <Stepper label={mode === "work" ? "Часы работы" : "Часы учёбы"} unit="ч" step={0.5} value={d.work.hours} max={LIMITS.workHours} theme={theme} onChange={(v) => patch("work", { hours: v })} />
              <ScaleField legend="Насколько было сложно?" name="difficulty" value={d.work.difficulty} onChange={(v) => patch("work", { difficulty: v })} low="легко" high="очень сложно" theme={theme} words={["Легко", "Спокойно", "Средне", "Сложно", "Очень сложно"]} />
            </>
          )}

          {step === 6 && (
            <ChoiceField legend="Какой отдых был сегодня?" name="rest" columns={2} value={d.rest.type} options={REST_OPTIONS} onChange={(v) => patch("rest", { type: v })} theme={theme} />
          )}

          {isNote && (
            <>
              <label className="block">
                <span className="mb-2 block text-[15px] font-semibold text-ink">
                  Пара слов для себя <span className="font-normal text-muted">необязательно</span>
                </span>
                <textarea
                  rows={5}
                  maxLength={NOTE_MAX}
                  value={d.note}
                  onChange={(e) => setD({ ...d, note: e.target.value })}
                  placeholder="Что получилось, что мешало… Заметка хранится только на этом устройстве."
                  className="w-full rounded-[12px] bg-surface p-4 text-ink ring-1 ring-line ring-inset placeholder:text-muted"
                />
              </label>
              {hasCrisisWording(`${d.note} ${d.activity.note}`) && <CrisisCard />}
            </>
          )}

          {error && (
            <p role="alert" className="font-medium text-ink">
              Не удалось сохранить. Попробуйте ещё раз — ответы не потерялись.
            </p>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 border-t border-line bg-[#f9f9f9]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl gap-3 px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
          {step > 0 && (
            <button type="button" className="pressable inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-soft px-5 text-[17px] font-semibold text-accent" onClick={() => setStep(step - 1)}>
              Назад
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="pressable inline-flex min-h-[50px] flex-1 items-center justify-center rounded-[14px] bg-accent text-[17px] font-semibold text-white disabled:opacity-60"
          >
            {isNote ? (saving ? "Сохраняем…" : "Сохранить") : "Далее"}
          </button>
        </div>
      </div>
    </form>
  );
}

const QUESTIONS: Record<SphereKey, string> = {
  sleep: "Во сколько легли и встали?",
  food: "Как вы ели сегодня?",
  caffeine: "Кофе, энергетики и вода",
  mind: "Как вы себя чувствуете?",
  activity: "Сколько было движения?",
  work: "Сколько и насколько тяжело?",
  rest: "Как вы отдыхали?",
};


function safeHours(bed: string, wake: string): string {
  try {
    return formatHours(sleepHours(bed, wake));
  } catch {
    return "—";
  }
}
