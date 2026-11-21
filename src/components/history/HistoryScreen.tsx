"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { db, type CheckIn, type FocusSession } from "@/lib/db";
import { minutesByTask } from "@/lib/focusSession";
import { plural } from "@/lib/plural";
import { historyDays, type HistoryDay } from "@/lib/today";
import { btnPrimary } from "@/components/ui/controls";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; days: HistoryDay[]; moods: Map<string, number>; sessions: FocusSession[] };

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
    Promise.all([db.checkins.toArray(), db.focusTests.toArray(), db.sessions.toArray()])
      .then(([checkins, tests, sessions]) => {
        if (!alive) return;
        const days = historyDays(checkins, tests);
        const from = days[0]!.date;
        setState({
          kind: "ready",
          days,
          moods: moodByDay(checkins),
          sessions: sessions.filter((s) => s.date >= from),
        });
      })
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, [reload]);

  if (state.kind === "loading") return <div aria-busy className="card h-64 animate-pulse" />;
  if (state.kind === "error") {
    return <p className="card p-5 text-ink">Не удалось загрузить данные. Обновите страницу.</p>;
  }

  const { days, moods, sessions } = state;
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

      <MoodPixels days={days} moods={moods} />

      <TaskTotals sessions={sessions} />

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

function moodByDay(checkins: CheckIn[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of checkins) if (typeof c.mind?.mood === "number") m.set(c.date, c.mind.mood);
  return m;
}

const MOOD_WORDS = ["", "очень плохое", "плохое", "среднее", "хорошее", "отличное"];
/** Mood 1–5 → share of the mind-sphere color. */
const MOOD_MIX = [0, 22, 40, 60, 80, 100];

/** «Год в пикселях»-style grid: one square per day, colored by mood (Daylio-like). */
function MoodPixels({ days, moods }: { days: HistoryDay[]; moods: Map<string, number> }) {
  const known = days.filter((d) => moods.has(d.date));
  if (known.length < 3) return null;
  const lead = (parseDay(days[0]!.date).getDay() + 6) % 7; // Monday-first offset
  const avg = known.reduce((a, d) => a + moods.get(d.date)!, 0) / known.length;
  return (
    <section className="rounded-card-lg bg-surface p-4" aria-labelledby="mood-title">
      <h2 id="mood-title" className="text-[17px] font-semibold text-ink">
        Настроение за 30 дней
      </h2>
      <p className="mb-3 text-[13px] text-muted">
        {known.length} {plural(known.length, ["день", "дня", "дней"])} с отметкой · в среднем {MOOD_WORDS[Math.round(avg)]}
      </p>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted" aria-hidden>
        {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <ul className="mt-1 grid grid-cols-7 gap-1.5" aria-label="Настроение по дням">
        {Array.from({ length: lead }, (_, i) => (
          <li key={`pad${i}`} aria-hidden />
        ))}
        {days.map((d) => {
          const m = moods.get(d.date);
          const label = `${longFmt.format(parseDay(d.date))}: ${m ? `настроение ${MOOD_WORDS[m]}` : "нет отметки"}`;
          return (
            <li key={d.date} className="aspect-square">
              <span
                role="img"
                title={label}
                aria-label={label}
                className="block size-full rounded-[6px]"
                style={{
                background: m ? `color-mix(in srgb, var(--color-s-mind) ${MOOD_MIX[m]}%, var(--color-surface))` : "var(--color-fill)",
                outline: m ? undefined : "1px dashed var(--color-line)",
                  outlineOffset: -1,
                }}
              />
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[12px] text-muted" aria-hidden>
        хуже
        {[1, 2, 3, 4, 5].map((m) => (
          <span
            key={m}
            className="size-3.5 rounded-[4px]"
            style={{ background: `color-mix(in srgb, var(--color-s-mind) ${MOOD_MIX[m]}%, var(--color-surface))` }}
          />
        ))}
        лучше
      </div>
    </section>
  );
}

/** Focus-session minutes per task label over the last 30 days. */
function TaskTotals({ sessions }: { sessions: FocusSession[] }) {
  if (sessions.length === 0) return null;
  const rows = minutesByTask(sessions).slice(0, 6);
  const max = rows[0]!.minutes;
  const total = sessions.reduce((a, s) => a + s.minutes, 0);
  return (
    <section aria-labelledby="tasks-title">
      <h2 id="tasks-title" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
        Фокус по задачам · {Math.round((total / 60) * 10) / 10} ч
      </h2>
      <ul className="group-list">
        {rows.map((r) => (
          <li key={r.task} className="px-4 py-2.5">
            <div className="flex items-baseline gap-3">
              <span className="min-w-0 flex-1 truncate text-[17px] text-ink">{r.task}</span>
              <span className="text-[15px] text-muted tabular-nums">
                {r.minutes} мин · {r.count} {plural(r.count, ["сессия", "сессии", "сессий"])}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-fill" aria-hidden>
              <div className="h-full rounded-full bg-s-work" style={{ width: `${Math.max(4, (r.minutes / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
