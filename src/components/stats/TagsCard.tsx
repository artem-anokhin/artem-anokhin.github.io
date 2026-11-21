"use client";

import { useState } from "react";
import type { CheckIn } from "@/lib/db";
import { plural } from "@/lib/plural";
import { SPHERE_STYLE } from "@/lib/spheres";
import { tagCounts, type TagSphere } from "@/lib/tags";

const TABS: { key: TagSphere; label: string }[] = [
  { key: "rest", label: "Отдых" },
  { key: "activity", label: "Движение" },
  { key: "work", label: "Учёба" },
  { key: "mind", label: "Чувства" },
];
const TOP = 6;

/** «Чем наполнены ваши дни»: top check-in tags of the last 30 days, one sphere at a time. */
export function TagsCard({ rows }: { rows: CheckIn[] }) {
  const [tab, setTab] = useState<TagSphere>("rest");
  const counts = tagCounts(rows, tab).slice(0, TOP);
  const max = counts[0]?.count ?? 1;
  const color = SPHERE_STYLE[tab].base;

  return (
    <section
      aria-labelledby="st-tags"
      className="rounded-card-lg bg-surface p-4"
    >
      <h2 id="st-tags" className="text-[17px] font-semibold text-ink">
        Чем наполнены ваши дни
      </h2>
      <p className="text-[13px] text-muted">
        30 дней · отметки «что было сегодня» в чек-ине
      </p>
      <div
        role="tablist"
        aria-label="Сфера"
        className="mt-3 grid grid-cols-4 gap-1 rounded-[10px] bg-fill p-0.5"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-11 rounded-[8px] text-[13px] font-semibold ${tab === t.key ? "bg-surface text-ink shadow-sm" : "text-ink/80"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {counts.length === 0 ? (
        <p className="mt-4 text-[15px] text-muted">
          Пока пусто. Отмечайте в чек-ине, чем занимались, — здесь появится ваш
          топ.
        </p>
      ) : (
        <div
          role="tabpanel"
          aria-label={TABS.find((t) => t.key === tab)!.label}
        >
          <ul className="mt-4 space-y-2.5">
            {counts.map((c) => (
              <li
                key={c.label}
                className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1"
              >
                <span className="truncate text-[15px] text-ink">
                  <span aria-hidden>{c.emoji} </span>
                  {c.label}
                </span>
                <span className="text-[13px] text-muted tabular-nums">
                  {c.count} {plural(c.count, ["день", "дня", "дней"])}
                </span>
                <span
                  aria-hidden
                  className="col-span-2 h-2 rounded-full bg-fill"
                >
                  <span
                    className={`block h-2 rounded-full ${color}`}
                    style={{ width: `${Math.max(6, (c.count / max) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
