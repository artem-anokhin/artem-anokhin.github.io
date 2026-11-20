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
import { btnPrimary, btnSecondary } from "@/components/ui/controls";

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

  if (view === "intro") {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        {interrupted && (
          <p role="status" className="card p-4 text-ink">
            Тест прерван: вкладка была свёрнута. Начните заново, когда будет удобно.
          </p>
        )}
        <ol className="card list-decimal space-y-3 p-6 pl-10 text-ink">
          <li>Нажимайте на синюю зону, как только появится круг.</li>
          <li>Не нажимайте заранее: ранние нажатия считаются ошибкой.</li>
          <li>На компьютере можно нажимать пробел.</li>
        </ol>
        <p className="text-sm text-muted">
          Короткая версия менее точна, чем лабораторный тест. {DISCLAIMER}
        </p>
        <button type="button" className={`${btnPrimary} w-full`} onClick={start}>
          Начать
        </button>
      </div>
    );
  }

  if (view === "running") {
    const sec = Math.ceil(leftMs / 1000);
    const progress = 1 - leftMs / TEST_DURATION_MS;
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-soft" aria-hidden>
            <div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">
            Осталось {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}
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
          className="card flex min-h-[min(360px,50svh)] cursor-pointer touch-none select-none flex-col items-center justify-center gap-4 bg-soft"
        >
          {stimulus ? (
            <span className="flex size-32 items-center justify-center rounded-full bg-accent font-display text-2xl font-extrabold text-white">
              Нажмите!
            </span>
          ) : (
            <span className="font-display text-2xl font-extrabold text-navy">Ждите…</span>
          )}
          <span className="min-h-6 text-muted">{stimulus ? "" : feedback}</span>
        </div>
        <p className="sr-only" aria-live="polite">
          {stimulus ? "Сигнал" : ""}
        </p>
        <button type="button" className={`${btnSecondary} w-full`} onClick={finish}>
          Закончить
        </button>
      </div>
    );
  }

  const s = summary;
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <section ref={resultRef} tabIndex={-1} aria-label="Результат теста" className="card p-6 text-center">
        {s?.score != null ? (
          <>
            <p className="text-muted">Focus Score</p>
            <p className="font-display text-6xl font-black text-navy">
              {s.score}
              <span className="text-2xl text-muted"> / 100</span>
            </p>
          </>
        ) : (
          <p className="font-semibold text-ink">Мало нажатий для оценки. Попробуйте ещё раз.</p>
        )}
      </section>
      {s && (
        <dl className="grid grid-cols-3 gap-3 text-center">
          {[
            ["Медиана", s.medianRt != null ? `${s.medianRt} мс` : "—"],
            ["Пропуски", String(s.lapses)],
            ["Ранние нажатия", String(s.falseStarts)],
          ].map(([label, value]) => (
            <div key={label} className="card p-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-display text-xl font-extrabold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-sm text-muted">Результат может меняться день ото дня: с ним связаны сон и обстановка. {DISCLAIMER}</p>
      <p role="status" className="text-sm text-ink">
        {save === "saving" && "Сохраняем…"}
        {save === "saved" && "Сохранено на устройстве"}
        {save === "error" && (
          <>
            Не удалось сохранить.{" "}
            <button type="button" className="min-h-11 font-semibold text-accent underline" onClick={() => s && store(s)}>
              Повторить
            </button>
          </>
        )}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className={btnPrimary} onClick={start}>
          Пройти ещё раз
        </button>
        <Link href="/" className={btnSecondary}>
          На главную
        </Link>
      </div>
    </div>
  );
}
