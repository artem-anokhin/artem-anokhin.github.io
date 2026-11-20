"use client";

import { ChevronLeft, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { HELP_LINES } from "@/lib/crisis";
import { MODE_LABEL, saveProfile, type Mode } from "@/lib/settings";
import { ChoiceField, btnPrimary } from "./ui/controls";

const STEPS = 3;

/** One-time onboarding: mode → disclaimer → consent. Calls onDone after saving. */
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
      <p className="title mb-6 text-center text-2xl">
        Focus<span className="text-accent">AI</span>
      </p>
      <section className="card p-6">
        <div className="mb-6 flex min-h-11 items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 font-medium text-navy hover:bg-soft"
            >
              <ChevronLeft aria-hidden size={20} /> Назад
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">
              Шаг {step + 1} из {STEPS}
            </span>
            <span aria-hidden className="flex gap-1">
              {Array.from({ length: STEPS }, (_, i) => (
                <span key={i} className={`size-2 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`} />
              ))}
            </span>
          </div>
        </div>

        {step === 0 && (
          <>
            <h1 className="title mb-6 text-2xl">
              Как вы
              <span className="block text-accent">проводите день?</span>
            </h1>
            <ChoiceField
              legend="Выберите режим — от него зависят вопросы"
              name="mode"
              value={mode}
              onChange={setMode}
              options={(["study", "work"] as const).map((m) => ({ value: m, label: MODE_LABEL[m] }))}
            />
            <button type="button" className={`${btnPrimary} mt-6 w-full`} onClick={() => setStep(1)}>
              Далее
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="title mb-4 text-2xl">
              Важно
              <span className="block text-accent">знать</span>
            </h1>
            <p className="rounded-2xl bg-soft p-4 font-semibold text-navy">
              Не является медицинской консультацией
            </p>
            <p className="mt-4 text-ink">
              FocusAI помогает замечать связи между привычками и концентрацией. Приложение не ставит
              диагнозов и не заменяет врача.
            </p>
            <p className="mt-4 text-sm text-muted">
              Если станет тяжело, бесплатная поддержка:{" "}
              {HELP_LINES.map((l, i) => (
                <span key={l.phone}>
                  {i > 0 && ", "}
                  <a href={`tel:${l.phone}`} className="font-semibold text-navy underline underline-offset-4">
                    {l.phone}
                  </a>
                </span>
              ))}{" "}
              или психолог вашего вуза.
            </p>
            <button type="button" className={`${btnPrimary} mt-6 w-full`} onClick={() => setStep(2)}>
              Понятно
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="title mb-4 text-2xl">
              Ваши данные —
              <span className="block text-accent">только у вас</span>
            </h1>
            <p className="flex gap-3 text-ink">
              <ShieldCheck aria-hidden className="mt-0.5 shrink-0 text-leaf" size={22} />
              Ответы хранятся только в этом браузере. Нет аккаунтов и сервера, данные никуда не
              отправляются.
            </p>
            <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] border-line p-3">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 size-6 shrink-0 accent-navy"
              />
              <span className="text-ink">
                Я согласен(на) хранить свои ответы на этом устройстве для личной статистики
              </span>
            </label>
            <p className="mt-3 text-sm text-muted">
              Данные можно выгрузить или удалить в любой момент в настройках.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-ink">
                Не удалось сохранить. Попробуйте ещё раз.
              </p>
            )}
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
  );
}
