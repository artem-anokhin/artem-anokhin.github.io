"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db, dayKey } from "@/lib/db";
import { getExperiment, getExperimentHistory } from "@/lib/settings";
import { STAGES, treeMessages, treeState, type TreeState } from "@/lib/tree";
import { btnPrimary } from "@/components/ui/controls";
import { DropIcon, TreeScene } from "@/components/ui/visuals";
import { plural } from "@/lib/plural";
import { ShareWeek } from "./ShareWeek";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; tree: TreeState };

const WEEKDAY = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function weekday(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return WEEKDAY[new Date(y!, m! - 1, d!).getDay()]!;
}

export function TreeScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([db.checkins.toArray(), db.focusTests.toArray(), getExperiment(), getExperimentHistory(), db.sessions.toArray()])
      .then(([checkins, tests, experiment, pastExperiments, sessions]) => {
        if (!alive) return;
        const tree = treeState({
          checkinDates: checkins.map((c) => c.date),
          tests,
          experiment,
          pastExperiments,
          sessionDates: sessions.map((s) => s.date),
          today: dayKey(),
        });
        setState({ kind: "ready", tree });
      })
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, [reload]);

  // A tab left open overnight must count the new day.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && setReload((n) => n + 1);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (state.kind === "loading") return <div aria-busy role="status" aria-label="Загрузка" className="card h-96 animate-pulse" />;
  if (state.kind === "error") {
    return (
      <section role="alert" className="card p-5">
        <p className="text-ink">Не удалось загрузить данные с устройства.</p>
        <button type="button" className={`${btnPrimary} mt-4`} onClick={() => setReload((n) => n + 1)}>
          Повторить
        </button>
      </section>
    );
  }

  const { tree } = state;
  const messages = treeMessages(tree);
  const next = tree.nextAt === null ? null : STAGES[tree.stage + 1];
  const title = `Дерево: ${tree.stageName}${tree.wilting ? ", отдыхает" : ""}`;

  return (
    <div className="-mx-5 -mt-6 md:mx-0 md:mt-0">
      {/* Full-bleed garden scene */}
      <section id="tree-card" aria-labelledby="stage-title" className="relative">
        <TreeScene stage={tree.stage} wilting={tree.wilting} title={title} className="h-[440px] md:rounded-card-lg" lift={28} />
        <div className="absolute inset-x-0 top-0 px-5 pt-6">
          <p className="eyebrow text-navy/70">Стадия {tree.stage + 1} из {STAGES.length}</p>
          <h1 id="stage-title" className="title mt-1 text-[36px] first-letter:uppercase">
            {tree.stageName}
          </h1>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[14px] font-semibold text-ink backdrop-blur">
            <DropIcon /> {tree.drops} {plural(tree.drops, ["капля", "капли", "капель"])}
          </p>
        </div>
      </section>

      {/* Bottom sheet */}
      <div className="relative -mt-9 space-y-7 rounded-t-sheet bg-bg px-5 pt-7 md:mt-4 md:rounded-sheet">
        <section aria-label="Рост">
          {next && tree.nextAt !== null ? (
            <>
              <div
                role="progressbar"
                aria-label={`До стадии «${next}»`}
                aria-valuemin={0}
                aria-valuemax={tree.nextAt}
                aria-valuenow={tree.drops}
                className="h-3 overflow-hidden rounded-full bg-soft"
              >
                <div className="h-full rounded-full bg-gradient-to-r from-leaf-light to-leaf transition-[width] duration-700" style={{ width: `${tree.progress * 100}%` }} />
              </div>
              <p className="mt-2 text-[15px] text-muted">
                До стадии «{next}»: {tree.drops} из {tree.nextAt}
              </p>
            </>
          ) : (
            <p className="text-[15px] font-semibold text-s-activity-ink">Дерево в полном цвету</p>
          )}
          <ol className="mt-4 flex items-center justify-between" aria-label="Стадии">
            {STAGES.map((name, i) => (
              <li key={name} className="flex flex-col items-center gap-1">
                <span
                  className={`grid size-9 place-items-center rounded-full text-[13px] font-bold ${
                    i < tree.stage ? "bg-leaf text-white" : i === tree.stage ? "bg-navy text-white ring-4 ring-soft" : "bg-soft text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`text-[12px] ${i === tree.stage ? "font-semibold text-ink" : "text-muted"}`}>{name}</span>
              </li>
            ))}
          </ol>
          {tree.wilting && (
            <Link href="/checkin/" className={`${btnPrimary} mt-5 w-full`}>
              Полить дерево — сделать чек-ин
            </Link>
          )}
        </section>

        <section aria-label="Сообщения" className="space-y-3">
          {messages.map((m) => (
            <p key={m.text} className="rounded-card bg-sand p-4 text-ink">
              {m.text}
              {m.source && (
                <a href={m.source.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex min-h-11 items-center text-[13px] text-sand-ink underline">
                  Источник: {m.source.name}
                  <span className="sr-only"> (откроется в новой вкладке)</span>
                </a>
              )}
            </p>
          ))}
        </section>

        <section aria-labelledby="week-title">
          <h2 id="week-title" className="eyebrow mb-3">
            Эта неделя
          </h2>
          <dl className="grid grid-cols-4 gap-2 text-center">
            {[
              ["Чек-ины", String(tree.week.checkins)],
              ["Тесты", String(tree.week.tests)],
              ["Фокус", String(tree.week.sessions)],
              ["Лучший", tree.week.best ? String(tree.week.best.score) : "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-card bg-surface px-1 py-3 shadow-soft">
                <dd className="stat text-[26px] text-ink">{v}</dd>
                <dt className="mt-1 text-[12px] text-muted">{k}</dt>
              </div>
            ))}
          </dl>
          {tree.week.best && <p className="mt-2 text-[13px] text-muted">Лучший Focus Score — {weekday(tree.week.best.date)}.</p>}
          <ShareWeek stageName={tree.stageName} activeDays={tree.week.checkins} />
        </section>

        <section aria-labelledby="how-title">
          <h2 id="how-title" className="eyebrow mb-3">
            Откуда капли
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-card-lg bg-surface shadow-soft">
            {[
              ["Чек-ин", "+1 в день", "bg-navy"],
              ["Тест реакции", "+1 в день", "bg-accent"],
              ["Фокус-сессия до конца", "+1 в день", "bg-night"],
              ["День «Эксперимента недели»", "+1 в день", "bg-leaf"],
            ].map(([k, v, c]) => (
              <li key={k} className="flex min-h-14 items-center gap-3 px-4">
                <span aria-hidden className={`size-2.5 rounded-full ${c}`} />
                <span className="flex-1 font-medium text-ink">{k}</span>
                <span className="text-[14px] font-semibold text-muted">{v}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-muted">Капли не пропадают. Один пропуск ничего не меняет.</p>
        </section>
      </div>
    </div>
  );
}
