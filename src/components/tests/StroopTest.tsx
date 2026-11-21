"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { STROOP_COLORS, brainHistory, nowMs, saveBrainTest, scoreStroop, stroopTrials, type StroopAnswer, type StroopColor, type StroopSummary, type StroopTrial } from "@/lib/brainTests";
import { cardHref } from "@/lib/libraryLinks";
import { tap } from "@/lib/haptics";
import { btnNight, btnNightGhost } from "@/components/ui/controls";
import { NightShell, Sparkline } from "./common";

type View = { kind: "intro" } | { kind: "run" } | { kind: "result"; s: StroopSummary | null; prev: number[] };

/** «Цвет и слово»: tap the INK colour, not the word (Stroop task, docs/sources.md). */
export function StroopTest() {
  const [view, setView] = useState<View>({ kind: "intro" });
  const [i, setI] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [trials, setTrials] = useState<StroopTrial[]>(() => stroopTrials());
  const answers = useRef<StroopAnswer[]>([]);
  const shownAt = useRef(0);

  useEffect(() => {
    if (view.kind !== "run") return;
    document.documentElement.dataset.immersive = "1";
    return () => {
      delete document.documentElement.dataset.immersive;
    };
  }, [view.kind]);

  useEffect(() => {
    if (view.kind === "run") shownAt.current = nowMs();
  }, [view.kind, i]);

  function start() {
    setTrials(stroopTrials());
    answers.current = [];
    setI(0);
    setView({ kind: "run" });
  }

  async function answer(c: StroopColor) {
    const trial = trials[i]!;
    answers.current.push({ trial, answer: c, rt: nowMs() - shownAt.current });
    const ok = c === trial.ink;
    setFlash(ok ? "ok" : "bad");
    tap("light");
    setTimeout(() => setFlash(null), 150);
    if (i + 1 < trials.length) return setI(i + 1);
    const s = scoreStroop(answers.current);
    const prev = (await brainHistory("stroop").catch(() => [])).map((r) => r.score);
    if (s) await saveBrainTest({ kind: "stroop", score: s.score, accuracy: s.accuracy, medianRt: s.medianRt, ...(s.interference !== null ? { interference: s.interference } : {}) }).catch(() => null);
    setView({ kind: "result", s, prev: s ? [...prev, s.score] : prev });
  }

  const close = (
    <Link href="/tests/" aria-label="Закрыть тест" className="pressable grid size-11 place-items-center rounded-full bg-white/10 text-night-ink">
      <X aria-hidden size={22} />
    </Link>
  );

  if (view.kind === "intro") {
    return (
      <NightShell>
        {close}
        <div className="stagger flex flex-1 flex-col items-center justify-center-safe gap-6 text-center">
          <p aria-hidden className="text-[44px] font-black tracking-tight" style={{ color: "#409CFF" }}>
            КРАСНЫЙ
          </p>
          <div>
            <h1 className="title text-[32px] text-night-ink">Цвет и слово</h1>
            <p className="mt-2 text-[17px] text-night-muted">
              Нажимайте <b className="text-night-ink">цвет букв</b>, а не то, что написано. Здесь правильно — «Синий». {trials.length} слов, около минуты.
            </p>
          </div>
          <ul className="w-full max-w-sm space-y-2 text-left text-[15px] text-night-ink">
            <li className="rounded-[18px] bg-white/6 px-4 py-3">Отвечайте быстро, но точно</li>
            <li className="rounded-[18px] bg-white/6 px-4 py-3">Если плохо различаете цвета, этот тест может быть неудобным</li>
          </ul>
        </div>
        <div className="space-y-3">
          <button type="button" className={`${btnNight} w-full`} onClick={start}>
            Начать
          </button>
          <p className="text-center text-[13px] text-night-muted">
            Классический тест Струпа на контроль внимания. Шкала наша, сравнивайте себя с собой.{" "}
            <a href={cardHref("stroop")} className="underline">
              Подробнее
            </a>
          </p>
        </div>
      </NightShell>
    );
  }

  if (view.kind === "run") {
    const t = trials[i]!;
    const word = STROOP_COLORS.find((c) => c.key === t.word)!;
    const ink = STROOP_COLORS.find((c) => c.key === t.ink)!;
    return (
      <NightShell>
        <div className="flex items-center justify-between">
          {close}
          <span className="text-[15px] text-night-muted tabular-nums" aria-live="off">
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

  const { s, prev } = view;
  return (
    <NightShell>
      {close}
      <div className="flex flex-1 flex-col items-center justify-center-safe gap-5 text-center" role="status">
        {s ? (
          <>
            <p className="text-[15px] text-night-muted">Результат</p>
            <p className="stat text-[72px] text-night-ink">{s.score}</p>
            <dl className="grid w-full max-w-sm grid-cols-3 gap-2">
              {[
                ["Точность", `${Math.round(s.accuracy * 100)}%`],
                ["Медиана", `${s.medianRt} мс`],
                ["Помеха", s.interference === null ? "—" : `${s.interference > 0 ? "+" : ""}${s.interference} мс`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-card bg-white/6 p-3">
                  <dt className="text-[12px] text-night-muted">{k}</dt>
                  <dd className="mt-0.5 text-[17px] font-semibold text-night-ink tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="max-w-sm text-[13px] text-night-muted">«Помеха» — насколько медленнее вы отвечаете, когда слово и цвет не совпадают. Меньше — лучше.</p>
            {prev.length >= 2 && <Sparkline values={prev} label="Ваши результаты «Цвет и слово»" />}
          </>
        ) : (
          <p className="text-[17px] text-night-ink">Слишком мало ответов для результата. Попробуйте ещё раз.</p>
        )}
      </div>
      <div className="grid gap-2">
        <button type="button" className={`${btnNight} w-full`} onClick={start}>
          Ещё раз
        </button>
        <Link href="/tests/" className={`${btnNightGhost} w-full`}>
          Все тесты
        </Link>
      </div>
    </NightShell>
  );
}
