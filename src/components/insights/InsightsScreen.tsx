"use client";

import { tagEffects, type TagEffect } from "@/lib/tags";
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
  splitMeans,
  usableDays,
  type SplitMeans,
  type ExperimentResult,
  type Insight,
  type Strength,
} from "@/lib/insights";
import { endExperiment, getExperiment, startExperiment, type Experiment } from "@/lib/settings";
import { plural } from "@/lib/plural";
import { TIPS, type TipKey } from "@/lib/tips";
import { METRIC_CARD, cardHref } from "@/lib/libraryLinks";
import { btnPrimary, btnSecondary } from "@/components/ui/controls";
import { ProgressRing } from "@/components/ui/visuals";
import { latestTestByDay } from "@/lib/today";
import { SPHERE_STYLE } from "@/lib/spheres";
import { SPHERES } from "@/lib/checkin";
import { ArrowRight, Clock, FlaskConical, Sparkles, Timer } from "lucide-react";
import { MIN_GAP, timeOfDay, type TimeOfDay } from "@/lib/timeOfDay";
import { FEELS, feelByLength, isFeel } from "@/lib/focusSession";

const LIMITS_URL = "https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2020.00003/full";

type Ready = {
  kind: "ready";
  days: number;
  insights: Insight[];
  candidate: Insight | null;
  experiment: Experiment | null;
  result: ExperimentResult | null;
  today: string;
  splits: Record<string, SplitMeans | null>;
  /** Focus Score for each of the last 7 days (oldest → today), null = no test. */
  week: (number | null)[];
  tod: TimeOfDay | null;
  fit: ReturnType<typeof feelByLength>;
  /** Distinct days with a rated session. */
  fitDays: number;
  /** Check-in tags with the biggest score difference (≥7 usable days). */
  tagFx: TagEffect[];
};
type State = { kind: "loading" } | { kind: "error" } | Ready;

const DAYS: [string, string, string] = ["день", "дня", "дней"];
const DAYS_GEN: [string, string, string] = ["дню", "дням", "дням"];
const POINTS: [string, string, string] = ["балл", "балла", "баллов"];

const STRENGTH_SEGMENTS: Record<Strength, number> = { слабая: 1, заметная: 2, сильная: 3 };

