"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { AWARDS_SEEN_KEY, type Award } from "@/lib/awards";
import { loadAwards } from "@/lib/awardsData";
import { plural } from "@/lib/plural";
import { tap } from "@/lib/haptics";
import { getProfile } from "@/lib/settings";
import { AwardArt } from "./AwardArt";

/** «Награды»: illustrated milestones (no streaks, never lost) + secret ones shown as «???» until earned. */
export function Awards({ stage }: { stage: number }) {
  const [list, setList] = useState<Award[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [all, setAll] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [l, seenRow] = await Promise.all([loadAwards(db, stage), db.settings.get(AWARDS_SEEN_KEY)]);
      const seen = new Set(Array.isArray(seenRow?.value) ? (seenRow.value as unknown[]).filter((x): x is string => typeof x === "string") : []);
      const earned = l.filter((a) => a.done).map((a) => a.id);
      // First visit with many earned awards (existing users): mark them seen quietly.
      const quiet = !seenRow && earned.length > 3;
      const newOnes = new Set<string>(quiet ? [] : earned.filter((id) => !seen.has(id)));
      if (!alive) return;
      setList(l);
      setFresh(newOnes);
      if ((newOnes.size > 0 || quiet) && (await getProfile())) {
        if (newOnes.size > 0) tap("success");
        await db.settings.put({ key: AWARDS_SEEN_KEY, value: earned });
      }
    })().catch(() => alive && setList(null));
    return () => {
      alive = false;
    };
  }, [stage]);

  if (!list) return null;
  const got = list.filter((a) => a.done).length;
  // New first, then earned, then the closest locked ones; secrets last; the rest behind «Ещё».
  const score = (a: Award) => (fresh.has(a.id) ? 3 : a.done ? 2 : a.secret ? 0 : 1 + a.have / a.need / 2);
  const ordered = [...list].sort((a, b) => score(b) - score(a));
  const shown = all ? ordered : ordered.slice(0, got + 2);
  const hidden = ordered.length - shown.length;

  return (
    <section aria-labelledby="awards-title">
      <h2 id="awards-title" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
        Награды · {got} из {list.length}
      </h2>
      <ul className="group-list">
        {shown.map((a) => {
          const masked = a.secret && !a.done;
          const isNew = fresh.has(a.id);
          return (
            <li key={a.id} className="flex min-h-[68px] items-center gap-3 px-4 py-2.5">
              <span className={`shrink-0 ${isNew ? "animate-pop" : ""}`}>
                <AwardArt id={a.id} done={a.done} secret={a.secret} size={48} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`flex flex-wrap items-center gap-x-2 text-[17px] ${a.done ? "text-ink" : "text-muted"}`}>
                  {masked ? "Секретная награда" : a.title}
                  {isNew && <span className="rounded-full bg-s-activity-ink px-2 py-0.5 text-[11px] font-semibold text-white">Новая</span>}
                  <span className="sr-only">{a.done ? ". Получена." : masked ? ". Пока скрыта." : `. Пока ${a.have} из ${a.need}.`}</span>
                </span>
                <span className="block text-[13px] text-muted">{masked ? "Откроется сама. Попробуйте разное время и длину сессий" : a.hint}</span>
                {!a.done && !a.secret && a.need > 1 && (
                  <span aria-hidden className="mt-1.5 block h-1.5 rounded-full bg-fill-strong">
                    <span className="block h-full rounded-full bg-leaf" style={{ width: `${(a.have / a.need) * 100}%` }} />
                  </span>
                )}
              </span>
              {!a.done && !a.secret && a.need > 1 && (
                <span aria-hidden className="text-[13px] text-muted tabular-nums">
                  {a.have}/{a.need}
                </span>
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
