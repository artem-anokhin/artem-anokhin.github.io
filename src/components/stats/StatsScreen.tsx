"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { db, type DayKey } from "@/lib/db";
import { MIN_DAYS } from "@/lib/insights";
import { plural } from "@/lib/plural";
import { focusCalendar, hourBins, level, scoreTrend, sleepVsScore, weeklyMinutes } from "@/lib/stats";

type Data = {
  totalMin: number;
  sessions: number;
  tests: number;
  checkins: number;
  weeks: ReturnType<typeof weeklyMinutes>;
  cal: ReturnType<typeof focusCalendar>;
  trend: ReturnType<typeof scoreTrend>;
  hours: ReturnType<typeof hourBins>;
  sleep: ReturnType<typeof sleepVsScore>;
};

const ACCENT = "var(--color-accent)";
const MUTED = "var(--color-muted)";
const GRID = "var(--color-line)";
const tick = { fill: "var(--color-muted)", fontSize: 12 };
const dShort = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const dLong = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", weekday: "short" });
const parse = (k: DayKey) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
const HEAT = ["var(--color-fill)", "color-mix(in srgb, var(--color-accent) 25%, var(--color-surface))", "color-mix(in srgb, var(--color-accent) 50%, var(--color-surface))", "color-mix(in srgb, var(--color-accent) 75%, var(--color-surface))", "var(--color-accent)"];

/** Shared tooltip: surface card with text in ink tokens (never series colour). */
function Tip({ active, payload, label, fmt }: { active?: boolean; payload?: { value?: number; name?: string; payload?: Record<string, unknown> }[]; label?: string; fmt: (p: { value?: number; name?: string; payload?: Record<string, unknown> }[], label?: string) => React.ReactNode }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-[10px] border border-line bg-surface px-3 py-2 text-[13px] text-ink shadow-sm">{fmt(payload, label)}</div>;
}