function StrengthChip({ strength, days }: { strength: Strength; days: number }) {
  const filled = STRENGTH_SEGMENTS[strength];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
      <span className="flex items-center gap-2 font-semibold text-ink">
        <span aria-hidden className="flex gap-0.5">
          {[1, 2, 3].map((i) => (
            <span key={i} className={`h-1.5 w-4 rounded-full ${i <= filled ? "bg-navy" : "bg-line"}`} />
          ))}
        </span>
        <span className="first-letter:uppercase">{strength} связь</span>
      </span>
      <span className="sr-only">
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
    <article className="rounded-card-lg bg-surface p-4" aria-labelledby="exp-title">
      <h2 id="exp-title" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
        <FlaskConical aria-hidden size={16} /> Эксперимент недели
      </h2>
      {tip && (
        <>
          <h3 className="mt-1.5 text-[22px] font-bold tracking-[-0.02em] text-ink">{tip.title}</h3>
          <p className="mt-1 text-ink">{tip.text}</p>
          <p className="mt-1 text-sm font-medium text-link">Пробуйте {EXPERIMENT_DAYS} дней подряд.</p>
          <a href={tip.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-[13px] text-muted underline">
            Источник: {tip.source}
            <span className="sr-only"> (откроется в новой вкладке)</span>
          </a>
        </>
      )}

      {experiment && !finished && (
        <div className="mt-3">
          <p className="font-medium text-link">
            День {day} из {EXPERIMENT_DAYS}
          </p>
          <div
            role="progressbar"
            aria-label="Ход эксперимента"
            aria-valuemin={0}
            aria-valuemax={EXPERIMENT_DAYS}
            aria-valuenow={day}
            className="mt-2 h-2 overflow-hidden rounded-full bg-fill"
          >
            <div className="h-full rounded-full bg-leaf" style={{ width: `${(day / EXPERIMENT_DAYS) * 100}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">Проходите тест каждый день, чтобы было с чем сравнить.</p>
        </div>
      )}

      {finished && result && (
        <div className="mt-3 rounded-[12px] bg-bg p-4 text-ink">
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
    Promise.all([db.checkins.toArray(), db.focusTests.toArray(), getExperiment(), db.sessions.toArray()])
      .then(([checkins, tests, experiment, sessions]) => {
        if (!alive) return;
        const pairs = pairDays(checkins, tests);
        const days = usableDays(pairs);
        const all = days >= MIN_DAYS ? computeInsights(pairs) : [];
        const top = all.slice(0, 3);
        const byDay = latestTestByDay(tests);
        const now = new Date();
        const week = Array.from({ length: 7 }, (_, i) => {
          const d = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i)));
          return byDay.get(d)?.score ?? null;
        });
        setState({
          kind: "ready",
          days,
          week,
          tod: timeOfDay(tests),
          fit: feelByLength(sessions),
          tagFx: days >= MIN_DAYS ? tagEffects(pairs.map((p) => ({ data: p.checkin, score: p.score }))).filter((t) => Math.abs(t.diff) >= 3).slice(0, 5) : [],
          fitDays: new Set(sessions.filter((s) => isFeel(s.feel)).map((s) => s.date)).size,
          splits: Object.fromEntries(top.map((i) => [i.metric.key, splitMeans(pairs, i.metric)])),
          insights: top,
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

  const { days, insights, candidate, experiment, splits, week, tod, fit, fitDays, tagFx } = state;
  const locked = days < MIN_DAYS;

  return (
    <div className="stagger mx-auto max-w-2xl space-y-6">
      <WeekHero week={week} />

      {locked ? (
        <>
        <section className="flex items-center gap-5 rounded-card-lg bg-surface p-4" aria-labelledby="locked-title">
          <ProgressRing value={days / MIN_DAYS} size={96} stroke={10} label={`${days} из ${MIN_DAYS} дней`}>
            <span className="stat text-[26px] text-link">
              {days}/{MIN_DAYS}
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h2 id="locked-title" className="title text-[22px]">
              {days} из {MIN_DAYS} дней
            </h2>
            <p className="mt-1 text-[15px] text-muted">Нужно 7 дней, в которые есть и чек-ин, и тест фокуса.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/checkin/" className="pressable inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-[15px] font-semibold text-white">
                Чек-ин
              </Link>
              <Link href="/test/" className="pressable inline-flex min-h-11 items-center rounded-full bg-soft px-4 text-[15px] font-semibold text-link">
                Тест фокуса
              </Link>
            </div>
          </div>
        </section>
        <PreviewInsight />
        </>
      ) : insights.length === 0 ? (
        <p className="rounded-card-lg bg-surface p-4 text-ink">Явных связей пока нет. Это нормально, продолжайте отмечать дни.</p>
      ) : (
        <section aria-labelledby="links-h" className="space-y-3">
          <h2 id="links-h" className="title text-[22px]">
            Что связано с фокусом
          </h2>
          <p className="-mt-2 text-[13px] text-muted">
            По {days} {plural(days, DAYS_GEN)} ваших данных
          </p>
          {insights.map((i) => (
            <InsightCard key={i.metric.key} insight={i} split={splits[i.metric.key] ?? null} />
          ))}
          {insights.some((i) => METRIC_CARD[i.metric.key]) && (
            <a href={cardHref(METRIC_CARD[insights.find((i) => METRIC_CARD[i.metric.key])!.metric.key]!)} className="flex min-h-11 items-center px-4 text-[15px] text-link">
              Что об этом говорят исследования
            </a>
          )}
        </section>
      )}

      {tagFx.length > 0 && <TagEffectsCard fx={tagFx} days={days} />}
      {tod && <TimeOfDayCard tod={tod} />}
      {fitDays >= MIN_DAYS && <SessionFitCard fit={fit} days={fitDays} />}

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

      <p className="text-[13px] text-muted">
        Расчёт на вашем устройстве, данные не покидают его. Это гипотезы, а не причины: на фокус влияет много всего сразу.
        <a href={LIMITS_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center font-semibold underline">
          Почему это не причина?
          <span className="sr-only"> (откроется в новой вкладке)</span>
        </a>
      </p>
    </div>
  );
}

const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

/** Hero: «Итоги недели» with a 7-bar mini chart of Focus Score. */
function WeekHero({ week }: { week: (number | null)[] }) {
  const now = new Date();
  const has = week.some((v) => v !== null);
  return (
    <Link
      href="/week/"
      className="pressable block overflow-hidden rounded-card-lg bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-[17px] font-semibold text-ink">Итоги недели</p>
        <span className="inline-flex items-center gap-0.5 text-[15px] text-link">
          Смотреть <ArrowRight aria-hidden size={16} />
        </span>
      </div>
      <p className="text-[13px] text-muted">Focus Score за 7 дней</p>
      <div aria-hidden className="mt-4 flex h-20 items-end gap-2">
        {week.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full origin-bottom animate-grow rounded-[5px] ${v === null ? "bg-fill" : i === 6 ? "bg-accent" : "bg-accent/45"}`}
              style={{ height: `${v === null ? 8 : Math.max(12, (v / 100) * 64)}px`, animationDelay: `${i * 40}ms` }}
            />
            <span className="text-[13px] text-muted">{WD[new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i)).getDay()]}</span>
          </div>
        ))}
      </div>
      {!has && <p className="mt-2 text-[13px] text-muted">Пройдите тест, чтобы появились столбики.</p>}
    </Link>
  );
}

