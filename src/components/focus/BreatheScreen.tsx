"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { tap } from "@/lib/haptics";
import { plural } from "@/lib/plural";
import { btnNight, btnNightGhost } from "@/components/ui/controls";

/** Slow breathing, about 6 breaths a minute: 4 s in, 6 s out (Zaccaro 2018, docs/sources.md). */
export const INHALE_MS = 4000;
export const EXHALE_MS = 6000;
const CYCLE = INHALE_MS + EXHALE_MS;
const LENGTHS = [1, 3, 5] as const;

type View = { kind: "intro" } | { kind: "run"; startedAt: number; minutes: number } | { kind: "done"; minutes: number };

/** Phase at `elapsed` ms: which half of the cycle and how many breaths are done. */
export function breathPhase(elapsed: number): { inhale: boolean; breaths: number } {
  const t = Math.max(0, elapsed);
  return { inhale: t % CYCLE < INHALE_MS, breaths: Math.floor(t / CYCLE) };
}

/** «Дыхание»: a 1–5 minute calm-down before studying or a test (night surface). */
export function BreatheScreen() {
  const [view, setView] = useState<View>({ kind: "intro" });
  const [minutes, setMinutes] = useState<number>(1);
  const [now, setNow] = useState(() => Date.now());

  const running = view.kind === "run";
  useEffect(() => {
    if (!running) return;
    document.documentElement.dataset.immersive = "1";
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => {
      clearInterval(id);
      delete document.documentElement.dataset.immersive;
    };
  }, [running]);

  const elapsed = view.kind === "run" ? now - view.startedAt : 0;
  const phase = breathPhase(elapsed);
  const total = view.kind === "run" ? view.minutes * 60_000 : 0;

  // Soft haptic tick on each phase change.
  useEffect(() => {
    if (running) tap("light");
  }, [running, phase.inhale]);

  // Finish after the last full exhale.
  useEffect(() => {
    if (view.kind !== "run") return;
    const id = setTimeout(() => {
      tap("success");
      setView({ kind: "done", minutes: view.minutes });
    }, Math.max(0, view.startedAt + total - Date.now()));
    return () => clearTimeout(id);
  }, [view, total]);

  const close = (
    <Link href="/focus/" aria-label="Закрыть дыхание" className="pressable grid size-11 place-items-center rounded-full bg-white/10 text-night-ink">
      <X aria-hidden size={22} />
    </Link>
  );

  return (
    <div className="night min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(20px+env(safe-area-inset-bottom))]">
        {close}

        {view.kind === "intro" && (
          <>
            <div className="stagger flex flex-1 flex-col items-center justify-center-safe gap-6 text-center">
              <Orb inhale={false} />
              <div>
                <h1 className="title text-[32px] text-night-ink">Дыхание</h1>
                <p className="mt-2 text-[17px] text-night-muted">
                  Вдох 4 секунды, долгий выдох 6 секунд. Хорошо перед учёбой, тестом или сном.
                </p>
              </div>
              <fieldset className="w-full max-w-sm">
                <legend className="sr-only">Длительность</legend>
                <div className="grid grid-cols-3 gap-1 rounded-full bg-night-2 p-1">
                  {LENGTHS.map((m) => {
                    const on = m === minutes;
                    return (
                      <label
                        key={m}
                        className={`pressable flex min-h-12 cursor-pointer items-center justify-center rounded-full text-[17px] font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-glow ${
                          on ? "bg-white text-accent" : "text-night-ink/85"
                        }`}
                      >
                        <input type="radio" name="blen" value={m} checked={on} onChange={() => setMinutes(m)} className="sr-only" />
                        {m} мин
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                className={`${btnNight} w-full`}
                onClick={() => {
                  const t = Date.now();
                  setNow(t);
                  setView({ kind: "run", startedAt: t, minutes });
                }}
              >
                Начать
              </button>
              <p className="text-center text-[13px] text-night-muted">
                Медленное дыхание связано с более спокойным состоянием.{" "}
                <a href="https://www.frontiersin.org/articles/10.3389/fnhum.2018.00353/full" target="_blank" rel="noopener noreferrer" className="underline">
                  Обзор исследований
                  <span className="sr-only"> (откроется в новой вкладке)</span>
                </a>
                . Не является медицинской консультацией.
              </p>
            </div>
          </>
        )}

        {view.kind === "run" && (
          <div className="flex flex-1 flex-col items-center justify-center-safe gap-10 text-center">
            <Orb inhale={phase.inhale} animate />
            <p className="title text-[32px] text-night-ink" aria-live="polite">
              {phase.inhale ? "Вдох" : "Выдох"}
            </p>
            <p className="text-[15px] text-night-muted tabular-nums">
              Осталось {Math.max(0, Math.ceil((total - elapsed) / 1000))} с
            </p>
            <button type="button" className={btnNightGhost} onClick={() => setView({ kind: "intro" })}>
              Остановить
            </button>
          </div>
        )}

        {view.kind === "done" && (
          <div className="flex flex-1 flex-col items-center justify-center-safe gap-6 text-center" role="status">
            <Orb inhale={false} />
            <h1 className="title text-[30px] text-night-ink">
              {view.minutes} {plural(view.minutes, ["минута", "минуты", "минут"])} спокойного дыхания
            </h1>
            <p className="text-[17px] text-night-muted">Заметьте, как вы себя чувствуете. Теперь можно браться за дело.</p>
            <div className="grid w-full max-w-sm gap-2">
              <Link href="/focus/" className={`${btnNight} w-full`}>
                К фокус-сессии
              </Link>
              <Link href="/" className={`${btnNightGhost} w-full`}>
                На главную
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** The breathing circle: grows over the inhale, shrinks over the exhale. */
function Orb({ inhale, animate = false }: { inhale: boolean; animate?: boolean }) {
  return (
    <span aria-hidden className="relative grid size-64 place-items-center">
      <span
        className="absolute inset-0 rounded-full bg-accent/20"
        style={{
          transform: `scale(${inhale ? 1 : 0.62})`,
          transition: animate ? `transform ${inhale ? INHALE_MS : EXHALE_MS}ms cubic-bezier(0.45, 0, 0.55, 1)` : undefined,
        }}
      />
      <span
        className="absolute inset-10 rounded-full bg-accent/45"
        style={{
          transform: `scale(${inhale ? 1 : 0.7})`,
          transition: animate ? `transform ${inhale ? INHALE_MS : EXHALE_MS}ms cubic-bezier(0.45, 0, 0.55, 1)` : undefined,
        }}
      />
      <span className="size-20 rounded-full bg-accent" />
    </span>
  );
}
