"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BellRing, Check, ChevronRight, ClipboardCheck, Lightbulb, Settings, Timer } from "lucide-react";
import { SPHERES, type CheckInData } from "@/lib/checkin";
import { db, dayKey, type CheckIn } from "@/lib/db";
import { MIN_DAYS, pairDays, usableDays } from "@/lib/insights";
import { TIP_CARD, cardHref } from "@/lib/libraryLinks";
import { plural } from "@/lib/plural";
import { getExperiment, getExperimentHistory, getProfile } from "@/lib/settings";
import { SPHERE_STYLE } from "@/lib/spheres";
import { TIPS } from "@/lib/tips";
import { latestTestByDay, pickTip, sphereStatus } from "@/lib/today";
import { STAGES, treeState, type TreeState } from "@/lib/tree";
import { weeklyReview, type WeeklyReview } from "@/lib/weekly";
import { btnPrimary } from "@/components/ui/controls";
import { DropIcon, ProgressRing, TreeScene, WeekStrip } from "@/components/ui/visuals";

type Data = {
  today: CheckIn | null;
  score: number | null;
  tree: TreeState;
  week: WeeklyReview;
  usable: number;
  focusToday: number;
};

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
      const [checkins, tests, sessions, experiment, past] = await Promise.all([
        db.checkins.toArray(),
        db.focusTests.toArray(),
        db.sessions.toArray(),
        getExperiment(),
        getExperimentHistory(),
      ]);
      const tree = treeState({
        checkinDates: checkins.map((c) => c.date),
        tests,
        experiment,
        pastExperiments: past,
        sessionDates: sessions.map((s) => s.date),
        today: key,
      });
      if (!alive) return;
      setData({
        today: checkins.find((c) => c.date === key) ?? null,
        score: latestTestByDay(tests).get(key)?.score ?? null,
        tree,
        week: weeklyReview(checkins, tests, sessions, key),
        usable: usableDays(pairDays(checkins, tests)),
        focusToday: sessions.filter((s) => s.date === key).reduce((a, s) => a + s.minutes, 0),
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
    <div className="stagger space-y-7">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow first-letter:uppercase">{dateFmt.format(now)}</p>
          <h1 className="title mt-1 text-[32px]">{greeting(now.getHours())}</h1>
        </div>
        <Link
          href="/settings/"
          aria-label="Настройки"
          className="pressable grid size-11 shrink-0 place-items-center rounded-full bg-surface text-navy shadow-soft md:hidden"
        >
          <Settings aria-hidden size={22} />
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
        <div aria-busy="true" className="h-[420px] animate-pulse rounded-card-lg bg-soft" />
      ) : (
        <Loaded data={data} />
      )}
    </div>
  );
}

function Loaded({ data }: { data: Data }) {
  const { today, score, tree, week, usable, focusToday } = data;
  const strip = week.days.map((d, i) => ({ date: d.date, done: d.checkin || d.test || d.session, today: i === 6 }));
  const next = tree.nextAt === null ? null : STAGES[tree.stage + 1];

  return (
    <>
      <WeekStrip days={strip} />

      {/* Hero: the garden + today's Focus Score */}
      <section aria-label="Ваш сад и фокус сегодня" className="relative overflow-hidden rounded-card-lg shadow-soft">
        <Link href="/tree/" aria-label={`Сад: ${tree.stageName}`} className="block">
          <TreeScene stage={tree.stage} wilting={tree.wilting} title={`Дерево: ${tree.stageName}`} className="h-[260px]" lift={30} />
        </Link>
        <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[13px] font-semibold text-ink backdrop-blur">
          <DropIcon />
          {tree.drops} {plural(tree.drops, ["капля", "капли", "капель"])}
        </span>
        <Link
          href={score === null ? "/test/" : "/history/"}
          className="pressable absolute top-4 right-4 rounded-full bg-white/85 p-1.5 shadow-soft backdrop-blur"
          aria-label={score === null ? "Focus Score сегодня ещё нет. Пройти тест" : `Focus Score сегодня: ${score} из 100. История`}
        >
          <ProgressRing value={(score ?? 0) / 100} size={92} stroke={9}>
            {score === null ? (
              <span className="text-[12px] leading-tight font-semibold text-navy">
                Тест
                <br />
                90 сек
              </span>
            ) : (
              <span>
                <span className="stat block text-[28px] text-navy">{score}</span>
                <span className="text-[11px] font-semibold text-muted">фокус</span>
              </span>
            )}
          </ProgressRing>
        </Link>
        <p className="absolute bottom-3 left-4 rounded-full bg-white/85 px-3 py-1 text-[13px] font-semibold text-ink backdrop-blur first-letter:uppercase">
          {tree.stageName}
          {next && tree.nextAt !== null && <span className="font-medium text-muted"> · до «{next}» {tree.nextAt - tree.drops}</span>}
        </p>
      </section>

      {/* Two primary actions */}
      <div className="grid grid-cols-2 gap-3">
        {today ? (
          <Link href="/checkin/" className="pressable flex min-h-28 flex-col justify-between rounded-card bg-s-activity-tint p-4 text-s-activity-ink">
            <span className="grid size-10 place-items-center rounded-full bg-leaf text-white">
              <Check aria-hidden size={22} strokeWidth={3} />
            </span>
            <span>
              <span className="block text-[17px] font-semibold">Чек-ин готов</span>
              <span className="text-[13px] font-medium">Изменить</span>
            </span>
          </Link>
        ) : (
          <Link href="/checkin/" className="pressable flex min-h-28 flex-col justify-between rounded-card bg-navy p-4 text-white shadow-lift">
            <span className="grid size-10 place-items-center rounded-full bg-white/15">
              <ClipboardCheck aria-hidden size={22} />
            </span>
            <span>
              <span className="block text-[17px] font-semibold">Чек-ин</span>
              <span className="text-[13px] text-white/75">1 минута · +1 капля</span>
            </span>
          </Link>
        )}
        <Link href="/focus/" className="pressable night flex min-h-28 flex-col justify-between rounded-card p-4 shadow-lift">
          <span className="grid size-10 place-items-center rounded-full bg-white/12 text-night-ink">
            <Timer aria-hidden size={22} />
          </span>
          <span>
            <span className="block text-[17px] font-semibold">Фокус-сессия</span>
            <span className="text-[13px] text-night-muted">{focusToday ? `Сегодня ${focusToday} мин` : "25 или 50 минут"}</span>
          </span>
        </Link>
      </div>

      {today && <TodaySpheres data={today} />}
      {usable < MIN_DAYS && <Countdown days={usable} />}
      {today && <Tip data={today} />}

      <nav aria-label="Ещё" className="divide-y divide-line overflow-hidden rounded-card-lg bg-surface shadow-soft">
        <Row href="/settings/#reminder" icon={<BellRing aria-hidden size={20} />} tint="bg-s-rest-tint text-s-rest-ink" title="Напоминание" sub="Каждый день в удобное время" plain />
        <Row href="/history/" icon={<ArrowRight aria-hidden size={20} />} tint="bg-soft text-navy" title="История" sub="Focus Score за 30 дней" />
      </nav>
    </>
  );
}

