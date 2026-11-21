"use client";

import { useEffect, useRef, useState } from "react";
import { STROOP_COLORS, nowMs, scoreStroop, stroopTrials, type StroopAnswer, type StroopColor, type StroopSummary, type StroopTrial } from "@/lib/brainTests";
import { tap } from "@/lib/haptics";
import { btnNight } from "@/components/ui/controls";
import { NightShell } from "@/components/tests/common";

export const WARMUP_TRIALS = 8;

/**
 * Onboarding warm-up: 8 «Цвет и слово» trials (~25 s). Nothing is stored here;
 * the result goes back to the parent and is saved only after consent.
 */
export function WarmUp({ onDone, onSkip }: { onDone: (s: StroopSummary | null) => void; onSkip: () => void }) {
  const [running, setRunning] = useState(false);
  const [i, setI] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [trials] = useState<StroopTrial[]>(() => stroopTrials(Math.random, WARMUP_TRIALS));
  const answers = useRef<StroopAnswer[]>([]);
  const shownAt = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    if (running) shownAt.current = nowMs();
  }, [running, i]);

  function answer(c: StroopColor) {
    if (busy.current) return;
    const trial = trials[i]!;
    answers.current.push({ trial, answer: c, rt: nowMs() - shownAt.current });
    setFlash(c === trial.ink ? "ok" : "bad");
    tap("light");
    setTimeout(() => setFlash(null), 150);
    if (i + 1 < trials.length) return setI(i + 1);
    busy.current = true;
    tap("success");
    onDone(scoreStroop(answers.current, WARMUP_TRIALS - 2));
  }

  if (!running) {
    return (
      <NightShell>
        <div className="flex min-h-11 items-center justify-end">
          <button type="button" onClick={onSkip} className="min-h-11 px-3 text-[15px] text-night-muted">
            Пропустить
          </button>
        </div>
        <div className="stagger flex flex-1 flex-col items-center justify-center-safe gap-6 text-center">
          <p aria-hidden className="text-[44px] font-black tracking-tight" style={{ color: "#409CFF" }}>
            КРАСНЫЙ
          </p>
          <div>
            <h1 className="title text-[32px] text-night-ink">Разминка: цвет и слово</h1>
            <p className="mt-2 text-[17px] text-night-muted">
              Нажимайте <b className="text-night-ink">цвет букв</b>, а не слово. Здесь правильно — «Синий». {WARMUP_TRIALS} слов, около 20 секунд.
            </p>
          </div>
        </div>
        <button type="button" className={`${btnNight} w-full`} onClick={() => setRunning(true)}>
          Я готов(а)
        </button>
      </NightShell>
    );
  }

  const t = trials[i]!;
  const word = STROOP_COLORS.find((c) => c.key === t.word)!;
  const ink = STROOP_COLORS.find((c) => c.key === t.ink)!;
  return (
    <NightShell>
      <div className="flex min-h-11 items-center justify-between">
        <span aria-hidden className="flex gap-1.5">
          {trials.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-white" : k < i ? "w-1.5 bg-white/60" : "w-1.5 bg-white/20"}`} />
          ))}
        </span>
        <span className="text-[15px] text-night-muted tabular-nums">
          {i + 1} / {trials.length}
        </span>
      </div>
      <div className={`flex flex-1 items-center justify-center rounded-card-lg transition-colors ${flash === "bad" ? "bg-red/15" : flash === "ok" ? "bg-white/4" : ""}`}>
        <p key={i} className="animate-pop text-[52px] font-black tracking-tight" style={{ color: ink.ink }} aria-label={`Слово ${word.label}, цвет букв — выберите`}>
          {word.word}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Цвет букв">
        {STROOP_COLORS.map((c) => (
          <button key={c.key} type="button" onClick={() => answer(c.key)} className="pressable flex min-h-16 items-center justify-center gap-2 rounded-card bg-white/10 text-[17px] font-semibold text-night-ink">
            <span aria-hidden className="size-4 rounded-full" style={{ background: c.ink }} />
            {c.label}
          </button>
        ))}
      </div>
    </NightShell>
  );
}
