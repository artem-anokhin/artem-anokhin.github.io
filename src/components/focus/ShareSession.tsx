"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { renderPng, sessionCardSvg, shareOrDownload } from "@/lib/shareCard";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || window.location.host;

/** «Поделиться сессией»: night story image built on the device (minutes + optional task). */
export function ShareSession({ minutes, todayMinutes, task }: { minutes: number; todayMinutes: number; task?: string }) {
  const [withTask, setWithTask] = useState(true);
  const [status, setStatus] = useState<"idle" | "busy" | "downloaded" | "error">("idle");

  async function onShare() {
    const sprout = document.querySelector("#session-done svg[viewBox='0 0 120 130']");
    if (!sprout) return;
    setStatus("busy");
    try {
      const svg = sessionCardSvg({ sproutSvg: sprout.outerHTML, minutes, todayMinutes, task: withTask ? task : undefined, url: appUrl() });
      const r = await shareOrDownload(await renderPng(svg), "focusai-session.png", "Моя фокус-сессия");
      setStatus(r === "downloaded" ? "downloaded" : "idle");
    } catch (e) {
      setStatus(e instanceof DOMException && e.name === "AbortError" ? "idle" : "error");
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onShare}
        disabled={status === "busy"}
        className="pressable inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-link-night disabled:opacity-50"
      >
        <Share2 aria-hidden size={18} /> Поделиться в сторис
      </button>
      {task && (
        <label className="mt-1 flex min-h-11 cursor-pointer items-center justify-center gap-2 text-[13px] text-night-muted">
          <input type="checkbox" checked={withTask} onChange={(e) => setWithTask(e.target.checked)} className="size-4 accent-[#7EA2FF]" />
          Показать задачу на картинке
        </label>
      )}
      <p role="status" className="text-[13px] text-night-muted empty:hidden">
        {status === "downloaded" ? "Картинка сохранена." : status === "error" ? "Не получилось создать картинку." : ""}
      </p>
    </div>
  );
}
