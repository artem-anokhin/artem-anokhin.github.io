import Link from "next/link";

/** Segmented control «Инсайты | Библиотека» (both live under the Инсайты tab). */
export function InsightsTabs({ current }: { current: "insights" | "library" }) {
  const item = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`pressable flex min-h-11 flex-1 items-center justify-center rounded-full text-[15px] font-semibold transition-colors ${
        on ? "bg-surface text-navy shadow-soft" : "text-muted"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Раздел" className="flex gap-1 rounded-full bg-soft p-1">
      {item("/insights/", "Инсайты", current === "insights")}
      {item("/library/", "Библиотека", current === "library")}
    </nav>
  );
}
