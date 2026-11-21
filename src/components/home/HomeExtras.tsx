"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, History } from "lucide-react";
import { CrisisCard } from "@/components/CrisisCard";
import { hasCrisisWording } from "@/lib/crisis";

/** «На этой неделе»: what the user marked most in check-ins (their own data coming back). */
export function WeekTop({ tags }: { tags: { label: string; emoji: string; count: number }[] }) {
  return (
    <Link href="/stats/" className="pressable flex items-center gap-3 rounded-card-lg bg-surface p-4 active:bg-pressed">
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-muted">На этой неделе чаще всего</span>
        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[17px] text-ink">
          {tags.map((t) => (
            <span key={`${t.emoji}${t.label}`} className="whitespace-nowrap">
              <span aria-hidden>{t.emoji} </span>
              {t.label} <span className="text-[15px] text-muted tabular-nums">×{t.count}</span>
            </span>
          ))}
        </span>
      </span>
      <ChevronRight aria-hidden size={18} className="shrink-0 text-chevron" />
    </Link>
  );
}

/** «Неделю назад вы записали…»: an old note, hidden until tapped (someone may be looking at the screen). */
export function Memory({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="Воспоминание" className="rounded-card-lg bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
        <History aria-hidden size={15} className="text-s-mind" /> {label} вы записали
      </p>
      {open ? (
        <>
          <p className="mt-1.5 text-[17px] break-words whitespace-pre-wrap text-ink">«{text}»</p>
          {hasCrisisWording(text) && (
            <div className="mt-3">
              <CrisisCard />
            </div>
          )}
        </>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="mt-1 inline-flex min-h-11 items-center text-[15px] font-semibold text-link">
          Показать запись
        </button>
      )}
    </section>
  );
}
