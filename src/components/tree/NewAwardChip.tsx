"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Award } from "@/lib/awards";
import { unseenAwards } from "@/lib/awardsData";
import { AwardArt } from "./AwardArt";

/** «Новая награда!» chip after a session or check-in; tapping opens the Garden. */
export function NewAwardChip({ night = false }: { night?: boolean }) {
  const [list, setList] = useState<Award[]>([]);
  useEffect(() => {
    let alive = true;
    unseenAwards()
      .then((l) => alive && setList(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (list.length === 0) return null;
  const a = list[0]!;
  return (
    <Link
      href="/tree/"
      className={`pressable inline-flex min-h-12 animate-pop items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 text-left ${night ? "bg-white/10 text-night-ink" : "bg-surface text-ink"}`}
    >
      <AwardArt id={a.id} done secret={a.secret} size={40} />
      <span>
        <span className={`block text-[12px] ${night ? "text-night-muted" : "text-muted"}`}>Новая награда{list.length > 1 ? ` · ещё ${list.length - 1}` : ""}</span>
        <span className="block text-[15px] font-semibold">{a.title}</span>
      </span>
    </Link>
  );
}
