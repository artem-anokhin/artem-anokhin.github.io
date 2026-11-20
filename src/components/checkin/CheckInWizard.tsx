"use client";

import { useEffect, useRef, useState } from "react";
import { CrisisCard } from "@/components/CrisisCard";
import {
  ChoiceField,
  ScaleField,
  Stepper,
  TimeField,
  YesNoField,
  btnPrimary,
  btnSecondary,
} from "@/components/ui/controls";
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
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView?.({ block: "center" });
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isNote) void save();
        else setStep(step + 1);
      }}
    >
      <div className="sticky top-0 z-10 -mx-4 mb-4 bg-bg/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:px-0">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-navy">
            {isNote ? "Последний шаг" : `Сфера ${step + 1} из ${SPHERES.length}`}
          </span>
          <span className="text-muted">≈ 1 минута</span>
        </div>
        <div
          role="progressbar"
          aria-label="Прогресс отметки"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-2 overflow-hidden rounded-full bg-soft"
        >
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <section className="card space-y-6 p-5 md:max-w-xl md:p-6" aria-labelledby="sphere-title">
        <h2 id="sphere-title" ref={headingRef} tabIndex={-1} className="title text-2xl focus:outline-none">
          {title}
        </h2>

        {step === 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <TimeField label="Отход ко сну" value={d.sleep.bedtime} onChange={(v) => patch("sleep", { bedtime: v })} />
              <TimeField label="Пробуждение" value={d.sleep.wake} onChange={(v) => patch("sleep", { wake: v })} />
            </div>
            <p className="-mt-3 text-sm text-muted" aria-live="polite">
              Сон: <b className="text-ink">{safeHours(d.sleep.bedtime, d.sleep.wake)}</b>
            </p>
            <ScaleField legend="Качество сна" name="sleepq" value={d.sleep.quality} onChange={(v) => patch("sleep", { quality: v })} low="плохо" high="отлично" />
          </>
        )}

        {step === 1 && (
          <>
            <YesNoField legend="Был завтрак?" name="breakfast" value={d.food.breakfast} onChange={(v) => patch("food", { breakfast: v })} />
            <ChoiceField legend="Питание за день" name="food" columns={3} value={d.food.regularity} options={FOOD_OPTIONS} onChange={(v) => patch("food", { regularity: v })} />
          </>
        )}

        {step === 2 && (
          <>
            <Stepper label="Кофе и энергетики" unit="чаш." value={d.caffeine.cups} max={LIMITS.cups} onChange={(v) => patch("caffeine", { cups: v, lastAt: v > 0 ? (d.caffeine.lastAt ?? "14:00") : null })} />
            {d.caffeine.cups > 0 && (
              <TimeField label="Когда была последняя?" value={d.caffeine.lastAt ?? "14:00"} onChange={(v) => patch("caffeine", { lastAt: v })} />
            )}
            <Stepper label="Вода" unit="стак." value={d.caffeine.water} max={LIMITS.water} onChange={(v) => patch("caffeine", { water: v })} />
          </>
        )}

        {step === 3 && (
          <>
            <ScaleField legend="Уровень стресса" name="stress" value={d.mind.stress} onChange={(v) => patch("mind", { stress: v })} low="спокойно" high="очень сильный" />
            <ScaleField legend="Настроение" name="mood" value={d.mind.mood} onChange={(v) => patch("mind", { mood: v })} low="плохое" high="отличное" />
          </>
        )}

        {step === 4 && (
          <>
            <ChoiceField legend="Сколько двигались сегодня?" name="activity" columns={2} value={d.activity.level} options={ACTIVITY_OPTIONS} onChange={(v) => patch("activity", { level: v })} />
            <label className="block">
              <span className="mb-2 block font-semibold text-ink">
                Чем занимались? <span className="text-sm font-normal text-muted">необязательно</span>
              </span>
              <input
                type="text"
                maxLength={ACTIVITY_NOTE_MAX}
                value={d.activity.note}
                onChange={(e) => patch("activity", { note: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                enterKeyHint="done"
                placeholder="Например: прогулка 30 минут"
                className="h-12 w-full rounded-2xl border-[1.5px] border-line bg-card px-4 text-ink placeholder:text-muted"
              />
            </label>
          </>
        )}

        {step === 5 && (
          <>
            <Stepper label={mode === "work" ? "Часы работы" : "Часы учёбы"} unit="ч" step={0.5} value={d.work.hours} max={LIMITS.workHours} onChange={(v) => patch("work", { hours: v })} />
            <ScaleField legend="Насколько было сложно?" name="difficulty" value={d.work.difficulty} onChange={(v) => patch("work", { difficulty: v })} low="легко" high="очень сложно" />
          </>
        )}

        {step === 6 && (
          <ChoiceField legend="Какой отдых был сегодня?" name="rest" columns={2} value={d.rest.type} options={REST_OPTIONS} onChange={(v) => patch("rest", { type: v })} />
        )}

        {isNote && (
          <>
            <label className="block">
              <span className="mb-2 block font-semibold text-ink">
                Как прошёл день? <span className="text-sm font-normal text-muted">необязательно</span>
              </span>
              <textarea
                rows={4}
                maxLength={NOTE_MAX}
                value={d.note}
                onChange={(e) => setD({ ...d, note: e.target.value })}
                placeholder="Пара слов для себя. Заметка хранится только на этом устройстве."
                className="w-full rounded-2xl border-[1.5px] border-line bg-card p-4 text-ink placeholder:text-muted"
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

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button type="button" className={`${btnSecondary} flex-1`} onClick={() => setStep(step - 1)}>
              Назад
            </button>
          )}
          <button type="submit" className={`${btnPrimary} flex-1`} disabled={saving}>
            {isNote ? (saving ? "Сохраняем…" : "Сохранить") : "Далее"}
          </button>
        </div>
      </section>
    </form>
  );
}

function safeHours(bed: string, wake: string): string {
  try {
    return formatHours(sleepHours(bed, wake));
  } catch {
    return "—";
  }
}
