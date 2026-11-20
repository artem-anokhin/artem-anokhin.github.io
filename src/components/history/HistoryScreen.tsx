"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { db } from "@/lib/db";
import { historyDays, type HistoryDay } from "@/lib/today";
import { btnPrimary } from "@/components/ui/controls";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; days: HistoryDay[] };

const shortFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const longFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", weekday: "short" });

/** "YYYY-MM-DD" → local Date (avoids UTC parsing of ISO dates). */
function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function HistoryScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reload, setReload] = useState(0);

  // Returning to a tab left open overnight must show fresh days.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && setReload((n) => n + 1);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([db.checkins.toArray(), db.focusTests.toArray()])
      .then(([checkins, tests]) => alive && setState({ kind: "ready", days: historyDays(checkins, tests) }))
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, [reload]);

  if (state.kind === "loading") return <div aria-busy className="card h-64 animate-pulse" />;
  if (state.kind === "error") {
    return <p className="card p-5 text-ink">Не удалось загрузить данные. Обновите страницу.</p>;
  }

  const { days } = state;
  const scores = days.flatMap((d) => (d.score === null ? [] : [d.score]));
  const chartData = days.map((d) => ({ label: shortFmt.format(parseDay(d.date)), score: d.score }));
  const chartLabel =
    scores.length > 0
      ? `График Focus Score за 30 дней: ${scores.length} измерений, от ${Math.min(...scores)} до ${Math.max(...scores)}.`
      : "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {scores.length < 2 ? (
        <section className="rounded-card-lg bg-surface p-4">
          <p className="text-ink">Пока мало данных. Пройдите тест в разные дни, и здесь появится график.</p>
          <Link href="/test/" className={`${btnPrimary} mt-4 w-full`}>
            Пройти тест
          </Link>
        </section>
      ) : (
        <section className="rounded-card-lg bg-surface p-4" aria-labelledby="chart-title">
          <h2 id="chart-title" className="text-[17px] font-semibold text-ink">
            Focus Score по дням
          </h2>
          <p className="mb-3 text-[13px] text-muted">Последний тест каждого дня</p>
          <div role="img" aria-label={`${chartLabel} Значения по дням — в списке ниже.`} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart accessibilityLayer={false} data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                <Tooltip formatter={(v) => [v, "Focus Score"]} />
                <Line type="monotone" dataKey="score" stroke="#1E5BFF" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section aria-labelledby="days-title">
        <h2 id="days-title" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
          Дни
        </h2>
        <ul className="group-list">
          {[...days].reverse().map((d) => (
            <li key={d.date} className="flex min-h-11 items-center gap-3 px-4 py-2.5">
              <span className="flex-1 text-[17px] text-ink first-letter:uppercase">{longFmt.format(parseDay(d.date))}</span>
              <span className="text-[13px] text-muted">
                {d.checkedIn ? (
                  <span className="inline-flex items-center gap-1 text-s-activity-ink">
                    <Check aria-hidden size={15} strokeWidth={3} /> Чек-ин: да
                  </span>
                ) : (
                  "Чек-ин: нет"
                )}
              </span>
              <span
                className={`w-9 text-right text-[17px] font-semibold tabular-nums ${d.score === null ? "text-chevron" : "text-ink"}`}
                aria-label={d.score === null ? "нет теста" : `Focus Score ${d.score}`}
              >
                {d.score ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
