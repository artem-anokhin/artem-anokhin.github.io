"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, CircleCheck } from "lucide-react";
import { SPHERES, type CheckInData } from "@/lib/checkin";
import { db, dayKey, type FocusTestResult } from "@/lib/db";
import type { Mode } from "@/lib/settings";
import { TIPS } from "@/lib/tips";
import { TIP_CARD, cardHref } from "@/lib/libraryLinks";
import { latestTestByDay, pickTip, sphereStatus, type SphereStatus } from "@/lib/today";
import { btnPrimary } from "@/components/ui/controls";
import { CheckInSummary } from "@/components/checkin/CheckInSummary";

type ScoreState = { kind: "loading" } | { kind: "error" } | { kind: "ready"; test: FocusTestResult | null };

const STATUS_TEXT: Record<Exclude<SphereStatus, null>, string> = {
  ok: "в норме",
  attention: "обратите внимание",
};

const timeFmt = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

function FocusScoreCard() {
  const [state, setState] = useState<ScoreState>({ kind: "loading" });
  useEffect(() => {
    let alive = true;
    const date = dayKey();
    db.focusTests
      .where("date")
      .equals(date)
      .toArray()
      .then((tests) => alive && setState({ kind: "ready", test: latestTestByDay(tests).get(date) ?? null }))
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.kind === "loading") return <div aria-busy className="card h-36 animate-pulse" />;
  if (state.kind === "error") {
    return <p className="card p-5 text-ink">Не удалось загрузить данные. Обновите страницу.</p>;
  }
  const { test } = state;
  return (
    <section className="card p-5 md:p-6" aria-labelledby="score-title">
      <h2 id="score-title" className="text-muted">
        Focus Score
      </h2>
      {test ? (
        <>
          <p className="font-display text-5xl font-black text-navy">
            {test.score}
            <span className="text-xl text-muted"> / 100</span>
          </p>
          <p className="mt-1 text-sm text-muted">Последний тест в {timeFmt.format(test.takenAt)}</p>
        </>
      ) : (
        <>
          <p className="mt-1 text-ink">Теста сегодня ещё не было. 90 секунд — и вы увидите свой Focus Score от 0 до 100.</p>
          <Link href="/test/" className={`${btnPrimary} mt-4 w-full`}>
            Пройти тест
          </Link>
        </>
      )}
    </section>
  );
}

function SpheresCard({ data }: { data: CheckInData }) {
  const status = sphereStatus(data);
  return (
    <section className="card p-5 md:p-6" aria-labelledby="spheres-title">
      <h2 id="spheres-title" className="font-display text-xl font-extrabold text-navy">
        7 сфер
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {SPHERES.map(({ key, title }) => {
          const s = status[key];
          return (
            <li key={key} className="flex min-h-11 items-center justify-between gap-3 py-2">
              <span className="text-ink">{title}</span>
              {s ? (
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    s === "ok" ? "bg-soft text-navy" : "border-[1.5px] border-accent text-accent"
                  }`}
                >
                  {s === "attention" && <span aria-hidden>! </span>}
                  {STATUS_TEXT[s]}
                </span>
              ) : (
                <span className="text-sm text-muted">отмечено</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-muted">Это ваши отметки, а не оценка.</p>
    </section>
  );
}

function TipCard({ data }: { data: CheckInData }) {
  const key = pickTip(data);
  const tip = TIPS[key];
  return (
    <section className="card p-5 md:p-6" aria-labelledby="tip-title">
      <p className="text-sm font-semibold text-accent">Совет на завтра</p>
      <h2 id="tip-title" className="mt-1 font-display text-lg font-extrabold text-navy">
        {tip.title}
      </h2>
      <p className="mt-2 text-ink">{tip.text}</p>
      <a
        href={tip.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex min-h-11 items-center text-sm text-muted underline"
      >
        Источник: {tip.source}
      </a>
      <a href={cardHref(TIP_CARD[key])} className="flex min-h-11 items-center font-semibold text-accent underline">
        Подробнее в библиотеке
      </a>
    </section>
  );
}

export function TodayOverview({ data, mode, onEdit }: { data: CheckInData; mode: Mode; onEdit: () => void }) {
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 font-medium text-navy" role="status">
        <CircleCheck aria-hidden className="text-leaf" size={22} />
        {dateFmt.format(new Date())} · чек-ин сохранён
      </p>
      <FocusScoreCard key={dayKey()} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SpheresCard data={data} />
        <TipCard data={data} />
      </div>
      <Link href="/history/" className="card flex min-h-14 items-center justify-between px-5 font-semibold text-navy hover:bg-soft">
        История
        <ChevronRight aria-hidden size={20} />
      </Link>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-navy">
          Подробности чек-ина
        </summary>
        <div className="mt-3">
          <CheckInSummary data={data} mode={mode} onEdit={onEdit} />
        </div>
      </details>
    </div>
  );
}
