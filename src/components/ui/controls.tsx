"use client";

import { Minus, Plus } from "lucide-react";
import type { Scale5 } from "@/lib/checkin";
import type { SphereStyle } from "@/lib/spheres";

export const btnPrimary =
  "pressable inline-flex min-h-14 items-center justify-center gap-2 rounded-[18px] bg-navy px-6 text-[17px] font-semibold text-white shadow-lift transition-colors hover:bg-deep disabled:cursor-not-allowed disabled:bg-soft disabled:text-muted disabled:shadow-none";
export const btnSecondary =
  "pressable inline-flex min-h-14 items-center justify-center gap-2 rounded-[18px] bg-soft px-6 text-[17px] font-semibold text-navy transition-colors hover:bg-[#dbe5ff]";
/** Primary button on night (dark) surfaces. */
export const btnNight =
  "pressable inline-flex min-h-14 items-center justify-center gap-2 rounded-[18px] bg-white px-6 text-[17px] font-semibold text-navy shadow-glow transition-colors hover:bg-night-ink disabled:opacity-50";
export const btnNightGhost =
  "pressable inline-flex min-h-14 items-center justify-center gap-2 rounded-[18px] bg-white/10 px-6 text-[17px] font-semibold text-night-ink transition-colors hover:bg-white/15";

/** Default look when no sphere is given (onboarding, settings). */
const NEUTRAL: Pick<SphereStyle, "base" | "tint" | "ink"> = { base: "bg-navy", tint: "bg-surface", ink: "text-navy" };
type Theme = Pick<SphereStyle, "base" | "tint" | "ink">;

const focusRing = "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2";

function Legend({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <legend className="mb-3 text-[17px] font-semibold text-ink">
      {children}
      {hint && <span className="ml-2 text-sm font-normal text-muted">{hint}</span>}
    </legend>
  );
}

/** Radio group rendered as big tappable tiles. */
export function ChoiceField<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  columns = 1,
  theme = NEUTRAL,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
  theme?: Theme;
}) {
  const cols = columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <fieldset>
      <Legend>{legend}</Legend>
      <div className={`grid gap-2 ${cols}`}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <label
              key={o.value}
              className={`pressable flex min-h-14 cursor-pointer items-center justify-center rounded-[18px] px-3 text-center text-[15px] font-semibold shadow-soft transition-colors ${
                on ? `${theme.base} animate-pop text-white` : "bg-white text-ink hover:bg-white/80"
              } ${focusRing}`}
            >
              <input type="radio" name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} className="sr-only" />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function YesNoField({
  legend,
  name,
  value,
  onChange,
  theme,
}: {
  legend: string;
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
  theme?: Theme;
}) {
  return (
    <ChoiceField
      legend={legend}
      name={name}
      columns={2}
      theme={theme}
      value={value ? "yes" : "no"}
      options={[
        { value: "yes", label: "Да" },
        { value: "no", label: "Нет" },
      ]}
      onChange={(v) => onChange(v === "yes")}
    />
  );
}

/** Face glyph: curvature from sad (1) to happy (5). */
function Face({ n }: { n: Scale5 }) {
  const curve = (n - 3) * 5; // -10 … 10
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="11.5" cy="13" r="1.8" fill="currentColor" />
      <circle cx="20.5" cy="13" r="1.8" fill="currentColor" />
      <path d={`M10 ${21 - curve / 4} Q 16 ${21 + curve / 2} 22 ${21 - curve / 4}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Rising bars glyph for non-mood scales. */
function Bars({ n }: { n: Scale5 }) {
  return (
    <svg viewBox="0 0 30 24" width="30" height="24" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={i * 6.2} y={20 - i * 4.5} width="4.4" height={4 + i * 4.5} rx="2" fill="currentColor" opacity={i < n ? 1 : 0.22} />
      ))}
    </svg>
  );
}

/** 1–5 scale: glyph tiles, the chosen word shown below. */
export function ScaleField({
  legend,
  name,
  value,
  onChange,
  low,
  high,
  theme = NEUTRAL,
  glyph = "bars",
  words,
}: {
  legend: string;
  name: string;
  value: Scale5;
  onChange: (v: Scale5) => void;
  low: string;
  high: string;
  theme?: Theme;
  glyph?: "face" | "bars";
  /** Optional word for each value (index 0 = 1). */
  words?: readonly [string, string, string, string, string];
}) {
  const steps: Scale5[] = [1, 2, 3, 4, 5];
  const word = words?.[value - 1] ?? (value === 1 ? low : value === 5 ? high : "");
  return (
    <fieldset>
      <Legend>{legend}</Legend>
      <div className="grid grid-cols-5 gap-2">
        {steps.map((n) => {
          const on = n === value;
          return (
            <label
              key={n}
              className={`pressable flex h-16 cursor-pointer items-center justify-center rounded-[18px] shadow-soft transition-colors ${
                on ? `${theme.base} animate-pop text-white` : `bg-white ${theme.ink}`
              } ${focusRing}`}
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={on}
                onChange={() => onChange(n)}
                className="sr-only"
                aria-label={`${n} из 5${n === 1 ? ` — ${low}` : n === 5 ? ` — ${high}` : ""}`}
              />
              {glyph === "face" ? <Face n={n} /> : <Bars n={n} />}
            </label>
          );
        })}
      </div>
      <div aria-hidden className="mt-2 flex items-baseline justify-between text-[13px] text-muted">
        <span>{low}</span>
        <span className={`text-[15px] font-semibold ${theme.ink}`}>{word}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

/** [−] value [+] counter. */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit,
  theme = NEUTRAL,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
  step?: number;
  unit?: string;
  theme?: Theme;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  const shown = String(value).replace(".", ",");
  const btn = `pressable grid size-14 place-items-center rounded-full bg-white shadow-soft ${theme.ink} disabled:opacity-40`;
  return (
    <div role="group" aria-label={label}>
      <p className="mb-3 text-[17px] font-semibold text-ink">{label}</p>
      <div className="flex items-center justify-between rounded-[24px] bg-white/60 p-2">
        <button type="button" className={btn} onClick={() => set(value - step)} disabled={value <= min} aria-label={`Уменьшить: ${label}`}>
          <Minus aria-hidden size={22} />
        </button>
        <output aria-live="polite" className={`stat text-[40px] ${theme.ink}`}>
          {shown}
          {unit && <span className="ml-1.5 font-sans text-[15px] font-semibold tracking-normal text-muted">{unit}</span>}
        </output>
        <button type="button" className={btn} onClick={() => set(value + step)} disabled={value >= max} aria-label={`Увеличить: ${label}`}>
          <Plus aria-hidden size={22} />
        </button>
      </div>
    </div>
  );
}

export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-semibold text-ink">{label}</span>
      <input
        type="time"
        lang="ru"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="stat h-16 w-full min-w-0 rounded-[18px] bg-white px-3 text-[22px] text-ink shadow-soft"
      />
    </label>
  );
}
