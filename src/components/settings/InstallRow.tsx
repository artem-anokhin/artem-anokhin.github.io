"use client";

import { Share, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** «Установить на экран Домой»: native prompt on Android/Chrome, short how-to on iPhone. Hidden when installed. */
export function InstallRow() {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // Deferred: the static HTML renders without this row; the client decides after hydration.
    queueMicrotask(() => {
      setInstalled(!!standalone);
      setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    });
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as PromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!prompt && !ios)) return null;

  async function onClick() {
    if (prompt) {
      await prompt.prompt().catch(() => {});
      setPrompt(null);
    } else setShowHow((v) => !v);
  }

  return (
    <section aria-labelledby="s-install">
      <h2 id="s-install" className="px-4 pb-1.5 text-[13px] text-muted uppercase">
        Приложение
      </h2>
      <div className="group-list">
        <button type="button" onClick={onClick} aria-expanded={prompt ? undefined : showHow} className="flex min-h-[50px] w-full items-center gap-3 px-4 py-2.5 text-left text-[17px] active:bg-pressed">
          <span className="grid size-[30px] shrink-0 place-items-center rounded-[7px] bg-ink text-surface">
            <Smartphone aria-hidden size={18} />
          </span>
          <span className="flex-1 text-ink">Установить на экран «Домой»</span>
        </button>
        {showHow && (
          <p className="flex items-start gap-2 px-4 py-3 text-[15px] text-ink">
            <Share aria-hidden size={18} className="mt-0.5 shrink-0 text-link" />
            <span>
              В Safari нажмите «Поделиться», затем «На экран «Домой»». FocusAI откроется как приложение, без адресной строки.
            </span>
          </p>
        )}
      </div>
      <p className="px-4 pt-1.5 text-[13px] leading-snug text-muted">Работает без интернета, данные остаются на устройстве.</p>
    </section>
  );
}
