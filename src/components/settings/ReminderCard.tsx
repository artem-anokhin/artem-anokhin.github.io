"use client";

import { BellRing, CalendarPlus } from "lucide-react";
import { useState } from "react";
import { btnSecondary } from "@/components/ui/controls";
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

  return (
    <section id="reminder" aria-labelledby="s-reminder" className="card scroll-mt-6 p-5">
      <div className="flex items-start gap-3">
        <BellRing aria-hidden className="mt-0.5 shrink-0 text-navy" size={24} />
        <div className="min-w-0 flex-1">
          <h2 id="s-reminder" className="font-display text-lg font-extrabold text-ink">
            Напоминание
          </h2>
          <p className="mt-1 text-sm text-muted">
            Ежедневное событие в вашем календаре. Привычке проще закрепиться, если делать её в одно и то же время.
          </p>
        </div>
      </div>
      <label className="mt-4 block font-semibold text-ink">
        Время
        <input
          type="time"
          lang="ru"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            setDone(false);
          }}
          className="mt-2 block min-h-12 w-40 rounded-2xl border-[1.5px] border-line bg-card px-4 font-display text-lg tabular-nums text-ink"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={ok ? googleCalendarUrl(time, appUrl()) : undefined}
          aria-disabled={!ok}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => ok && setDone(true)}
          className={`${btnSecondary} gap-2 ${ok ? "" : "pointer-events-none opacity-50"}`}
        >
          <CalendarPlus aria-hidden size={20} />
          Google Календарь
          <span className="sr-only"> (откроется в новой вкладке)</span>
        </a>
        <button type="button" disabled={!ok} onClick={downloadIcs} className={`${btnSecondary} disabled:opacity-50`}>
          Другой календарь (.ics)
        </button>
      </div>
      <p role="status" className="mt-2 text-sm text-muted">
        {done
          ? "Готово — проверьте, что событие появилось в календаре."
          : "Google Календарь получит только время, название и ссылку на приложение. Для iPhone выберите .ics."}
      </p>
    </section>
  );
}
