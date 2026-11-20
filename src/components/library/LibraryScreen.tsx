"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CARDS, type CardId, type KnowledgeCard, type Topic } from "@/lib/library";

const TOPICS: Topic[] = ["Сон", "Кофеин", "Питание и вода", "Движение и стресс", "Перерывы и телефон", "Как работает FocusAI"];

const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors";

function Card({ card, highlighted }: { card: KnowledgeCard; highlighted: boolean }) {
  return (
    <details
      id={card.id}
      className={`card group scroll-mt-6 p-0 ${highlighted ? "outline-3 outline-offset-2 outline-accent" : ""}`}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block font-display text-lg font-extrabold text-navy">{card.title}</span>
          <span className="mt-1 block text-ink">{card.summary}</span>
        </span>
        <ChevronDown aria-hidden size={22} className="mt-1 shrink-0 text-navy transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-5 pb-5 text-ink">
        {card.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {card.tryThis && (
          <p className="rounded-2xl bg-soft p-4">
            <span className="font-semibold text-navy">Попробуйте: </span>
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
    <div className="mx-auto max-w-3xl space-y-5">
      <p className="text-muted">Короткие материалы с источниками. Чтобы открыть источник, нужен интернет.</p>
      {unknown && (
        <p role="status" className="text-sm text-muted">
          Такой карточки нет. Вот все материалы.
        </p>
      )}
      <div role="group" aria-label="Темы" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[null, ...TOPICS].map((t) => {
          const on = topic === t;
          return (
            <button
              key={t ?? "all"}
              type="button"
              aria-pressed={on}
              onClick={() => setTopic(t)}
              className={`${chip} ${on ? "border-navy bg-navy text-white" : "border-line bg-card text-navy hover:bg-soft"}`}
            >
              {t ?? "Все"}
            </button>
          );
        })}
      </div>

      {shown.map((t) => {
        const cards = CARDS.filter((c) => c.topic === t);
        return (
          <section key={t} aria-labelledby={`topic-${t}`} className="space-y-3">
            <h2 id={`topic-${t}`} className="font-display text-xl font-extrabold text-navy">
              {t} <span className="text-base font-semibold text-muted">· {cards.length}</span>
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
