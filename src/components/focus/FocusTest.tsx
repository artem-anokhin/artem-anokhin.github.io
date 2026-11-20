"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  TEST_DURATION_MS,
  phaseAt,
  press,
  startSession,
  summarize,
  tick,
  type FocusSummary,
  type Session,
} from "@/lib/focusTest";
import { saveFocusTest } from "@/lib/focusResults";
import { db, dayKey } from "@/lib/db";
import { latestTestByDay } from "@/lib/today";
import { X } from "lucide-react";
import { btnNight, btnNightGhost } from "@/components/ui/controls";
import { DropIcon, ProgressRing } from "@/components/ui/visuals";

type View = "intro" | "running" | "result";
type SaveStatus = "saving" | "saved" | "error" | "skipped";

const DISCLAIMER = "Не является медицинской консультацией.";

export function FocusTest() {
  const [view, setView] = useState<View>("intro");
  const [interrupted, setInterrupted] = useState(false);
  const [stimulus, setStimulus] = useState(false);
  const [leftMs, setLeftMs] = useState(TEST_DURATION_MS);
  const [feedback, setFeedback] = useState("");
  const [summary, setSummary] = useState<FocusSummary | null>(null);
  const [save, setSave] = useState<SaveStatus>("skipped");
  /** Mean of the latest test per day over the previous 7 days (today excluded). */
  const [weekAvg, setWeekAvg] = useState<number | null>(null);

  useEffect(() => {
    if (view !== "result") return;
    let alive = true;
    const today = dayKey();
    const n = new Date();
    const from = dayKey(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 7));
    db.focusTests
      .toArray()
      .then((all) => {
        const days = [...latestTestByDay(all.filter((t) => t.date >= from && t.date < today)).values()];
        if (alive) setWeekAvg(days.length ? Math.round(days.reduce((a, t) => a + t.score, 0) / days.length) : null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [view]);
  const session = useRef<Session | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  const store = useCallback(async (s: FocusSummary) => {
    if (s.score === null) return setSave("skipped");
    setSave("saving");
    try {
      await saveFocusTest(s);
      setSave("saved");
    } catch {
      setSave("error");
    }
  }, []);

  const finish = useCallback(() => {
    const s = session.current;
    session.current = null;
    if (!s) return;
    const result = summarize(s.rts, s.falseStarts);
    setSummary(result);
    setView("result");
    void store(result);
  }, [store]);

  const start = () => {
    session.current = startSession(performance.now());
    setInterrupted(false);
    setStimulus(false);
    setFeedback("");
    setLeftMs(TEST_DURATION_MS);
    setView("running");
  };

  const onPress = useCallback(() => {
    const s = session.current;
    if (!s) return;
    const now = performance.now();
    const wasStimulus = phaseAt(s, now) === "stimulus";
    const next = press(s, now);
    session.current = next;
    setStimulus(false);
    if (next.falseStarts > s.falseStarts) setFeedback("Рано, ничего страшного");
    else if (wasStimulus) setFeedback(`${Math.round(next.rts.at(-1) ?? 0)} мс`);
  }, []);

  // Animation-frame loop: shows the stimulus, records no-responses, ends the test.
  useEffect(() => {
    if (view !== "running") return;
    let raf = 0;
    const loop = () => {
      const s = session.current;
      if (!s) return;
      const now = performance.now();
      const next = tick(s, now);
      if (next !== s) {
        session.current = next;
        setFeedback("Пропуск");
      }
      const phase = phaseAt(next, now);
      if (phase === "done") return finish();
      setStimulus(phase === "stimulus");
      setLeftMs(next.endsAt - now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [view, finish]);

  // Measure reaction time from the first frame after the stimulus is painted, not from when it
  // was scheduled. A rAF queued after commit runs at the start of the next frame (after paint).
  useLayoutEffect(() => {
    if (!stimulus) return;
    const shownFor = session.current?.stimulusAt;
    const raf = requestAnimationFrame(() => {
      const s = session.current;
      if (s && s.stimulusAt === shownFor) session.current = { ...s, stimulusAt: performance.now() };
    });
    return () => cancelAnimationFrame(raf);
  }, [stimulus]);

  // Move focus with the view so keyboard and screen-reader users are not left on <body>.
  useEffect(() => {
    if (view === "running") zoneRef.current?.focus();
    if (view === "result") resultRef.current?.focus();
  }, [view]);

  // Keyboard: Space / Enter act as a tap. Hidden tab discards the run (timing would be wrong).
  useEffect(() => {
    if (view !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      // Let focused controls (e.g. «Закончить») work normally.
      if (e.target instanceof Element && e.target.closest("button, a")) return;
      e.preventDefault();
      if (!e.repeat) onPress();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        session.current = null;
        setInterrupted(true);
        setView("intro");
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [view, onPress]);

  const close = (
    <Link href="/focus/" aria-label="Закрыть тест" className="pressable grid size-11 place-items-center rounded-full bg-white/10 text-night-ink">
      <X aria-hidden size={22} />
    </Link>
  );

  if (view === "intro") {
    return (
      <Night>
        {close}
        <div className="stagger flex flex-1 flex-col items-center justify-center gap-6 text-center">
          {interrupted && (
            <p role="status" className="rounded-card bg-white/10 p-4 text-night-ink">
              Тест прерван: вкладка была свёрнута. Начните заново, когда будет удобно.
            </p>
          )}
          <span aria-hidden className="grid size-44 animate-breathe place-items-center rounded-full bg-accent/25 ">
            <span className="size-24 rounded-full bg-accent" />
          </span>
          <div>
            <h1 className="title text-[32px] text-night-ink">Тест реакции</h1>
            <p className="mt-2 text-[17px] text-night-muted">90 секунд. Нажимайте, как только загорится круг.</p>
          </div>
          <ul className="w-full max-w-sm space-y-2 text-left text-[15px] text-night-ink">
            <li className="rounded-[18px] bg-white/6 px-4 py-3">Нажимайте в любом месте нижней зоны экрана</li>
            <li className="rounded-[18px] bg-white/6 px-4 py-3">Не нажимайте заранее — это ошибка</li>
            <li className="rounded-[18px] bg-white/6 px-4 py-3">На компьютере можно нажимать пробел</li>
          </ul>
        </div>
        <div className="space-y-3">
          <button type="button" className={`${btnNight} w-full`} onClick={start}>
            Начать
          </button>
          <p className="text-center text-[13px] text-night-muted">Короткая версия менее точна, чем лабораторный тест. {DISCLAIMER}</p>
        </div>
      </Night>
    );
  }

  if (view === "running") {
    const sec = Math.ceil(leftMs / 1000);
    const progress = 1 - leftMs / TEST_DURATION_MS;
    return (
      <Night>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12" aria-hidden>
            <div className="h-full rounded-full bg-glow" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="stat text-[17px] text-night-muted">
            {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}
          </p>
        </div>
        <div
          ref={zoneRef}
          role="button"
          tabIndex={0}
          aria-label="Зона нажатия"
          onPointerDown={(e) => {
            e.preventDefault();
            onPress();
          }}
          className="mt-4 flex flex-1 cursor-pointer touch-none select-none flex-col items-center justify-center gap-6 rounded-sheet bg-white/[0.03]"
        >
          <span
            aria-hidden
            className={`grid size-52 place-items-center rounded-full transition-all duration-75 ${
              stimulus ? "scale-100 bg-accent " : "scale-90 border-2 border-white/15"
            }`}
          >
            {stimulus && <span className="font-display text-2xl font-extrabold text-white">Жми!</span>}
          </span>
          <span className="min-h-6 text-[15px] text-night-muted">{stimulus ? "" : feedback || "Ждите…"}</span>
        </div>
        <p className="sr-only" aria-live="polite">
          {stimulus ? "Сигнал" : ""}
        </p>
        <button type="button" className={`${btnNightGhost} mt-4 w-full`} onClick={finish}>
          Закончить
        </button>
      </Night>
    );
  }

  const s = summary;
  return (
    <Night>
      {close}
      <section ref={resultRef} tabIndex={-1} aria-label="Результат теста" className="flex flex-1 flex-col items-center justify-center gap-6 text-center focus:outline-none">
        {s?.score != null ? (
          <>
            <p className="eyebrow text-night-muted">Focus Score</p>
            <ProgressRing night size={220} stroke={14} value={s.score / 100}>
              <span>
                <span className="stat block text-[64px] text-night-ink">{s.score}</span>
                <span className="text-[15px] text-night-muted">из 100</span>
              </span>
            </ProgressRing>
            {weekAvg !== null && s.score != null && (
              <p className="text-[15px] text-night-muted">
                В среднем за прошлые 7 дней: <span className="font-semibold text-night-ink tabular-nums">{weekAvg}</span>
                {s.score !== weekAvg && (
                  <span className="ml-1 tabular-nums">
                    ({s.score > weekAvg ? "+" : "−"}
                    {Math.abs(s.score - weekAvg)})
                  </span>
                )}
              </p>
            )}
            {save === "saved" && (
              <p className="inline-flex animate-drop items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[15px] font-semibold text-night-ink">
                <DropIcon size={18} /> Сохранено · капля для дерева
              </p>
            )}
          </>
        ) : (
          <p className="title text-[24px] text-night-ink">Мало нажатий для оценки. Попробуйте ещё раз.</p>
        )}
        {s && (
          <dl className="grid w-full grid-cols-3 gap-2">
            {[
              ["Реакция", s.medianRt != null ? `${s.medianRt} мс` : "—"],
              ["Пропуски", String(s.lapses)],
              ["Ранние", String(s.falseStarts)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-card bg-white/6 p-3">
                <dt className="text-[13px] text-night-muted">{label}</dt>
                <dd className="stat mt-1 text-[22px] text-night-ink">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-[13px] text-night-muted">Результат меняется день ото дня: с ним связаны сон и обстановка. {DISCLAIMER}</p>
        <p role="status" className="text-[15px] text-night-ink">
          {save === "saving" && "Сохраняем…"}
          {save === "error" && (
            <>
              Не удалось сохранить.{" "}
              <button type="button" className="min-h-11 font-semibold underline" onClick={() => s && store(s)}>
                Повторить
              </button>
            </>
          )}
        </p>
      </section>
      <div className="grid gap-3">
        <Link href="/" className={btnNight}>
          На главную
        </Link>
        <button type="button" className={btnNightGhost} onClick={start}>
          Пройти ещё раз
        </button>
      </div>
    </Night>
  );
}

function Night({ children }: { children: React.ReactNode }) {
  return (
    <div className="night min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(20px+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
