"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STAGES, treeMessages, type TreeState } from "@/lib/tree";
import { loadTree } from "@/lib/garden";
import { Bean, Flower2, Leaf, Sprout, TreeDeciduous, type LucideIcon } from "lucide-react";

const STAGE_ICONS: LucideIcon[] = [Bean, Sprout, Leaf, TreeDeciduous, Flower2];
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
    loadTree()
      .then((tree) => {
        if (alive) setState({ kind: "ready", tree });
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
    <div className="space-y-6">
      <header className="pt-2">
        <p className="text-[15px] font-medium text-muted first-letter:uppercase">Стадия {tree.stage + 1} из {STAGES.length}</p>
        <h1 id="stage-title" className="title text-[34px] first-letter:uppercase">
          {tree.stageName}
        </h1>
      </header>

      <section id="tree-card" aria-labelledby="stage-title" className="relative overflow-hidden rounded-card-lg bg-surface">
        <TreeScene stage={tree.stage} wilting={tree.wilting} title={title} className="h-72" />
        <p className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1 text-[13px] font-semibold text-ink">
          <DropIcon /> {tree.drops} {plural(tree.drops, ["капля", "капли", "капель"])}
        </p>
      </section>

      <div className="space-y-6">
        <section aria-label="Рост" className="rounded-card-lg bg-surface p-4">
          {next && tree.nextAt !== null ? (
            <>
              <div
                role="progressbar"
                aria-label={`До стадии «${next}»`}
                aria-valuemin={0}
                aria-valuemax={tree.nextAt}
                aria-valuenow={tree.drops}
                className="h-2 overflow-hidden rounded-full bg-fill"
              >
                <div className="h-full rounded-full bg-leaf transition-[width] duration-700" style={{ width: `${tree.progress * 100}%` }} />
              </div>
              <p className="mt-2 text-[15px] text-muted">
                До стадии «{next}»: {tree.drops} из {tree.nextAt}
              </p>
            </>
          ) : (
            <p className="text-[15px] font-semibold text-ink">Дерево в полном цвету</p>
          )}
          <ol className="mt-4 flex items-center justify-between" aria-label="Стадии">
            {STAGES.map((name, i) => (
              <li key={name} className="flex flex-col items-center gap-1">
                <span
                  className={`grid size-10 place-items-center rounded-full ${
                    i < tree.stage ? "bg-leaf text-white" : i === tree.stage ? "bg-accent text-white" : "bg-fill text-muted"
                  }`}
                >
                  {(() => {
                    const Icon = STAGE_ICONS[i]!;
                    return <Icon aria-hidden size={20} />;
                  })()}
                </span>
                <span className={`text-[13px] ${i === tree.stage ? "font-semibold text-ink" : "text-muted"}`}>{name}</span>
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
            <p key={m.text} className="rounded-card-lg bg-surface p-4 text-[15px] text-ink">
              {m.text}
              {m.source && (
                <a href={m.source.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex min-h-11 items-center text-[13px] text-muted underline">
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
          <dl className="grid grid-cols-4 divide-x divide-line rounded-card-lg bg-surface py-4 text-center">
            {[
              ["Чек-ины", String(tree.week.checkins)],
              ["Тесты", String(tree.week.tests)],
              ["Фокус", String(tree.week.sessions)],
              ["Лучший", tree.week.best ? String(tree.week.best.score) : "—"],
            ].map(([k, v]) => (
              <div key={k} className="px-1">
                <dd className="stat text-[26px] text-ink">{v}</dd>
                <dt className="mt-1 text-[13px] text-muted">{k}</dt>
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
          <ul className="group-list">
            {[
              ["Чек-ин", "+1 в день", "bg-navy"],
              ["Тест реакции", "+1 в день", "bg-accent"],
              ["Фокус-сессия до конца", "+1 в день", "bg-s-sleep"],
              ["Хотя бы одна привычка", "+1 в день", "bg-s-activity"],
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
