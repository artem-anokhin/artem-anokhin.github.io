"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { tap } from "@/lib/haptics";
import { CUSTOM_MAX, MAX_CUSTOM, cleanCustom, type Tag } from "@/lib/tags";

/**
 * Multi-select chips «что было сегодня» + own tags. Chips are toggle buttons (aria-pressed).
 * Shows the first `fold` chips and «Ещё» for the rest, so the screen stays calm.
 */
export function TagPicker({
  legend,
  tags,
  kinds,
  custom,
  recent,
  onChange,
  activeClass,
  fold = 10,
  placeholder = "Своё: например, плавание с братом",
}: {
  legend: string;
  tags: readonly Tag[];
  kinds: string[];
  custom: string[];
  recent: string[];
  onChange: (next: { kinds: string[]; custom: string[] }) => void;
  activeClass: string;
  fold?: number;
  placeholder?: string;
}) {
  const [all, setAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const inputId = useId();

  // Selected tags always stay visible, even when folded.
  const shown = all ? tags : tags.filter((t, i) => i < fold || kinds.includes(t.id));
  const hidden = tags.length - shown.length;
  const customChips = [...custom, ...recent.filter((r) => !custom.some((c) => c.toLowerCase() === r.toLowerCase()))];

  const toggle = (id: string) => {
    tap();
    onChange({ kinds: kinds.includes(id) ? kinds.filter((k) => k !== id) : [...kinds, id], custom });
  };
  const toggleCustom = (c: string) => {
    tap();
    const on = custom.some((x) => x.toLowerCase() === c.toLowerCase());
    if (!on && custom.length >= MAX_CUSTOM) return;
    onChange({ kinds, custom: on ? custom.filter((x) => x.toLowerCase() !== c.toLowerCase()) : [...custom, c] });
  };
  const add = () => {
    const c = cleanCustom(text);
    setText("");
    setAdding(false);
    if (!c || custom.length >= MAX_CUSTOM) return;
    // An own tag equal to a built-in label just selects the built-in chip.
    const builtIn = tags.find((t) => t.label.toLowerCase() === c.toLowerCase());
    if (builtIn) {
      if (!kinds.includes(builtIn.id)) onChange({ kinds: [...kinds, builtIn.id], custom });
      return;
    }
    if (!custom.some((x) => x.toLowerCase() === c.toLowerCase())) onChange({ kinds, custom: [...custom, c] });
  };

  const chip = (on: boolean) =>
    `pressable inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[15px] font-medium transition-colors ${
      on ? `${activeClass} text-white` : "bg-surface text-ink ring-1 ring-line ring-inset active:bg-pressed"
    }`;

  return (
    <fieldset>
      <legend className="mb-2 text-[15px] font-semibold text-ink">
        {legend} <span className="font-normal text-muted">можно несколько</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {shown.map((t) => {
          const on = kinds.includes(t.id);
          return (
            <button key={t.id} type="button" aria-pressed={on} onClick={() => toggle(t.id)} className={chip(on)}>
              <span aria-hidden>{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
        {customChips.map((c) => {
          const on = custom.some((x) => x.toLowerCase() === c.toLowerCase());
          return (
            <button key={`c-${c}`} type="button" aria-pressed={on} onClick={() => toggleCustom(c)} className={chip(on)}>
              <span aria-hidden>✎</span>
              {c}
            </button>
          );
        })}
        {hidden > 0 && (
          <button type="button" onClick={() => setAll(true)} className="inline-flex min-h-11 items-center rounded-full px-3.5 text-[15px] font-semibold text-link">
            Ещё {hidden}
          </button>
        )}
        {!adding && custom.length < MAX_CUSTOM && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3.5 text-[15px] font-semibold text-link border border-dashed border-chevron">
            <Plus aria-hidden size={16} /> Своё
          </button>
        )}
      </div>
      {adding && (
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            Своё занятие
          </label>
          <input
            id={inputId}
            autoFocus
            value={text}
            maxLength={CUSTOM_MAX}
            enterKeyHint="done"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder={placeholder}
            className="h-11 min-w-0 flex-1 rounded-[12px] bg-surface px-3 text-[16px] text-ink ring-1 ring-line ring-inset placeholder:text-muted"
          />
          <button type="button" onClick={add} disabled={!text.trim()} className="inline-flex min-h-11 items-center rounded-[12px] bg-accent px-4 text-[15px] font-semibold text-white disabled:opacity-50">
            Добавить
          </button>
          <button type="button" aria-label="Отмена" onClick={() => setAdding(false)} className="grid size-11 place-items-center text-muted">
            <X aria-hidden size={18} />
          </button>
        </div>
      )}
    </fieldset>
  );
}
