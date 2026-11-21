"use client";

import Link from "next/link";
import { Brain, Check, ClipboardCheck, Lightbulb, Timer } from "lucide-react";
import { cardHref } from "@/lib/libraryLinks";
import { START_DAYS, sessionFor, startPlan, type StartInfo } from "@/lib/start";

/** «Неделя старта · день N из 7»: three small tasks a day, tuned to the onboarding answers. */
export function StartWeek({ info, day, checkin, test, focus }: { info: StartInfo; day: number; checkin: boolean; test: boolean; focus: number }) {
  const minutes = sessionFor(info);
  const tasks = [
    { key: "checkin", href: "/checkin/", title: "Чек-ин дня", sub: "30 секунд", done: checkin, icon: <ClipboardCheck aria-hidden size={18} />, tint: "bg-accent" },
    { key: "test", href: "/tests/", title: "Разминка для ума", sub: "Тест реакции или мини-тест", done: test, icon: <Brain aria-hidden size={18} />, tint: "bg-orange" },
    { key: "focus", href: "/focus/", title: `Фокус ${minutes} минут`, sub: focus ? `Сегодня ${focus} мин` : "Одна сессия", done: focus >= minutes, icon: <Timer aria-hidden size={18} />, tint: "bg-s-sleep" },
  ];
  const done = tasks.filter((t) => t.done).length;
  const tip = startPlan(info)[0]!;

  return (
    <section aria-labelledby="start-h" className="rounded-card-lg bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <div>
          <h2 id="start-h" className="text-[20px] font-semibold text-ink">
            Неделя старта
          </h2>
          <p className="text-[15px] text-muted">
            День {day} из {START_DAYS} · {done === tasks.length ? "день выполнен" : `сделано ${done} из ${tasks.length}`}
          </p>
        </div>
        <span aria-hidden className="flex gap-1">
          {Array.from({ length: START_DAYS }, (_, i) => (
            <span key={i} className={`size-2 rounded-full ${i < day - 1 ? "bg-accent/45" : i === day - 1 ? "bg-accent" : "bg-fill-strong"}`} />
          ))}
        </span>
      </div>
      <ul className="mt-2">
        {tasks.map((t) => (
          <li key={t.key} className="border-t border-line first:border-t-0">
            <Link href={t.href} className="flex min-h-[56px] items-center gap-3 px-4 py-2 active:bg-pressed">
              <span className={`grid size-8 shrink-0 place-items-center rounded-[8px] text-white ${t.done ? "bg-leaf" : t.tint}`}>{t.done ? <Check aria-hidden size={18} strokeWidth={2.6} /> : t.icon}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[17px] ${t.done ? "text-muted line-through decoration-1" : "text-ink"}`}>{t.title}</span>
                <span className="block text-[13px] text-muted">{t.done ? "Готово" : t.sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 border-t border-line px-4 py-3 text-[15px] text-ink">
        <Lightbulb aria-hidden size={16} className="mt-0.5 shrink-0 text-orange" />
        <span>
          {day >= START_DAYS - 1 ? (
            <>
              {day === START_DAYS ? "Последний день старта. " : ""}Пройдите{" "}
              <Link href="/tests/stroop/" className="text-link underline underline-offset-2">
                «Цвет и слово»
              </Link>{" "}
              и сравните с точкой старта{info.score !== null ? ` (${info.score})` : ""}.
            </>
          ) : (
            <>
              {tip.title}.{" "}
              {tip.card && (
                <a href={cardHref(tip.card)} className="text-link underline underline-offset-2">
                  Почему
                </a>
              )}
            </>
          )}
        </span>
      </p>
    </section>
  );
}