function Row({ href, icon, tint, title, sub, plain }: { href: string; icon: React.ReactNode; tint: string; title: string; sub: string; plain?: boolean }) {
  const inner = (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tint}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block text-[14px] text-muted">{sub}</span>
      </span>
      <ChevronRight aria-hidden size={20} className="text-muted" />
    </>
  );
  const cls = "flex min-h-16 items-center gap-4 px-4 py-3 hover:bg-bg";
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

function TodaySpheres({ data }: { data: CheckInData }) {
  const status = sphereStatus(data);
  return (
    <section aria-labelledby="spheres-h">
      <h2 id="spheres-h" className="eyebrow mb-3">
        Ваш день
      </h2>
      <ul className="flex flex-wrap gap-2">
        {SPHERES.map(({ key, title }) => {
          const st = SPHERE_STYLE[key];
          const Icon = st.icon;
          const attention = status[key] === "attention";
          return (
            <li key={key} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold ${st.tint} ${st.ink}`}>
              <Icon aria-hidden size={16} />
              {title}
              {attention && (
                <>
                  <span aria-hidden className="size-2 rounded-full bg-sun" />
                  <span className="sr-only"> — обратите внимание</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[13px] text-muted">Жёлтая точка — на что обратить внимание. Это ваши отметки, а не оценка.</p>
    </section>
  );
}

function Countdown({ days }: { days: number }) {
  const left = MIN_DAYS - days;
  return (
    <Link href="/insights/" className="pressable flex items-center gap-4 rounded-card-lg bg-surface p-4 shadow-soft">
      <ProgressRing value={days / MIN_DAYS} size={64} stroke={7}>
        <span className="stat text-[18px] text-navy">
          {days}/{MIN_DAYS}
        </span>
      </ProgressRing>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">
          До инсайтов: {left} {plural(left, ["день", "дня", "дней"])}
        </span>
        <span className="block text-[14px] text-muted">Нужны дни с чек-ином и тестом. Потом покажем, что связано с вашим фокусом.</span>
      </span>
    </Link>
  );
}

function Tip({ data }: { data: CheckInData }) {
  const key = pickTip(data);
  const tip = TIPS[key];
  return (
    <section aria-labelledby="tip-h" className="rounded-card-lg bg-sand p-5">
      <p className="eyebrow flex items-center gap-1.5 text-sand-ink">
        <Lightbulb aria-hidden size={16} /> Совет на завтра
      </p>
      <h2 id="tip-h" className="title mt-2 text-[20px]">
        {tip.title}
      </h2>
      <p className="mt-2 text-ink">{tip.text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4">
        <a href={cardHref(TIP_CARD[key])} className="inline-flex min-h-11 items-center font-semibold text-navy underline underline-offset-4">
          Подробнее
        </a>
        <a href={tip.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-[13px] text-sand-ink underline">
          Источник: {tip.source}
          <span className="sr-only"> (откроется в новой вкладке)</span>
        </a>
      </div>
    </section>
  );
}
