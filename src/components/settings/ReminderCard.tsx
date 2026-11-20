"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { TimeField } from "@/components/ui/controls";
import { buildIcs, googleCalendarUrl, isTime } from "@/lib/reminder";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

/** Daily reminder via the user's own calendar — no server, no notifications permission. */
export function ReminderCard() {
  const [time, setTime] = useState("21:00");
  const [done, setDone] = useState(false);
  const ok = isTime(time);

  function downloadIcs() {
    const blob = new Blob([buildIcs(time, appUrl())], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "focusai-reminder.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setDone(true);
  }

  const row = "flex min-h-[50px] w-full items-center gap-3 px-4 py-2.5 text-left text-[17px] active:bg-pressed";
  return (
    <section id="reminder" aria-labelledby="s-reminder" className="scroll-mt-6">
      <h2 id="s-reminder" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
        Напоминание
      </h2>
      <div className="group-list">
        <div className="px-4 py-3">
          <TimeField label="Время чек-ина" value={time} onChange={(v) => { setTime(v); setDone(false); }} />
        </div>
        <a
          href={ok ? googleCalendarUrl(time, appUrl()) : undefined}
          aria-disabled={!ok}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => ok && setDone(true)}
          className={`${row} text-link ${ok ? "" : "pointer-events-none opacity-50"}`}
        >
          <CalendarPlus aria-hidden size={20} />
          Google Календарь
          <span className="sr-only"> (откроется в новой вкладке)</span>
        </a>
        <button type="button" disabled={!ok} onClick={downloadIcs} className={`${row} text-link disabled:opacity-50`}>
          <CalendarPlus aria-hidden size={20} />
          Другой календарь (.ics)
        </button>
      </div>
      <p role="status" className="px-4 pt-1.5 text-[13px] leading-snug text-muted">
        {done
          ? "Готово — проверьте, что событие появилось в календаре."
          : "Ежедневное событие в вашем календаре. Google получит только время, название и ссылку. Для iPhone выберите .ics."}
      </p>
    </section>
  );
}
