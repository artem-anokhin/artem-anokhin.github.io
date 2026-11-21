"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { SPAN_START, SPAN_TILES, brainHistory, saveBrainTest, spanSequence, spanStep } from "@/lib/brainTests";
import { cardHref } from "@/lib/libraryLinks";
import { tap } from "@/lib/haptics";
import { btnNight, btnNightGhost } from "@/components/ui/controls";
import { NightShell, Sparkline } from "./common";

type Phase = "intro" | "show" | "input" | "result";
const FLASH_MS = 650;
const GAP_MS = 250;

/** «Запомни порядок»: watch the tiles light up, then tap them in the same order (Corsi-like span). */
export function SpanTest() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [lit, setLit] = useState<number | null>(null);
  const [level, setLevel] = useState({ length: SPAN_START, misses: 0, best: 0, done: false });
  const [seq, setSeq] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [prev, setPrev] = useState<number[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const on = phase === "show" || phase === "input";
    if (!on) return;
    document.documentElement.dataset.immersive = "1";
    return () => {
      delete document.documentElement.dataset.immersive;
    };
  }, [phase]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function play(length: number) {
    const s = spanSequence(length);
    setSeq(s);
    setPos(0);
    setWrong(null);
    setPhase("show");
    timers.current.forEach(clearTimeout);
    timers.current = [];
    s.forEach((tile, k) => {
      const t0 = 600 + k * (FLASH_MS + GAP_MS);
      timers.current.push(setTimeout(() => setLit(tile), t0));
      timers.current.push(setTimeout(() => setLit(null), t0 + FLASH_MS));
    });
    timers.current.push(setTimeout(() => setPhase("input"), 600 + s.length * (FLASH_MS + GAP_MS)));
  }

  function start() {
    const st = { length: SPAN_START, misses: 0, best: 0, done: false };
    setLevel(st);
    play(st.length);
  }

  async function finish(best: number) {
    setPhase("result");
    const history = (await brainHistory("span").catch(() => [])).map((r) => r.score);
    if (best > 0) await saveBrainTest({ kind: "span", score: best }).catch(() => null);
    setPrev(best > 0 ? [...history, best] : history);
  }

  function press(tile: number) {
    if (phase !== "input") return;
    if (tile !== seq[pos]) {
      setWrong(tile);
      tap("success");
      const next = spanStep(level, false);
      setLevel(next);
      timers.current.push(setTimeout(() => (next.done ? finish(next.best) : play(next.length)), 700));
      setPhase("show");
      return;
    }
    tap("light");
    if (pos + 1 < seq.length) return setPos(pos + 1);
    const next = spanStep(level, true);
    setLevel(next);
    if (next.done) return void finish(next.best);
    setPhase("show");
    timers.current.push(setTimeout(() => play(next.length), 500));
  }

  const close = (
    <Link href="/tests/" aria-label="Закрыть тест" className="pressable grid size-11 place-items-center rounded-full bg-white/10 text-night-ink">
      <X aria-hidden size={22} />
    </Link>
  );

  if (phase === "intro") {
    return (
      <NightShell>
        {close}
        <div className="stagger flex flex-1 flex-col items-center justify-center-safe gap-6 text-center">
          <div aria-hidden className="grid w-40 grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, k) => (
              <span key={k} className={`aspect-square rounded-[10px] ${k === 2 || k === 4 || k === 6 ? "bg-accent" : "bg-white/12"}`} />
            ))}
          </div>
          <div>
            <h1 className="title text-[32px] text-night-ink">Запомни порядок</h1>
            <p className="mt-2 text-[17px] text-night-muted">Квадраты загораются по очереди. Повторите тот же порядок. С каждым разом — на один длиннее.</p>
          </div>
        </div>
        <div className="space-y-3">
          <button type="button" className={`${btnNight} w-full`} onClick={start}>
            Начать
          </button>
          <p className="text-center text-[13px] text-night-muted">
            Похоже на тест Корси на рабочую память. Сравнивайте себя с собой.{" "}
            <a href={cardHref("memory-span")} className="underline">
              Подробнее
            </a>
          </p>
        </div>
      </NightShell>
    );
  }

  if (phase === "result") {
    return (
      <NightShell>
        {close}
        <div className="flex flex-1 flex-col items-center justify-center-safe gap-5 text-center" role="status">
          <p className="text-[15px] text-night-muted">Самая длинная последовательность</p>
          <p className="stat text-[72px] text-night-ink">{level.best || "—"}</p>
          <p className="max-w-sm text-[15px] text-night-muted">
            {level.best >= 6 ? "Очень цепкая память сегодня!" : level.best >= 4 ? "Хороший результат. Обычно люди удерживают около 4 элементов." : "Попробуйте ещё раз в спокойной обстановке."}
          </p>
          {prev.length >= 2 && <Sparkline values={prev} label="Ваши результаты «Запомни порядок»" />}
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

  return (
    <NightShell>
      <div className="flex items-center justify-between">
        {close}
        <span className="text-[15px] text-night-muted">Длина {level.length}</span>
      </div>
      <p className="text-center text-[20px] font-semibold text-night-ink" aria-live="polite">
        {phase === "show" ? (wrong !== null ? "Не тот квадрат — ещё попытка" : "Смотрите…") : `Ваш ход · ${pos}/${seq.length}`}
      </p>
      <div className="mx-auto grid w-full max-w-[340px] flex-1 content-center grid-cols-3 gap-3" role="group" aria-label="Поле из 9 квадратов">
        {Array.from({ length: SPAN_TILES }, (_, k) => (
          <button
            key={k}
            type="button"
            disabled={phase !== "input"}
            onClick={() => press(k)}
            aria-label={`Квадрат ${k + 1}`}
            className={`aspect-square rounded-[16px] transition-colors duration-150 ${lit === k ? "bg-accent" : wrong === k ? "bg-red/60" : "bg-white/12 active:bg-white/30"}`}
          />
        ))}
      </div>
    </NightShell>
  );
}
