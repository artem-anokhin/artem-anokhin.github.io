"use client";

import { Minus, Plus } from "lucide-react";
import type { Scale5 } from "@/lib/checkin";

export const btnPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-2xl bg-navy px-6 font-semibold text-white transition-colors hover:bg-deep disabled:cursor-not-allowed disabled:bg-soft disabled:text-muted";
export const btnSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-2xl border-[1.5px] border-line bg-card px-6 font-semibold text-navy transition-colors hover:bg-soft";

const optionBase =
  "flex min-h-12 items-center justify-center rounded-2xl border-[1.5px] px-3 text-center font-medium transition-colors";
const optionOn = "border-navy bg-navy text-white";
const optionOff = "border-line bg-card text-ink hover:bg-soft";

function Legend({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <legend className="mb-3 font-semibold text-ink">
      {children}
      {hint && <span className="ml-2 text-sm font-normal text-muted">{hint}</span>}
    </legend>
  );
}

/** Radio group rendered as big tappable cards. */
export function ChoiceField<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  columns = 1,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const cols = columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <fieldset>
      <Legend>{legend}</Legend>
      <div className={`grid gap-2 ${cols}`}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <label key={o.value} className={`${optionBase} cursor-pointer ${on ? optionOn : optionOff} has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2`}>
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={on}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {on && <span aria-hidden className="mr-1.5">✓</span>}
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
}: {
  legend: string;
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <ChoiceField
      legend={legend}
      name={name}
      columns={2}
      value={value ? "yes" : "no"}
      options={[
        { value: "yes", label: "Да" },
        { value: "no", label: "Нет" },
      ]}
      onChange={(v) => onChange(v === "yes")}
    />
  );
}

/** 1–5 scale with labelled ends. */
export function ScaleField({
  legend,
  name,
  value,
  onChange,
  low,
  high,
}: {
  legend: string;
  name: string;
  value: Scale5;
  onChange: (v: Scale5) => void;
  low: string;
  high: string;
}) {
  const steps: Scale5[] = [1, 2, 3, 4, 5];
  return (
    <fieldset>
      <Legend>{legend}</Legend>
      <div className="grid grid-cols-5 gap-2">
        {steps.map((n) => {
          const on = n === value;
          return (
            <label
              key={n}
              className={`${optionBase} cursor-pointer font-display text-lg font-extrabold ${on ? optionOn : optionOff} has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2`}
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
              {n}
            </label>
          );
        })}
      </div>
      <div aria-hidden className="mt-1.5 flex justify-between text-sm text-muted">
        <span>{low}</span>
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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  const shown = String(value).replace(".", ",");
  return (
    <div role="group" aria-label={label}>
      <p className="mb-3 font-semibold text-ink">{label}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={`${btnSecondary} size-12 px-0`}
          onClick={() => set(value - step)}
          disabled={value <= min}
          aria-label={`Уменьшить: ${label}`}
        >
          <Minus aria-hidden size={20} />
        </button>
        <output aria-live="polite" className="min-w-20 text-center font-display text-2xl font-extrabold text-navy">
          {shown}
          {unit && <span className="ml-1 font-sans text-sm font-medium text-muted">{unit}</span>}
        </output>
        <button
          type="button"
          className={`${btnSecondary} size-12 px-0`}
          onClick={() => set(value + step)}
          disabled={value >= max}
          aria-label={`Увеличить: ${label}`}
        >
          <Plus aria-hidden size={20} />
        </button>
      </div>
    </div>
  );
}

export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-semibold text-ink">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border-[1.5px] border-line bg-card px-4 text-lg text-ink"
      />
    </label>
  );
}
