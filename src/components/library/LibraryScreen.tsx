"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Apple, ChevronDown, Coffee, Moon, Smartphone, Sparkles, type LucideIcon } from "lucide-react";
import { CARDS, type CardId, type KnowledgeCard, type Topic } from "@/lib/library";

/** Topic look: icon + sphere-like colors (docs/DESIGN.md). */
const TOPIC_STYLE: Record<Topic, { icon: LucideIcon; tint: string; ink: string; on: string }> = {
  Сон: { icon: Moon, tint: "bg-s-sleep-tint", ink: "text-s-sleep-ink", on: "bg-s-sleep-ink" },
  Кофеин: { icon: Coffee, tint: "bg-s-caffeine-tint", ink: "text-s-caffeine-ink", on: "bg-s-caffeine-ink" },
  "Питание и вода": { icon: Apple, tint: "bg-s-food-tint", ink: "text-s-food-ink", on: "bg-s-food-ink" },
  "Движение и стресс": { icon: Activity, tint: "bg-s-activity-tint", ink: "text-s-activity-ink", on: "bg-s-activity-ink" },
  "Перерывы и телефон": { icon: Smartphone, tint: "bg-s-rest-tint", ink: "text-s-rest-ink", on: "bg-s-rest-ink" },
  "Как работает FocusAI": { icon: Sparkles, tint: "bg-soft", ink: "text-navy", on: "bg-navy" },
};

const TOPICS: Topic[] = ["Сон", "Кофеин", "Питание и вода", "Движение и стресс", "Перерывы и телефон", "Как работает FocusAI"];

const chip = "pressable inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors";

function Card({ card, highlighted }: { card: KnowledgeCard; highlighted: boolean }) {
  const st = TOPIC_STYLE[card.topic];
  const Icon = st.icon;
  return (
    <details
      id={card.id}
      className={`group scroll-mt-6 rounded-card-lg bg-surface shadow-soft ${highlighted ? "outline-3 outline-offset-2 outline-accent" : ""}`}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-start gap-4 p-4 [&::-webkit-details-marker]:hidden">
        <span className={`grid size-12 shrink-0 place-items-center rounded-[16px] ${st.tint} ${st.ink}`}>
          <Icon aria-hidden size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] leading-snug font-semibold text-ink">{card.title}</span>
          <span className="mt-1 block text-[15px] text-muted">{card.summary}</span>
        </span>
        <ChevronDown aria-hidden size={22} className="mt-1 shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-5 pb-5 text-[16px] leading-relaxed text-ink">
        {card.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {card.tryThis && (
          <p className="rounded-[18px] bg-sand p-4">
            <span className="font-semibold text-sand-ink">Попробуйте: </span>
            {card.tryThis}
          </p>
        )}
        <p className="text-sm text-muted">Надёжность данных: {card.evidence}</p>
        <div>
          <p className="text-sm font-semibold text-ink">Источники</p>
          <ul>
            {card.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-muted underline">
                  {s.name}
                  <span className="sr-only"> (откроется в новой вкладке)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}

export function LibraryScreen() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [target, setTarget] = useState<CardId | null>(null);
  const [unknown, setUnknown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pending = useRef<CardId | null>(null);

  // Deep links: /library/#card-id opens, scrolls to and focuses the card.
  useEffect(() => {
    const open = () => {
      let id = "";
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        id = "\u0000"; // malformed percent-encoding → treated as unknown
      }
      if (!id) {
        setUnknown(false);
        return;
      }
      const card = CARDS.find((c) => c.id === id);
      setUnknown(!card);
      if (!card) return;
      pending.current = card.id;
      setTopic(null); // a filter must not hide the target
      setTarget(card.id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setTarget(null), 2000);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => {
      window.removeEventListener("hashchange", open);
      clearTimeout(timer.current);
    };
  }, []);

  // Runs after the list (without a filter) is committed, so the target element exists.
  useEffect(() => {
    const id = pending.current;
    if (!id || topic !== null) return;
    const el = document.getElementById(id) as HTMLDetailsElement | null;
    if (!el) return;
    pending.current = null;
    el.open = true;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el.querySelector("summary")?.focus({ preventScroll: true });
  }, [target, topic]);

  const shown = topic ? [topic] : TOPICS;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-[15px] text-muted">Короткие материалы с источниками. Чтобы открыть источник, нужен интернет.</p>
      {unknown && (
        <p role="status" className="text-sm text-muted">
          Такой карточки нет. Вот все материалы.
        </p>
      )}
      <div role="group" aria-label="Темы" className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {[null, ...TOPICS].map((t) => {
          const on = topic === t;
          const st = t ? TOPIC_STYLE[t] : null;
          const Icon = st?.icon;
          return (
            <button
              key={t ?? "all"}
              type="button"
              aria-pressed={on}
              onClick={() => setTopic(t)}
              className={`${chip} snap-start ${on ? `${st?.on ?? "bg-navy"} animate-pop text-white` : `${st?.tint ?? "bg-surface shadow-soft"} ${st?.ink ?? "text-navy"}`}`}
            >
              {Icon && <Icon aria-hidden size={16} />}
              {t ?? "Все"}
            </button>
          );
        })}
      </div>

      {shown.map((t) => {
        const cards = CARDS.filter((c) => c.topic === t);
        return (
          <section key={t} aria-labelledby={`topic-${t}`} className="space-y-3">
            <h2 id={`topic-${t}`} className="eyebrow">
              {t} · {cards.length}
            </h2>
            {cards.length === 0 ? (
              <p className="text-muted">В этой теме пока нет карточек.</p>
            ) : (
              cards.map((c) => <Card key={c.id} card={c} highlighted={target === c.id} />)
            )}
          </section>
        );
      })}
    </div>
  );
}
