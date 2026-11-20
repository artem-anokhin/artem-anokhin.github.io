"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db, dayKey } from "@/lib/db";
import { getExperiment, getExperimentHistory } from "@/lib/settings";
import { STAGES, treeMessages, treeState, type TreeState } from "@/lib/tree";
import { btnPrimary } from "@/components/ui/controls";
import { TreeSvg } from "./TreeSvg";
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
    Promise.all([db.checkins.toArray(), db.focusTests.toArray(), getExperiment(), getExperimentHistory()])
      .then(([checkins, tests, experiment, pastExperiments]) => {
        if (!alive) return;
        const tree = treeState({
          checkinDates: checkins.map((c) => c.date),
          tests,
          experiment,
          pastExperiments,
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
    <div className="mx-auto max-w-5xl gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
      <section id="tree-card" className="card rounded-card-lg p-5 text-center md:p-6" aria-labelledby="stage-title">
        <TreeSvg stage={tree.stage} wilting={tree.wilting} title={title} />
        <h2 id="stage-title" className="mt-3 font-display text-2xl font-extrabold text-navy first-letter:uppercase">
          {tree.stageName}
        </h2>
        <p className="text-muted">
          Капель: <span className="font-semibold text-ink">{tree.drops}</span>
        </p>
        {next && tree.nextAt !== null ? (
          <div className="mt-4 text-left">
            <div
              role="progressbar"
              aria-label={`До стадии «${next}»`}
              aria-valuemin={0}
              aria-valuemax={tree.nextAt}
              aria-valuenow={tree.drops}
              className="h-2 overflow-hidden rounded-full bg-soft"
            >
              <div className="h-full bg-leaf" style={{ width: `${tree.progress * 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">
              До стадии «{next}»: {tree.drops} из {tree.nextAt}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Дерево в полном цвету.</p>
        )}
        {tree.wilting && (
          <Link href="/" className={`${btnPrimary} mt-4 w-full`}>
            Сделать чек-ин
          </Link>
        )}
      </section>

      <div className="space-y-4">
        {messages.map((m) => (
          <p key={m.text} className="card p-5 text-ink">
            {m.text}
            {m.source && (
              <a href={m.source.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex min-h-11 items-center text-sm text-muted underline">
                Источник: {m.source.name}
                <span className="sr-only"> (откроется в новой вкладке)</span>
              </a>
            )}
          </p>
        ))}

        <section className="card p-5" aria-labelledby="week-title">
          <h2 id="week-title" className="font-display text-lg font-extrabold text-navy">
            Эта неделя
          </h2>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            {[
              ["Чек-инов", String(tree.week.checkins)],
              ["Тестов", String(tree.week.tests)],
              ["Лучший Focus Score", tree.week.best ? `${tree.week.best.score} (${weekday(tree.week.best.date)})` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-soft p-3">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="font-display text-lg font-extrabold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <ShareWeek stageName={tree.stageName} activeDays={tree.week.checkins} />
        </section>

        <section className="card p-5" aria-labelledby="how-title">
          <h2 id="how-title" className="font-display text-lg font-extrabold text-navy">
            Как растёт дерево
          </h2>
          <ul className="mt-2 space-y-1 text-ink">
            <li>+1 капля за чек-ин</li>
            <li>+1 капля за тест фокуса</li>
            <li>+1 капля за день «Эксперимента недели»</li>
          </ul>
          <p className="mt-2 text-sm text-muted">Капли не пропадают. Один пропуск ничего не меняет.</p>
        </section>
      </div>
    </div>
  );
}
