"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { db, dayKey } from "@/lib/db";
import {
  EXPERIMENT_DAYS,
  MIN_DAYS,
  computeInsights,
  experimentDay,
  experimentResult,
  pairDays,
  pickExperiment,
  usableDays,
  type ExperimentResult,
  type Insight,
  type Strength,
} from "@/lib/insights";
import { endExperiment, getExperiment, startExperiment, type Experiment } from "@/lib/settings";
import { TIPS, type TipKey } from "@/lib/tips";
import { btnPrimary, btnSecondary } from "@/components/ui/controls";

const LIMITS_URL = "https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2020.00003/full";

type Ready = {
  kind: "ready";
  days: number;
  insights: Insight[];
  candidate: Insight | null;
  experiment: Experiment | null;
  result: ExperimentResult | null;
  today: string;
};
type State = { kind: "loading" } | { kind: "error" } | Ready;

/** Russian plural: plural(5, ["день", "дня", "дней"]) → "дней". */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}
const DAYS: [string, string, string] = ["день", "дня", "дней"];
const DAYS_GEN: [string, string, string] = ["дню", "дням", "дням"];
const POINTS: [string, string, string] = ["балл", "балла", "баллов"];

const STRENGTH_SEGMENTS: Record<Strength, number> = { слабая: 1, заметная: 2, сильная: 3 };

function StrengthChip({ strength, days }: { strength: Strength; days: number }) {
  const filled = STRENGTH_SEGMENTS[strength];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="flex items-center gap-2 font-semibold text-navy">
        <span aria-hidden className="flex gap-0.5">
          {[1, 2, 3].map((i) => (
            <span key={i} className={`h-2 w-5 rounded-full ${i <= filled ? "bg-accent" : "bg-soft"}`} />
          ))}
        </span>
        {strength} связь в ваших данных
      </span>
      <span className="text-muted">
        по {days} {plural(days, DAYS_GEN)}
      </span>
    </div>
  );
}

