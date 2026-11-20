"use client";

import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { isDemo } from "@/lib/demo";
import { btnSecondary } from "@/components/ui/controls";
import { renderPng, shareCardSvg, shareOrDownload } from "@/lib/shareCard";

/** Public address on the card; set NEXT_PUBLIC_APP_URL after deploy. */
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || window.location.host;

/** «Поделиться неделей»: builds a story image on the device and opens the share sheet. */
export function ShareWeek({ stageName, activeDays }: { stageName: string; activeDays: number }) {
  const [status, setStatus] = useState<"idle" | "busy" | "downloaded" | "error">("idle");
  // Demo data must not leave the app as an unlabelled image (CLAUDE.md §4).
  const [demo, setDemo] = useState<boolean | null>(null);
  useEffect(() => {
    isDemo().then(setDemo, () => setDemo(false));
  }, []);

  async function onShare() {
    const tree = document.querySelector("#tree-card svg[role=img]");
    if (!tree) return;
    setStatus("busy");
    try {
      const svg = shareCardSvg({ treeSvg: tree.outerHTML, stageName, activeDays, url: appUrl() });
      const result = await shareOrDownload(await renderPng(svg));
      setStatus(result === "downloaded" ? "downloaded" : "idle");
    } catch (e) {
      // Closing the share sheet is not an error.
      setStatus(e instanceof DOMException && e.name === "AbortError" ? "idle" : "error");
    }
  }

  if (demo !== false) return null;

  return (
    <div className="mt-4">
      <button type="button" onClick={onShare} disabled={status === "busy"} className={`${btnSecondary} w-full gap-2 disabled:opacity-50`}>
        <Share2 aria-hidden size={20} />
        Поделиться неделей
      </button>
      <p role="status" className="mt-2 text-sm text-muted">
        {status === "downloaded" && "Картинка сохранена — можно выложить в сторис."}
        {status === "error" && "Не получилось создать картинку. Попробуйте ещё раз."}
        {(status === "idle" || status === "busy") && "На картинке только дерево и число дней с чек-ином. Без заметок и оценок."}
      </p>
    </div>
  );
}
