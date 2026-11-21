"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, CalendarRange, ChartLine, Check, ChevronRight, ClipboardCheck, Lightbulb, Settings, Sprout, Timer, Wind, Zap } from "lucide-react";
import type { CheckInData } from "@/lib/checkin";
import { db, dayKey, type CheckIn } from "@/lib/db";
import { MIN_DAYS, pairDays, usableDays } from "@/lib/insights";
import { TIP_CARD, cardHref } from "@/lib/libraryLinks";
import { plural } from "@/lib/plural";
import { getProfile } from "@/lib/settings";
import { activeHabits } from "@/lib/habits";
import { loadTree } from "@/lib/garden";
import { HabitsToday } from "@/components/habits/HabitsToday";
import { TIPS } from "@/lib/tips";
import { latestTestByDay, pickTip } from "@/lib/today";
import type { TreeState } from "@/lib/tree";
import { weeklyReview, type WeeklyReview } from "@/lib/weekly";
import { btnPrimary } from "@/components/ui/controls";
import { DayRings, ProgressRing, WeekStrip } from "@/components/ui/visuals";

type Data = {
  today: CheckIn | null;
  score: number | null;
  tree: TreeState;
  week: WeeklyReview;
  usable: number;
  focusToday: number;
  habitsDone: number;
  habitsTotal: number;
};

/** Daily focus ring goal: one standard session. */
const FOCUS_GOAL = 25;

const dateFmt = new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "long" });

function greeting(h: number): string {
  if (h >= 5 && h < 12) return "Доброе утро";
  if (h >= 12 && h < 18) return "Добрый день";
  if (h >= 18 && h < 23) return "Добрый вечер";
  return "Доброй ночи";
}