function ExperimentCard({
  state,
  onStart,
  onEnd,
  busy,
}: {
  state: Ready;
  onStart: () => void;
  onEnd: () => void;
  busy: boolean;
}) {
  const { experiment, candidate, result, today } = state;
  const tipKey = (experiment?.tip ?? candidate?.metric.experiment?.tip) as TipKey | undefined;
  const tip = tipKey && Object.hasOwn(TIPS, tipKey) ? TIPS[tipKey] : undefined;
  if (!tip && !experiment) return null;
  const day = experiment ? experimentDay(experiment.start, today) : 0;
  const finished = experiment !== null && day > EXPERIMENT_DAYS;

  return (
    <article className="card p-5 md:p-6" aria-labelledby="exp-title">
      <h2 id="exp-title" className="font-display text-xl font-extrabold text-navy">
        Эксперимент недели
      </h2>
      {tip && (
        <>
          <h3 className="mt-3 font-semibold text-ink">{tip.title}</h3>
          <p className="mt-1 text-ink">{tip.text}</p>
          <p className="mt-1 text-sm font-medium text-navy">Пробуйте {EXPERIMENT_DAYS} дней подряд.</p>
          <a href={tip.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-muted underline">
            Источник: {tip.source}
            <span className="sr-only"> (откроется в новой вкладке)</span>
          </a>
        </>
      )}

      {experiment && !finished && (
        <div className="mt-3">
          <p className="font-medium text-navy">
            День {day} из {EXPERIMENT_DAYS}
          </p>
          <div
            role="progressbar"
            aria-label="Ход эксперимента"
            aria-valuemin={0}
            aria-valuemax={EXPERIMENT_DAYS}
            aria-valuenow={day}
            className="mt-2 h-2 overflow-hidden rounded-full bg-soft"
          >
            <div className="h-full bg-accent" style={{ width: `${(day / EXPERIMENT_DAYS) * 100}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">Проходите тест каждый день, чтобы было с чем сравнить.</p>
        </div>
      )}

      {finished && result && (
        <div className="mt-3 rounded-2xl bg-soft p-4 text-ink">
          {result.diff === null ? (
            <p>Мало дней с тестом, чтобы сравнить «до» и «после».</p>
          ) : (
            <p className="font-semibold">
              {result.diff === 0
                ? `За эти ${EXPERIMENT_DAYS} дней Focus Score в среднем примерно такой же`
                : `За эти ${EXPERIMENT_DAYS} дней Focus Score в среднем на ${Math.abs(result.diff)} ${plural(result.diff, POINTS)} ${result.diff > 0 ? "выше" : "ниже"}`}
            </p>
          )}
          <p className="mt-1 text-sm text-muted">
            До: {result.before.days} {plural(result.before.days, DAYS)}, после: {result.after.days}{" "}
            {plural(result.after.days, DAYS)}. Это не доказательство, только ваши данные.
          </p>
        </div>
      )}

      {experiment ? (
        <button type="button" className={`${btnSecondary} mt-4 w-full`} onClick={onEnd} disabled={busy}>
          Завершить эксперимент
        </button>
      ) : (
        <button type="button" className={`${btnPrimary} mt-4 w-full`} onClick={onStart} disabled={busy}>
          Начать на {EXPERIMENT_DAYS} дней
        </button>
      )}
    </article>
  );
}

export function InsightsScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([db.checkins.toArray(), db.focusTests.toArray(), getExperiment()])
      .then(([checkins, tests, experiment]) => {
        if (!alive) return;
        const pairs = pairDays(checkins, tests);
        const days = usableDays(pairs);
        const all = days >= MIN_DAYS ? computeInsights(pairs) : [];
        setState({
          kind: "ready",
          days,
          insights: all.slice(0, 3),
          candidate: pickExperiment(all),
          experiment,
          result: experiment ? experimentResult(tests, experiment.start) : null,
          today: dayKey(),
        });
      })
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, [reload]);

  const act = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      setReload((n) => n + 1);
    }
  }, []);

  if (state.kind === "loading") {
    return (
      <div aria-busy role="status" aria-label="Загрузка" className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-28 animate-pulse" />
        ))}
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <section role="alert" className="card p-5">
        <p className="text-ink">Не получилось посчитать. Данные целы.</p>
        <button type="button" className={`${btnPrimary} mt-4`} onClick={() => setReload((n) => n + 1)}>
          Попробовать снова
        </button>
      </section>
    );
  }

  const { days, insights, candidate, experiment } = state;
  const locked = days < MIN_DAYS;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted">
        Расчёт на вашем устройстве{locked ? "" : ` по ${days} ${plural(days, DAYS_GEN)}`}. Данные не покидают устройство.
      </p>

      {locked ? (
        <section className="card p-5 md:p-6" aria-labelledby="locked-title">
          <h2 id="locked-title" className="font-display text-xl font-extrabold text-navy">
            {days} из {MIN_DAYS} дней
          </h2>
          <div
            role="progressbar"
            aria-label="Дни с данными"
            aria-valuemin={0}
            aria-valuemax={MIN_DAYS}
            aria-valuenow={days}
            className="mt-3 h-2 overflow-hidden rounded-full bg-soft"
          >
            <div className="h-full bg-accent" style={{ width: `${(days / MIN_DAYS) * 100}%` }} />
          </div>
          <p className="mt-3 text-ink">
            Нужно 7 дней, в которые есть и чек-ин, и тест фокуса. Сегодня: чек-ин (1 минута) и тест (90 секунд).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/" className={btnPrimary}>
              Чек-ин
            </Link>
            <Link href="/test/" className={btnSecondary}>
              Тест фокуса
            </Link>
          </div>
        </section>
      ) : insights.length === 0 ? (
        <p className="card p-5 text-ink">Явных связей пока нет. Это нормально, продолжайте отмечать дни.</p>
      ) : (
        <section aria-label="Связи" className="space-y-3">
          {insights.map((i) => (
            <article key={i.metric.key} className="card p-5">
              <p className="font-medium text-ink">{i.text}</p>
              <div className="mt-3">
                <StrengthChip strength={i.strength} days={i.days} />
              </div>
            </article>
          ))}
        </section>
      )}

      {(experiment || candidate) && (
        <ExperimentCard
          state={state}
          busy={busy}
          onStart={() =>
            candidate?.metric.experiment &&
            act(() =>
              startExperiment({ metric: candidate.metric.key, tip: candidate.metric.experiment!.tip, start: state.today }),
            )
          }
          onEnd={() => act(() => endExperiment())}
        />
      )}

      <p className="text-sm text-muted">
        Это гипотезы, а не причины: на фокус влияет много всего сразу.
        <a href={LIMITS_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center underline">
          Почему это не причина?
          <span className="sr-only"> (откроется в новой вкладке)</span>
        </a>
      </p>
      <p className="text-sm text-muted">Не является медицинской консультацией.</p>
    </div>
  );
}
