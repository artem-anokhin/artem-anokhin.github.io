"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brain, ChevronRight, Palette, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { brainHistory } from "@/lib/brainTests";
import { cardHref } from "@/lib/libraryLinks";
import { Sparkline } from "./common";

type Row = { href: string; title: string; sub: string; icon: React.ReactNode; tint: string; values: number[]; unit: string };

/** «Тесты»: three short attention/memory tests with your own trend (no norms). */
export function TestsHub() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([db.focusTests.toArray(), brainHistory("stroop"), brainHistory("span")])
      .then(([focus, stroop, span]) => {
        if (!alive) return;
        setRows([
          {
            href: "/test/",
            title: "Тест реакции",
            sub: "Устойчивость внимания · 90 секунд",
            icon: <Zap aria-hidden size={20} />,
            tint: "bg-orange text-white",
            values: [...focus].sort((a, b) => a.takenAt - b.takenAt).map((t) => t.score),
            unit: "Focus Score",
          },
          {
            href: "/tests/stroop/",
            title: "Цвет и слово",
            sub: "Контроль внимания · 1 минута",
            icon: <Palette aria-hidden size={20} />,
            tint: "bg-s-mind text-white",
            values: stroop.map((t) => t.score),
            unit: "баллов",
          },
          {
            href: "/tests/memory/",
            title: "Запомни порядок",
            sub: "Рабочая память · 1–2 минуты",
            icon: <Brain aria-hidden size={20} />,
            tint: "bg-s-sleep text-white",
            values: span.map((t) => t.score),
            unit: "в ряд",
          },
        ]);
      })
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, []);

  if (rows === null) return <div aria-busy="true" className="h-64 animate-pulse rounded-card-lg bg-surface" />;

  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {rows.map((r) => {
          const last = r.values.at(-1);
          const best = r.values.length ? Math.max(...r.values) : null;
          return (
            <li key={r.href}>
              <Link href={r.href} className="pressable block rounded-card-lg bg-surface p-4 active:bg-pressed">
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-[10px] ${r.tint}`}>{r.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold text-ink">{r.title}</span>
                    <span className="block text-[13px] text-muted">{r.sub}</span>
                  </span>
                  <ChevronRight aria-hidden size={18} className="text-chevron" />
                </div>
                {last !== undefined ? (
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="stat text-[28px] text-ink">
                        {last}
                        <span className="ml-1 font-sans text-[13px] font-semibold tracking-normal text-muted">{r.unit}</span>
                      </p>
                      <p className="text-[13px] text-muted">
                        Лучший: {best} · попыток: {r.values.length}
                      </p>
                    </div>
                    <Sparkline values={r.values} label={`${r.title}, последние результаты`} night={false} width={140} height={44} />
                  </div>
                ) : (
                  <p className="mt-3 text-[15px] text-link">Пройти первый раз</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="px-4 text-[13px] text-muted">
        Это короткие версии классических тестов. Шкалы наши, а результаты растут от повторов, поэтому сравнивайте себя с собой, лучше в одно и то же время дня.{" "}
        <a href={cardHref("focus-test")} className="text-link underline">
          Как это работает
        </a>
        . Не является медицинской консультацией.
      </p>
    </div>
  );
}
