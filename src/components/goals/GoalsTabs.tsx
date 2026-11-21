import Link from "next/link";

/** Segmented control between «Цели» and «Заметки» (same style as Insights/Library). */
export function GoalsTabs({ current }: { current: "goals" | "notes" }) {
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
    <nav aria-label="Раздел" className="mb-5 flex gap-0.5 rounded-[9px] bg-seg p-0.5">
      {item("/goals/", "Цели", current === "goals")}
      {item("/notes/", "Заметки", current === "notes")}
    </nav>
  );
}
