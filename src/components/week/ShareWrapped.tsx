"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { renderPng, shareOrDownload } from "@/lib/shareCard";
import { wrappedCardSvg, type WrappedInput } from "@/lib/wrapped";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || window.location.host;

/** «Тип недели» + story card, built on the device; the user decides whether to share. */
export function ShareWrapped(props: Omit<WrappedInput, "url">) {
  const [status, setStatus] = useState<"idle" | "busy" | "downloaded" | "error">("idle");
  const { persona } = props;

  async function onShare() {
    setStatus("busy");
    try {
      const r = await shareOrDownload(await renderPng(wrappedCardSvg({ ...props, url: appUrl() })), "focusai-week.png", "Моя неделя в FocusAI");
      setStatus(r === "downloaded" ? "downloaded" : "idle");
    } catch (e) {
      setStatus(e instanceof DOMException && e.name === "AbortError" ? "idle" : "error");
    }
  }

  return (
    <section aria-labelledby="persona-h" className="rounded-card-lg bg-ink p-5 text-center text-white dark:bg-surface">
      <p className="text-[13px] font-semibold text-white/70 dark:text-muted">Ваш тип недели</p>
      <p aria-hidden className="mt-2 text-[64px] leading-none">
        {persona.emoji}
      </p>
      <h2 id="persona-h" className="mt-2 text-[28px] font-bold tracking-[-0.01em] text-white dark:text-ink">
        {persona.title}
      </h2>
      <p className="mt-1 text-[15px] text-white/80 dark:text-muted">Потому что {persona.why}</p>
      <button
        type="button"
        onClick={onShare}
        disabled={status === "busy"}
        className="pressable mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-ink disabled:opacity-50 dark:bg-accent dark:text-white"
      >
        <Share2 aria-hidden size={18} /> Поделиться в сторис
      </button>
      <p role="status" className="mt-2 text-[13px] text-white/70 empty:hidden dark:text-muted">
        {status === "downloaded" ? "Картинка сохранена." : status === "error" ? "Не получилось создать картинку." : ""}
      </p>
    </section>
  );
}
