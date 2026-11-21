"use client";

import { useEffect, useState } from "react";
import { Check, Flower2, Leaf, Lock, Moon, Sprout, Target, Timer, Zap, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { awards, type Award, type AwardIcon } from "@/lib/awards";
import { plural } from "@/lib/plural";

const ICON: Record<AwardIcon, LucideIcon> = { check: Check, timer: Timer, zap: Zap, sprout: Sprout, leaf: Leaf, moon: Moon, flower: Flower2, target: Target };

/** «Награды»: a grid of total-based milestones (no streaks, never lost). */
export function Awards({ stage }: { stage: number }) {
  const [list, setList] = useState<Award[] | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([db.checkins.toArray(), db.focusTests.toArray(), db.sessions.toArray(), db.habitLogs.toArray()])
      .then(([checkins, tests, sessions, habitLogs]) => alive && setList(awards({ checkins, tests, sessions, habitLogs, stage })))
      .catch(() => alive && setList(null));
    return () => {
      alive = false;
    };
  }, [stage]);

  if (!list) return null;
  const got = list.filter((a) => a.done).length;
  // Earned first, then the closest locked ones; the rest behind «Ещё».
  const locked = list.filter((a) => !a.done).sort((a, b) => b.have / b.need - a.have / a.need);
  const ordered = [...list.filter((a) => a.done), ...locked];
  const shown = all ? ordered : ordered.slice(0, got + 2);
  const hidden = ordered.length - shown.length;

  return (
    <section aria-labelledby="awards-title">
      <h2 id="awards-title" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
        Награды · {got} из {list.length}
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {shown.map((a) => {
          const Icon = a.done ? ICON[a.icon] : Lock;
          return (
            <li key={a.id} className="flex flex-col rounded-card-lg bg-surface p-4">
              <span
                aria-hidden
                className={`grid size-11 place-items-center rounded-full ${a.done ? "bg-leaf text-white" : "bg-fill text-chevron"}`}
              >
                <Icon size={22} strokeWidth={a.done ? 2.4 : 2} />
              </span>
              <p className={`mt-3 text-[15px] leading-tight font-semibold ${a.done ? "text-ink" : "text-muted"}`}>
                {a.title}
                <span className="sr-only">{a.done ? ". Получена." : `. Пока ${a.have} из ${a.need}.`}</span>
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">
                {a.hint}
              </p>
              {!a.done && a.need > 1 && (
                <div aria-hidden className="mt-auto flex items-center gap-2 pt-2">
                  <div className="h-1.5 flex-1 rounded-full bg-fill-strong">
                    <div className="h-full rounded-full bg-leaf" style={{ width: `${(a.have / a.need) * 100}%` }} />
                  </div>
                  <span className="text-[12px] text-muted tabular-nums">
                    {a.have}/{a.need}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <button type="button" onClick={() => setAll(true)} className="mt-1 flex min-h-11 items-center px-4 text-[15px] text-link">
          Ещё {hidden} {plural(hidden, ["награда", "награды", "наград"])}
        </button>
      )}
    </section>
  );
}