function Card({ id, title, sub, children }: { id: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-card-lg bg-surface p-4">
      <h2 id={id} className="text-[17px] font-semibold text-ink">
        {title}
      </h2>
      {sub && <p className="text-[13px] text-muted">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** «Статистика»: focus calendar, weekly minutes, score trend, study hours, sleep vs score. */
export function StatsScreen() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([db.sessions.toArray(), db.focusTests.toArray(), db.checkins.toArray()])
      .then(([sessions, tests, checkins]) => {
        if (!alive) return;
        setData({
          totalMin: sessions.reduce((a, s) => a + s.minutes, 0),
          sessions: sessions.length,
          tests: tests.length,
          checkins: checkins.length,
          weeks: weeklyMinutes(sessions),
          cal: focusCalendar(sessions),
          trend: scoreTrend(tests),
          hours: hourBins(sessions),
          sleep: sleepVsScore(checkins, tests),
        });
      })
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return <div aria-busy="true" className="h-96 animate-pulse rounded-card-lg bg-surface" />;
  const { totalMin, sessions, tests, checkins, weeks, cal, trend, hours, sleep } = data;
  const hoursTotal = Math.round((totalMin / 60) * 10) / 10;
  const peak = [...hours].sort((a, b) => b.minutes - a.minutes)[0]!;
  const scored = trend.filter((t) => t.score !== null);

  return (
    <div className="space-y-4">
      {/* 1. Headline tiles */}
      <dl className="grid grid-cols-2 gap-3">
        {[
          [String(hoursTotal).replace(".", ","), "ч", "фокуса всего"],
          [String(sessions), plural(sessions, ["сессия", "сессии", "сессий"]), "завершено"],
          [String(checkins), plural(checkins, ["день", "дня", "дней"]), "с чек-ином"],
          [String(tests), plural(tests, ["тест", "теста", "тестов"]), "реакции"],
        ].map(([v, u, l]) => (
          <div key={l} className="rounded-card-lg bg-surface p-4">
            <dd className="stat text-[30px] text-ink">
              {v}
              <span className="ml-1 font-sans text-[13px] font-semibold tracking-normal text-muted">{u}</span>
            </dd>
            <dt className="text-[13px] text-muted">{l}</dt>
          </div>
        ))}
      </dl>

      {/* 2. Calendar heatmap */}
      <Card id="st-cal" title="Календарь фокуса" sub="12 недель · каждый квадрат — день">
        <div className="flex gap-1.5">
          <div className="grid grid-rows-7 gap-1 text-[13px] leading-none text-muted" aria-hidden>
            {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d, i) => (
              <span key={i} className="flex h-full items-center">
                {d}
              </span>
            ))}
          </div>
          <div className="grid flex-1 grid-flow-col grid-cols-12 grid-rows-7 gap-1" role="img" aria-label={`Календарь фокуса за 12 недель: ${cal.flat().filter((c) => (c.minutes ?? 0) > 0).length} дней с фокус-сессиями.`}>
            {cal.flat().map((c) => (
              <span
                key={c.date}
                title={c.minutes === null ? undefined : `${dLong.format(parse(c.date))}: ${c.minutes} мин`}
                className="aspect-square rounded-[4px]"
                style={{ background: c.minutes === null ? "transparent" : HEAT[level(c.minutes)] }}
              />
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-end gap-1 text-[13px] text-muted" aria-hidden>
          меньше
          {HEAT.map((h, i) => (
            <span key={i} className="size-3 rounded-[3px]" style={{ background: h }} />
          ))}
          больше
        </div>
      </Card>

      {/* 3. Weekly minutes */}
      <Card id="st-weeks" title="Минуты фокуса по неделям" sub="Последние 8 недель">
        <div className="h-[180px]" role="img" aria-label={`Минуты фокуса по неделям: ${weeks.map((w) => w.minutes).join(", ")}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={weeks.map((w) => ({ ...w, label: dShort.format(parse(w.start)) }))} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "var(--color-fill)" }} content={<Tip fmt={(p, l) => <><b>{p[0]?.value} мин</b> · неделя с {l}</>} />} />
              <Bar dataKey="minutes" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 4. Score trend */}
      <Card id="st-trend" title="Focus Score: тренд" sub="Точки — тест дня, линия — среднее за 7 дней">
        {scored.length < 3 ? (
          <p className="text-[15px] text-muted">Пройдите тест хотя бы в 3 разных дня, и здесь появится тренд.</p>
        ) : (
          <>
            <div className="h-[200px]" role="img" aria-label={`Focus Score за 30 дней: ${scored.length} тестов, от ${Math.min(...scored.map((s) => s.score!))} до ${Math.max(...scored.map((s) => s.score!))}.`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart accessibilityLayer={false} data={trend.map((t) => ({ ...t, label: dShort.format(parse(t.date)) }))} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={tick} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={
                      <Tip
                        fmt={(p, l) => (
                          <>
                            <div className="text-muted">{l}</div>
                            {p.map((x) => (x.value == null ? null : <div key={x.name}>{x.name}: <b>{x.value}</b></div>))}
                          </>
                        )}
                      />
                    }
                  />
                  <Line name="Тест дня" type="monotone" dataKey="score" stroke="none" dot={{ r: 4, fill: MUTED, stroke: "var(--color-surface)", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} connectNulls={false} />
                  <Line name="Среднее за 7 дней" type="monotone" dataKey="avg7" stroke={ACCENT} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-[13px] text-muted" aria-hidden>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-muted" /> тест дня
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-accent" /> среднее за 7 дней
              </span>
            </div>
          </>
        )}
      </Card>

      {/* 5. When you study */}
      <Card id="st-hours" title="Когда вы учитесь" sub={peak.minutes > 0 ? `Чаще всего — ${peak.from}:00–${peak.from + 2}:00` : "Пока нет фокус-сессий"}>
        {sessions < 3 ? (
          <p className="text-[15px] text-muted">Завершите хотя бы 3 фокус-сессии в разное время — здесь появится ваш ритм.</p>
        ) : (
        <div className="h-[150px]" role="img" aria-label={`Минуты фокус-сессий по времени начала: ${hours.map((h) => `${h.from}–${h.from + 2} ч: ${h.minutes}`).join(", ")}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={hours.map((h) => ({ ...h, label: `${h.from}` }))} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval={1} />
              <YAxis hide />
              <Tooltip cursor={{ fill: "var(--color-fill)" }} content={<Tip fmt={(p, l) => <>{l}:00–{Number(l) + 2}:00 · <b>{p[0]?.value} мин</b></>} />} />
              <Bar dataKey="minutes" fill={ACCENT} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </Card>

      {/* 6. Sleep vs score */}
      <Card id="st-sleep" title="Сон и Focus Score" sub={`Каждая точка — день с чек-ином и тестом · ${sleep.length} ${plural(sleep.length, ["день", "дня", "дней"])}`}>
        {sleep.length < MIN_DAYS ? (
          <p className="text-[15px] text-muted">Нужно хотя бы {MIN_DAYS} дней с чек-ином и тестом.</p>
        ) : (
          <>
            <div className="h-[200px]" role="img" aria-label={`Точечный график: часы сна и Focus Score за ${sleep.length} дней.`}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart accessibilityLayer={false} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke={GRID} />
                  <XAxis type="number" dataKey="sleep" name="Сон" unit=" ч" domain={["dataMin - 0.5", "dataMax + 0.5"]} tick={tick} tickLine={false} axisLine={false} tickFormatter={(v: number) => String(Math.round(v))} />
                  <YAxis type="number" dataKey="score" name="Focus Score" domain={[0, 100]} ticks={[0, 50, 100]} tick={tick} tickLine={false} axisLine={false} />
                  <ZAxis range={[60, 60]} />
                  <Tooltip
                    cursor={{ stroke: GRID }}
                    content={<Tip fmt={(p) => <>{dShort.format(parse(String(p[0]?.payload?.date)))} · сон <b>{String(p[0]?.payload?.sleep).replace(".", ",")} ч</b> · Score <b>{String(p[0]?.payload?.score)}</b></>} />}
                  />
                  <Scatter data={sleep} fill={ACCENT} fillOpacity={0.75} stroke="var(--color-surface)" strokeWidth={2} isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[13px] text-muted">Если точки идут вверх вправо, Focus Score у вас чаще был выше после долгого сна. Это связь, а не причина.</p>
          </>
        )}
      </Card>

      <details className="group rounded-card-lg bg-surface px-4 py-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[17px] text-link">
          Показать данные таблицей
          <span aria-hidden className="text-chevron transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <table className="mt-2 w-full text-left text-[13px] text-ink">
          <caption className="sr-only">Минуты фокуса по неделям</caption>
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-medium">Неделя с</th>
              <th className="py-1 text-right font-medium">Минут</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.start} className="border-t border-line">
                <td className="py-1.5">{dShort.format(parse(w.start))}</td>
                <td className="py-1.5 text-right tabular-nums">{w.minutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
