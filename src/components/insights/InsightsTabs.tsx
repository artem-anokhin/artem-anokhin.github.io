import Link from "next/link";

/** Segmented control «Инсайты | Библиотека» (both live under the Инсайты tab). */
export function InsightsTabs({ current }: { current: "insights" | "library" }) {
  const item = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`flex min-h-11 flex-1 items-center justify-center rounded-[8px] text-[15px] font-semibold transition-colors ${
        on ? "bg-seg-on text-ink shadow-[0_3px_8px_rgba(0,0,0,.12),0_3px_1px_rgba(0,0,0,.04)]" : "text-ink"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Раздел" className="flex gap-0.5 rounded-[9px] bg-seg p-0.5">
      {item("/insights/", "Инсайты", current === "insights")}
      {item("/library/", "Библиотека", current === "library")}
    </nav>
  );
}
