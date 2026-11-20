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
            <stop offset="0" stopColor={night ? "#8FB0FF" : "#1E5BFF"} />
            <stop offset="1" stopColor={night ? "#5B8CFF" : "#0A2A9E"} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={night ? "rgba(255,255,255,.12)" : "#E7EEFF"} strokeWidth={stroke} />
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
            <span className={`text-[13px] ${d.today ? "font-bold text-navy" : "font-medium text-muted"}`}>{wd}</span>
            <span
              className={`grid size-9 place-items-center rounded-full text-[13px] font-semibold tabular-nums ${
                d.done ? "bg-leaf text-white" : d.today ? "border-2 border-navy text-navy" : "border border-dashed border-line text-muted"
              }`}
            >
              {d.done ? <Check aria-hidden size={18} strokeWidth={3} /> : dd}
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

/** Sky + sun + two hills + the tree. Day scene used on Today and Сад. */
export function TreeScene({
  stage,
  wilting,
  title,
  className = "",
  night = false,
}: {
  stage: number;
  wilting: boolean;
  title: string;
  className?: string;
  night?: boolean;
}) {
  const sky = useId();
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={night ? "#13215A" : "#CFE0FF"} />
            <stop offset="1" stopColor={night ? "#0B1640" : "#F3F7FF"} />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill={`url(#${sky})`} />
        {night ? (
          <>
            {[
              [40, 40], [90, 80], [160, 30], [250, 60], [320, 36], [360, 96], [210, 110], [60, 130],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 ? 1.4 : 2.2} fill="#EEF2FF" opacity={i % 2 ? 0.6 : 0.9} />
            ))}
            <circle cx="320" cy="70" r="22" fill="#EEF2FF" opacity=".9" />
            <circle cx="330" cy="62" r="20" fill="#13215A" />
          </>
        ) : (
          <>
            <circle cx="320" cy="70" r="34" fill="#FFC75A" opacity=".25" />
            <circle cx="320" cy="70" r="22" fill="#FFC75A" />
            <ellipse cx="90" cy="70" rx="38" ry="12" fill="#fff" opacity=".8" />
            <ellipse cx="116" cy="62" rx="24" ry="12" fill="#fff" opacity=".8" />
          </>
        )}
        <path d="M0 230 C 80 190, 160 200, 230 220 C 300 238, 350 205, 400 210 V300 H0 Z" fill={night ? "#1B2C6E" : "#B9E0B0"} />
        <path d="M0 262 C 90 238, 200 236, 290 252 C 340 260, 370 254, 400 248 V300 H0 Z" fill={night ? "#22357F" : "#83CF6E"} />
      </svg>
      <div className="relative flex h-full items-end justify-center">
        <div className="w-[62%] max-w-[260px] translate-y-[6%]">
          <TreeSvg stage={stage} wilting={wilting} title={title} />
        </div>
      </div>
    </div>
  );
}
