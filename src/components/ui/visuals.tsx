"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { TreeSvg } from "@/components/tree/TreeSvg";

/** SVG progress ring (docs/DESIGN.md §3). `value` 0–1. */
export function ProgressRing({
  value,
  size = 112,
  stroke = 12,
  night = false,
  color,
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  night?: boolean;
  /** Solid stroke color; default is the accent→navy gradient (or glow on night). */
  color?: string;
  children?: React.ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const id = useId();
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role={label ? "img" : undefined} aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={night ? "#6E95FF" : "#3D73FF"} />
            <stop offset="1" stopColor={night ? "#4D7DFF" : "#1E5BFF"} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={night ? "rgba(255,255,255,.14)" : "var(--color-fill)"} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ?? `url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

const WD = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

/** 7-day strip: done days are leaf circles with a check, today has a navy ring. */
export function WeekStrip({ days }: { days: { date: string; done: boolean; today: boolean }[] }) {
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="Последние 7 дней">
      {days.map((d) => {
        const [y, m, dd] = d.date.split("-").map(Number);
        const wd = WD[new Date(y!, m! - 1, dd!).getDay()];
        return (
          <li key={d.date} className="flex flex-col items-center gap-1.5">
            <span className={`text-[12px] ${d.today ? "font-semibold text-ink" : "font-medium text-muted"}`}>{wd}</span>
            <span
              className={`grid size-8 place-items-center rounded-full text-[13px] font-semibold tabular-nums ${
                d.done ? "bg-accent text-white" : d.today ? "text-link ring-2 ring-accent ring-inset" : "bg-fill text-muted"
              }`}
            >
              {d.done ? <Check aria-hidden size={15} strokeWidth={3} /> : dd}
            </span>
            <span className="sr-only">{d.done ? "активность была" : "без активности"}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Water drop glyph. */
export function DropIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M8 1.5 C 8 1.5 3 7 3 10.2 A 5 5 0 0 0 13 10.2 C 13 7 8 1.5 8 1.5 Z" fill="#3AA8F0" />
      <ellipse cx="6.3" cy="10" rx="1.2" ry="1.8" fill="#fff" opacity=".55" />
    </svg>
  );
}

/** Calm backdrop + the tree (Apple-clean: no sky, sun or hills). */
export function TreeScene({
  stage,
  wilting,
  title,
  className = "",
  night = false,
  lift = 0,
}: {
  stage: number;
  wilting: boolean;
  title: string;
  className?: string;
  night?: boolean;
  /** Extra space under the tree in px (e.g. when something overlaps the bottom). */
  lift?: number;
}) {
  return (
    <div className={`relative overflow-hidden ${night ? "bg-night-2" : "bg-gradient-to-b from-surface to-garden"} ${className}`}>
      <div className="relative flex h-full items-end justify-center" style={{ paddingBottom: lift + 8 }}>
        <div className="w-[52%] max-w-[220px]">
          <TreeSvg stage={stage} wilting={wilting} title={title} />
        </div>
      </div>
    </div>
  );
}
