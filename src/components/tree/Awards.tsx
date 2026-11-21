"use client";

import { useEffect, useState } from "react";
import { Check, Flower2, Leaf, Lock, Moon, Sprout, Target, Timer, Zap, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { awards, type Award, type AwardIcon } from "@/lib/awards";

const ICON: Record<AwardIcon, LucideIcon> = { check: Check, timer: Timer, zap: Zap, sprout: Sprout, leaf: Leaf, moon: Moon, flower: Flower2, target: Target };

/** «Награды»: a grid of total-based milestones (no streaks, never lost). */
export function Awards({ stage }: { stage: number }) {
  const [list, setList] = useState<Award[] | null>(null);

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

  return (
    <section aria-labelledby="awards-title">
      <h2 id="awards-title" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
        Награды · {got} из {list.length}
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {list.map((a) => {
          const Icon = a.done ? ICON[a.icon] : Lock;
          return (
            <li key={a.id} className="rounded-card-lg bg-surface p-4" aria-label={`${a.title}: ${a.done ? "получена" : `${a.have} из ${a.need}`}. ${a.hint}`}>
              <span
                aria-hidden
                className={`grid size-11 place-items-center rounded-full ${a.done ? "bg-leaf text-white" : "bg-fill text-chevron"}`}
              >
                <Icon size={22} strokeWidth={a.done ? 2.4 : 2} />
              </span>
              <p aria-hidden className={`mt-3 text-[15px] leading-tight font-semibold ${a.done ? "text-ink" : "text-muted"}`}>
                {a.title}
              </p>
              <p aria-hidden className="mt-0.5 text-[13px] leading-snug text-muted">
                {a.hint}
              </p>
              {!a.done && a.need > 1 && (
                <div aria-hidden className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-fill">
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
    </section>
  );
}
