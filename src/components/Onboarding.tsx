"use client";

import { ChevronLeft, HeartHandshake, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { HELP_LINES } from "@/lib/crisis";
import { MODE_LABEL, saveProfile, type Mode } from "@/lib/settings";
import { ChoiceField, btnPrimary } from "./ui/controls";
import { ProgressRing, TreeScene } from "./ui/visuals";

const STEPS = 4;

/** Welcome art: the garden with the 7 sphere colors orbiting. */
function WelcomeArt() {
  return (
    <div className="relative">
      <TreeScene stage={3} wilting={false} title="Сад фокуса" className="h-64 rounded-card-lg" />
    </div>
  );
}

/** One-time onboarding: welcome → mode → disclaimer → consent. Calls onDone after saving. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>("study");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function finish() {
    if (!consent) return;
    setSaving(true);
    setError(false);
    try {
      await saveProfile(mode, consent);
      onDone();
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="flex min-h-11 items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="pressable -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-3 font-semibold text-link hover:bg-soft"
            >
              <ChevronLeft aria-hidden size={20} /> Назад
            </button>
          ) : (
            <p className="text-[17px] font-bold tracking-[-0.01em] text-ink">
              Focus<span className="text-link">AI</span>
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="sr-only">
              Шаг {step + 1} из {STEPS}
            </span>
            <span aria-hidden className="flex gap-1.5">
              {Array.from({ length: STEPS }, (_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-accent" : i < step ? "w-1.5 bg-accent/40" : "w-1.5 bg-fill-strong"}`} />
              ))}
            </span>
          </div>
        </div>

        <section key={step} className="stagger mt-6 flex flex-1 flex-col">
          {step === 0 && (
            <>
              <WelcomeArt />
              <h1 className="title mt-8 text-[34px] text-balance">
                Фокус растёт, <span className="text-link">как сад</span>
              </h1>
              <p className="mt-3 text-[17px] text-muted">Узнайте, что связано с вашей концентрацией — по вашим же данным.</p>
              <ul className="mt-6 space-y-3">
                {[
                  ["1 минута", "чек-ин дня: сон, еда, кофе, настроение…"],
                  ["90 секунд", "тест реакции — ваш Focus Score"],
                  ["7 дней", "и вы увидите, что с ним связано"],
                ].map(([a, b]) => (
                  <li key={a} className="flex items-baseline gap-3">
                    <span className="w-24 shrink-0 text-[17px] font-semibold text-ink tabular-nums">{a}</span>
                    <span className="text-[15px] text-ink">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="flex-1" />
              <button type="button" className={`${btnPrimary} mt-8 w-full`} onClick={() => setStep(1)}>
                Далее
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid h-44 place-items-center rounded-card-lg bg-surface">
                <ProgressRing value={0.72} size={140} stroke={13}>
                  <span>
                    <span className="stat block text-[40px] text-link">72</span>
                    <span className="text-[13px] font-semibold text-muted">Focus Score</span>
                  </span>
                </ProgressRing>
              </div>
              <h1 className="title mt-8 text-[34px]">Как вы проводите день?</h1>
              <p className="mt-2 mb-6 text-[17px] text-muted">От этого зависят вопросы в чек-ине.</p>
              <ChoiceField
                legend="Выберите режим"
                name="mode"
                value={mode}
                onChange={setMode}
                columns={2}
                options={(["study", "work"] as const).map((m) => ({ value: m, label: MODE_LABEL[m] }))}
              />
              <div className="flex-1" />
              <button type="button" className={`${btnPrimary} mt-8 w-full`} onClick={() => setStep(2)}>
                Далее
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <span className="grid size-20 place-items-center rounded-full bg-s-mind-tint text-s-mind-ink">
                <HeartHandshake aria-hidden size={40} />
              </span>
              <h1 className="title mt-6 text-[34px]">Важно знать</h1>
              <p className="mt-4 inline-flex self-start rounded-full bg-sand px-4 py-2 text-[15px] font-semibold text-sand-ink">
                Не является медицинской консультацией
              </p>
              <p className="mt-4 text-[17px] text-ink">
                FocusAI помогает замечать связи между привычками и концентрацией. Приложение не ставит диагнозов и не заменяет
                врача.
              </p>
              <div className="mt-6 rounded-card-lg bg-surface p-4">
                <p className="text-[15px] text-muted">Если станет тяжело, поговорить можно бесплатно:</p>
                <ul className="mt-2 space-y-1">
                  {HELP_LINES.map((l) => (
                    <li key={l.phone}>
                      <a href={`tel:${l.phone}`} className="inline-flex min-h-11 items-center gap-3 text-link">
                        <span className="stat text-[24px]">{l.phone}</span>
                        <span className="text-[14px] text-ink underline underline-offset-4">{l.label}</span>
                      </a>
                    </li>
                  ))}
                  <li className="text-[14px] text-ink">или психолог вашего вуза</li>
                </ul>
              </div>
              <div className="flex-1" />
              <button type="button" className={`${btnPrimary} mt-8 w-full`} onClick={() => setStep(3)}>
                Понятно
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <span className="grid size-20 place-items-center rounded-full bg-s-activity-tint text-s-activity-ink">
                <ShieldCheck aria-hidden size={40} />
              </span>
              <h1 className="title mt-6 text-[34px] text-balance">
                Ваши данные — <span className="text-link">только у вас</span>
              </h1>
              <ul className="mt-5 space-y-3 text-[16px] text-ink">
                {[
                  "Ответы хранятся только на этом устройстве.",
                  "Нет аккаунтов и сервера — данные никуда не отправляются.",
                  "Выгрузить или удалить всё можно в настройках.",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-leaf" />
                    {t}
                  </li>
                ))}
              </ul>
              <label className="mt-6 flex min-h-11 cursor-pointer items-start gap-3 rounded-card bg-surface p-4 has-[:checked]:ring-2 has-[:checked]:ring-accent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-6 shrink-0 accent-navy" />
                <span className="text-ink">Я согласен(на) хранить свои ответы на этом устройстве для личной статистики</span>
              </label>
              <a href="/privacy/" target="_blank" rel="noopener" className="mt-3 inline-flex min-h-11 items-center text-[15px] font-semibold text-link underline underline-offset-4">
                Политика конфиденциальности
              </a>
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