/** «Сегодня»: one hero scene, two big actions, then calm rows (docs/DESIGN.md §4). */
export function HomeScreen() {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!(await getProfile())) return; // AppShell redirects to onboarding
      const key = dayKey();
      const [checkins, tests, sessions, tree, habitLogs, habits] = await Promise.all([
        db.checkins.toArray(),
        db.focusTests.toArray(),
        db.sessions.toArray(),
        loadTree(),
        db.habitLogs.toArray(),
        activeHabits(),
      ]);
      if (!alive) return;
      setData({
        today: checkins.find((c) => c.date === key) ?? null,
        score: latestTestByDay(tests).get(key)?.score ?? null,
        tree,
        week: weeklyReview(checkins, tests, sessions, key, habitLogs),
        usable: usableDays(pairDays(checkins, tests)),
        focusToday: sessions.filter((s) => s.date === key).reduce((a, s) => a + s.minutes, 0),
        habitsTotal: habits.length,
        habitsDone: habits.filter((h) => habitLogs.some((l) => l.habitId === h.id && l.date === key)).length,
      });
    })().catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [reload]);

  // A tab left open past midnight must show the new day.
  useEffect(() => {
    let loadedFor = dayKey();
    const onVisible = () => {
      if (document.visibilityState === "visible" && dayKey() !== loadedFor) {
        loadedFor = dayKey();
        setReload((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const now = new Date();

  return (
    <div className="stagger space-y-6">
      <header className="flex items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-[15px] font-medium text-muted first-letter:uppercase">{dateFmt.format(now)}</p>
          <h1 className="title text-[34px]">{greeting(now.getHours())}</h1>
        </div>
        <Link href="/settings/" aria-label="Настройки" className="pressable grid size-11 shrink-0 place-items-center text-link md:hidden">
          <Settings aria-hidden size={24} />
        </Link>
      </header>

      {failed ? (
        <section role="alert" className="card p-6">
          <p className="text-ink">Не удалось открыть данные на этом устройстве.</p>
          <button type="button" className={`${btnPrimary} mt-4`} onClick={() => setReload((n) => n + 1)}>
            Попробовать ещё раз
          </button>
        </section>
      ) : !data ? (
        <div aria-busy="true" className="h-[420px] animate-pulse rounded-card-lg bg-surface" />
      ) : (
        <Loaded data={data} onChange={() => setReload((n) => n + 1)} />
      )}
    </div>
  );
}

function Loaded({ data, onChange }: { data: Data; onChange: () => void }) {
  const { today, score, tree, week, usable, focusToday, habitsDone, habitsTotal } = data;
  const strip = week.days.map((d, i) => ({ date: d.date, done: d.checkin || d.test || d.session || d.habit, today: i === 6 }));

  return (
    <>
      {/* Summary: three day rings + facts (Apple Fitness style) */}
      <section aria-label="Сводка за сегодня" className="rounded-card-lg bg-surface p-4">
        <div className="flex items-center gap-5">
          <div
            role="img"
            aria-label={`Кольца дня: чек-ин ${today ? "сделан" : "не сделан"}, фокус ${focusToday} из ${FOCUS_GOAL} минут${habitsTotal ? `, привычки ${habitsDone} из ${habitsTotal}` : ""}.`}
            className="shrink-0"
          >
            <DayRings
              size={116}
              stroke={13}
              rings={[
                { value: today ? 1 : 0, color: "var(--color-s-mind)", track: "color-mix(in srgb, var(--color-s-mind) 18%, transparent)" },
                { value: focusToday / FOCUS_GOAL, color: "var(--color-s-sleep)", track: "color-mix(in srgb, var(--color-s-sleep) 18%, transparent)" },
                { value: habitsTotal ? habitsDone / habitsTotal : 0, color: "var(--color-s-activity)", track: "color-mix(in srgb, var(--color-s-activity) 18%, transparent)" },
              ]}
            />
          </div>
          <dl className="min-w-0 flex-1 space-y-2">
            <Fact label="Чек-ин" value={today ? "Готов" : "Нет"} dot="bg-s-mind" />
            <Fact label="Фокус" value={`${focusToday}/${FOCUS_GOAL} мин`} dot="bg-s-sleep" />
            <Fact label="Привычки" value={habitsTotal ? `${habitsDone} из ${habitsTotal}` : "—"} dot="bg-s-activity" />
            <div className="flex items-center justify-between gap-2 border-t border-line">
              <dt className="text-[15px] whitespace-nowrap text-muted">Focus Score</dt>
              <dd>
                <Link
                  href={score === null ? "/test/" : "/history/"}
                  aria-label={score === null ? "Пройти тест" : `Focus Score ${score}, история`}
                  className="inline-flex min-h-11 items-center text-[15px] font-semibold whitespace-nowrap text-link tabular-nums"
                >
                  {score === null ? "Пройти тест" : score}
                </Link>
              </dd>
            </div>
          </dl>
        </div>
        <div className="mt-4 border-t border-line pt-3">
          <WeekStrip days={strip} />
        </div>
      </section>

      {!today && (
        <Link href="/checkin/" className={`${btnPrimary} w-full`}>
          Отметить день
        </Link>
      )}

      <section aria-labelledby="actions-h">
        <h2 id="actions-h" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
          Действия
        </h2>
        <nav aria-label="Действия" className="group-list">
          {today && (
            <Row href="/checkin/" icon={<ClipboardCheck aria-hidden size={18} />} tint="bg-accent text-white" title="Чек-ин готов" sub="Изменить ответы" done />
          )}
          <Row href="/test/" icon={<Zap aria-hidden size={18} />} tint="bg-orange text-white" title="Тест реакции" sub={score === null ? "90 секунд · Focus Score" : `Сегодня ${score} из 100`} done={score !== null} />
          <Row href="/focus/" icon={<Timer aria-hidden size={18} />} tint="bg-s-sleep text-white" title="Фокус-сессия" sub={focusToday ? `Сегодня ${focusToday} мин` : "15, 25 или 50 минут"} />
          <Row href="/breathe/" icon={<Wind aria-hidden size={18} />} tint="bg-s-caffeine text-white" title="Дыхание" sub="1 минута, чтобы успокоиться" />
        </nav>
      </section>

      <HabitsToday onChange={onChange} />

      {usable < MIN_DAYS && <Countdown days={usable} />}
      {today && <Tip data={today} />}

      <section aria-labelledby="more-h">
        <h2 id="more-h" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
          Обзор
        </h2>
        <nav aria-label="Обзор" className="group-list">
          <Row href="/tree/" icon={<Sprout aria-hidden size={18} />} tint="bg-leaf text-white" title="Сад" sub={`${tree.stageName[0]!.toUpperCase()}${tree.stageName.slice(1)} · ${tree.drops} ${plural(tree.drops, ["капля", "капли", "капель"])}`} />
          <Row href="/week/" icon={<CalendarRange aria-hidden size={18} />} tint="bg-s-mind text-white" title="Итоги недели" sub="Как прошли ваши 7 дней" />
          <Row href="/history/" icon={<ChartLine aria-hidden size={18} />} tint="bg-accent text-white" title="История" sub="Focus Score за 30 дней" />
          <Row href="/settings/#reminder" icon={<BellRing aria-hidden size={18} />} tint="bg-red text-white" title="Напоминание" sub="Каждый день в удобное время" plain />
        </nav>
      </section>
    </>
  );
}

function Fact({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="flex items-center gap-2 text-[15px] text-muted">
        <span aria-hidden className={`size-2 rounded-full ${dot}`} />
        {label}
      </dt>
      <dd className="text-[15px] font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

function Row({
  href,
  icon,
  tint,
  title,
  sub,
  plain,
  done,
}: {
  href: string;
  icon: React.ReactNode;
  tint: string;
  title: string;
  sub: string;
  plain?: boolean;
  done?: boolean;
}) {
  const inner = (
    <>
      <span className={`grid size-8 shrink-0 place-items-center rounded-[8px] ${tint}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] text-ink">{title}</span>
        <span className="block text-[13px] text-muted">{sub}</span>
      </span>
      {done ? <Check aria-hidden size={20} className="text-leaf" strokeWidth={2.6} /> : <ChevronRight aria-hidden size={18} className="text-chevron" />}
    </>
  );
  const cls = "flex min-h-[60px] items-center gap-3 px-4 py-2 active:bg-pressed";
  // Hash deep links need a full load so the target section can scroll into view.
  return plain ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

function Countdown({ days }: { days: number }) {
  const left = MIN_DAYS - days;
  return (
    <Link href="/insights/" className="pressable flex items-center gap-4 rounded-card-lg bg-surface p-4">
      <ProgressRing value={days / MIN_DAYS} size={52} stroke={6}>
        <span className="text-[13px] font-semibold text-ink tabular-nums">
          {days}/{MIN_DAYS}
        </span>
      </ProgressRing>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold text-ink">
          До инсайтов {left} {plural(left, ["день", "дня", "дней"])}
        </span>
        <span className="block text-[13px] text-muted">Дни, где есть и чек-ин, и тест</span>
      </span>
      <ChevronRight aria-hidden size={18} className="text-chevron" />
    </Link>
  );
}

function Tip({ data }: { data: CheckInData }) {
  const key = pickTip(data);
  const tip = TIPS[key];
  return (
    <section aria-labelledby="tip-h" className="rounded-card-lg bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
        <Lightbulb aria-hidden size={15} className="text-orange" /> Совет на завтра
      </p>
      <h2 id="tip-h" className="mt-1.5 text-[17px] font-semibold text-ink">
        {tip.title}
      </h2>
      <p className="mt-1 text-[15px] leading-relaxed text-ink/90">{tip.text}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4">
        <a href={cardHref(TIP_CARD[key])} className="inline-flex min-h-11 items-center text-[15px] font-medium text-link">
          Подробнее
        </a>
        <a href={tip.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-[13px] text-muted underline">
          Источник: {tip.source}
          <span className="sr-only"> (откроется в новой вкладке)</span>
        </a>
      </div>
    </section>
  );
}