function InsightCard({ insight: i, split }: { insight: Insight; split: SplitMeans | null }) {
  const st = SPHERE_STYLE[i.metric.sphere];
  const Icon = st.icon;
  const sphereTitle = SPHERES.find((s) => s.key === i.metric.sphere)?.title ?? "";
  const max = split ? Math.max(split.high, split.low, 1) : 1;
  return (
    <article className="rounded-card-lg bg-surface p-4">
      <p className={`flex items-center gap-1.5 text-[13px] font-semibold ${st.ink}`}>
        <Icon aria-hidden size={16} /> {sphereTitle}
      </p>
      <p className="mt-2 text-[17px] leading-snug font-semibold text-ink">{i.text}</p>
      {split && (
        <div className="mt-4 space-y-2" role="img" aria-label={`Средний Focus Score: ${split.high} в дни «${i.metric.higher}», ${split.low} в остальные`}>
          {[
            [i.metric.higher, split.high, split.highDays, true],
            [i.metric.lower, split.low, split.lowDays, false],
          ].map(([label, v, n, hi]) => (
            <div key={String(label)}>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted first-letter:uppercase">
                  {String(label)} · {Number(n)} {plural(Number(n), DAYS)}
                </span>
                <span className="font-semibold text-ink tabular-nums">{Number(v)}</span>
              </div>
              <div className={`mt-1 h-2.5 overflow-hidden rounded-full ${st.tint}`}>
                <div className={`h-full origin-left animate-grow rounded-full ${hi ? st.base : "bg-line"}`} style={{ width: `${(Number(v) / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4">
        <StrengthChip strength={i.strength} days={i.days} />
      </div>
    </article>
  );
}

/** Shown before day 7: what an insight will look like. Clearly marked as an example, no real numbers. */
function PreviewInsight() {
  return (
    <section aria-labelledby="preview-h" className="relative rounded-card-lg bg-surface p-4">
      <p className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-s-sleep-ink">Сон</span>
        <span className="rounded-full bg-fill px-2 py-0.5 text-[13px] font-medium text-ink">пример</span>
      </p>
      <h2 id="preview-h" className="mt-2 text-[17px] leading-snug font-semibold text-ink">
        Так будет выглядеть инсайт: «В ваших данных Focus Score чаще был выше в дни, когда вы…»
      </h2>
      <div aria-hidden className="mt-4 space-y-2 opacity-60">
        <div className="h-2.5 w-[86%] rounded-full bg-s-sleep" />
        <div className="h-2.5 w-[58%] rounded-full bg-fill-strong" />
      </div>
      <p className="mt-3 text-[13px] text-muted">Здесь появятся ваши настоящие связи — посчитанные только на этом устройстве.</p>
    </section>
  );
}

/** «Когда фокус выше»: average Focus Score by morning / day / evening (all tests). */
function TimeOfDayCard({ tod }: { tod: TimeOfDay }) {
  const shown = tod.parts.filter((p) => p.avg !== null);
  if (shown.length < 2) return null;
  const tests = tod.parts.reduce((a, p) => a + p.tests, 0);
  return (
    <section aria-labelledby="tod-h" className="rounded-card-lg bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[15px] font-semibold text-link">
        <Clock aria-hidden size={18} /> Время дня
      </p>
      <h2 id="tod-h" className="mt-1 text-[20px] font-bold text-ink">
        {tod.best ? `В ваших данных Focus Score в среднем выше ${tod.best.gen}` : "Заметной разницы по времени дня пока нет"}
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        По {tod.days} {plural(tod.days, DAYS_GEN)} · {tests} {plural(tests, ["тест", "теста", "тестов"])}
      </p>
      <ul className="mt-3 space-y-2.5">
        {tod.parts.map((p) => (
          <li key={p.key}>
            <div className="flex justify-between text-[15px]">
              <span className="text-ink">{p.label}</span>
              <span className="font-semibold text-ink tabular-nums">{p.avg ?? <span className="font-normal text-muted">мало тестов</span>}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-fill" aria-hidden>
              {p.avg !== null && (
                <div className={`h-full rounded-full ${tod.best?.key === p.key ? "bg-accent" : "bg-accent/40"}`} style={{ width: `${p.avg}%` }} />
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-muted">
        Средний Focus Score по всем тестам; разницу меньше {MIN_GAP} баллов не считаем.
        {tod.best && " Можно попробовать ставить сложные задачи на это время и посмотреть, что изменится."}
      </p>
    </section>
  );
}

/** «Длина сессии»: how the user rated 15/25/50-minute sessions (needs ≥2 lengths with ≥3 ratings). */
function TagEffectsCard({ fx, days }: { fx: TagEffect[]; days: number }) {
  return (
    <section aria-labelledby="tagfx-h" className="rounded-card-lg bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[15px] font-semibold text-link">
        <Sparkles aria-hidden size={18} /> Ваши занятия и фокус
      </p>
      <h2 id="tagfx-h" className="mt-1 text-[20px] font-bold text-ink">
        Что было в дни с разным Focus Score
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        По {days} {plural(days, DAYS_GEN)} с чек-ином и тестом · отметки «что было сегодня»
      </p>
      <ul className="group-list mt-3 !bg-fill/40">
        {fx.map((t) => (
          <li key={`${t.sphere}-${t.key}`} className="flex min-h-11 items-center gap-3 px-3 py-2">
            <span aria-hidden className="text-[20px]">
              {t.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">{t.label}</span>
              <span className="block text-[13px] text-muted">
                {t.withDays} {plural(t.withDays, ["день", "дня", "дней"])} с этим · {t.withoutDays} без{t.withDays < 5 ? " · пока предварительно" : ""}
              </span>
            </span>
            <span className={`text-[17px] font-semibold tabular-nums ${t.diff > 0 ? "text-s-activity-ink" : "text-ink"}`} aria-label={`в среднем на ${Math.abs(t.diff)} ${t.diff > 0 ? "выше" : "ниже"}`}>
              {t.diff > 0 ? "+" : "−"}
              {Math.abs(t.diff)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-muted">
        Разница среднего Focus Score в дни с занятием и без. Это связь, а не причина: такие дни отличаются и другим — сном, нагрузкой, настроением.
      </p>
    </section>
  );
}

function SessionFitCard({ fit, days }: { fit: ReturnType<typeof feelByLength>; days: number }) {
  const shown = fit.filter((f) => f.avg !== null).sort((a, b) => b.avg! - a.avg!);
  if (shown.length < 2) return null;
  const best = shown[0]!.avg! - shown[1]!.avg! >= 0.3 ? shown[0]! : null;
  const rated = fit.reduce((a, f) => a + f.rated, 0);
  const word = (avg: number) => FEELS[Math.round(avg) - 1]!;
  return (
    <section aria-labelledby="fit-h" className="rounded-card-lg bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[15px] font-semibold text-link">
        <Timer aria-hidden size={18} /> Длина сессии
      </p>
      <h2 id="fit-h" className="mt-1 text-[20px] font-bold text-ink">
        {best ? `Сессии по ${best.minutes} минут вы чаще оцениваете выше` : "Оценки сессий разной длины пока похожи"}
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        По {days} {plural(days, DAYS_GEN)} · {rated} {plural(rated, ["оценка", "оценки", "оценок"])} «Как прошла сессия?»
      </p>
      <ul className="group-list mt-3 !bg-fill/40">
        {fit.map((f) => (
          <li key={f.minutes} className="flex min-h-11 items-center gap-3 px-3 py-2">
            <span className="w-16 text-[15px] font-semibold text-ink">{f.minutes} мин</span>
            {f.avg === null ? (
              <span className="text-[15px] text-muted">мало оценок</span>
            ) : (
              <span className="text-[15px] text-ink">
                <span aria-hidden>{word(f.avg).emoji} </span>
                в среднем «{word(f.avg).label.toLowerCase()}»
              </span>
            )}
            <span className="ml-auto text-[13px] text-muted tabular-nums">{f.rated}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-muted">Это ваши ощущения, а не замер. Удобная длина — та, которую легче повторять.</p>
    </section>
  );
}
