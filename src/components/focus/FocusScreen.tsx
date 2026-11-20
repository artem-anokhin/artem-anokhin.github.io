"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Zap } from "lucide-react";
import { db, dayKey } from "@/lib/db";
import {
  SESSION_LENGTHS,
  cancelSession,
  finishSession,
  getActiveSession,
  remainingMs,
  startSession,
  type ActiveSession,
  type SessionLength,
} from "@/lib/focusSession";
import { plural } from "@/lib/plural";
import { tap } from "@/lib/haptics";
import { loadTree } from "@/lib/garden";
import { btnNight, btnNightGhost } from "@/components/ui/controls";
import { DropIcon, ProgressRing, TreeScene } from "@/components/ui/visuals";

type View =
  | { kind: "loading" }
  | { kind: "setup" }
  | { kind: "running"; active: ActiveSession }
  | { kind: "done"; minutes: number };

const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Hide the app navigation while a session runs (see globals.css). */
function useImmersive(on: boolean) {
  useEffect(() => {
    if (!on) return;
    document.documentElement.dataset.immersive = "1";
    return () => {
      delete document.documentElement.dataset.immersive;
    };
  }, [on]);
}

/** Keep the screen on during a session where the browser allows it. */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let gone = false;
    (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
      .request("screen")
      .then((l) => {
        if (gone) void l.release().catch(() => {});
        else lock = l;
      })
      .catch(() => {});
    return () => {
      gone = true;
      void lock?.release().catch(() => {});
    };
  }, [on]);
}

/** «Фокус»: study timer that waters the tree (night surface, docs/DESIGN.md §4). */
export function FocusScreen() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [length, setLength] = useState<SessionLength>(25);
  const [stats, setStats] = useState({ today: 0, week: 0, stage: 0 });
  const [now, setNow] = useState(() => Date.now());
  const [confirmStop, setConfirmStop] = useState(false);
  const [error, setError] = useState(false);
  const finishing = useRef(false);

  const loadStats = useCallback(async () => {
    const [sessions, tree] = await Promise.all([db.sessions.toArray(), loadTree()]);
    const key = dayKey();
    const n = new Date();
    const weekAgo = dayKey(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 6));
    setStats({
      today: sessions.filter((s) => s.date === key).reduce((a, s) => a + s.minutes, 0),
      week: sessions.filter((s) => s.date >= weekAgo && s.date <= key).reduce((a, s) => a + s.minutes, 0),
      stage: tree.stage,
    });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const active = await getActiveSession();
      await loadStats();
      if (!alive) return;
      setView(active ? { kind: "running", active } : { kind: "setup" });
    })().catch(() => alive && setView({ kind: "setup" }));
    return () => {
      alive = false;
    };
  }, [loadStats]);

  const running = view.kind === "running";
  useImmersive(running);
  useWakeLock(running);

  // Tick once a second; finish when time is up.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (view.kind !== "running" || remainingMs(view.active, now) > 0 || finishing.current) return;
    finishing.current = true;
    const minutes = view.active.minutes;
    finishSession()
      .then(async (row) => {
        await loadStats();
        if (row) tap("success");
        setView(row ? { kind: "done", minutes } : { kind: "setup" });
      })
      .catch(() => {
        setError(true);
        setView({ kind: "setup" });
      })
      .finally(() => (finishing.current = false));
  }, [view, now, loadStats]);

  // Show the time left in the tab title while running.
  useEffect(() => {
    if (view.kind !== "running") return;
    const prev = document.title;
    document.title = `${fmt(remainingMs(view.active, now))} · Фокус`;
    return () => {
      document.title = prev;
    };
  }, [view, now]);

  async function onStart() {
    setError(false);
    const active = await startSession(length).catch(() => null);
    if (!active) return setError(true);
    setNow(Date.now());
    setView({ kind: "running", active });
  }

  async function onStop() {
    await cancelSession();
    setConfirmStop(false);
    setView({ kind: "setup" });
  }

  const stage = stats.stage;

  return (
    <div className="night fixed inset-0 z-10 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 pt-[calc(24px+env(safe-area-inset-top))] pb-36">
        {view.kind === "loading" && <div aria-busy="true" className="mt-24 h-72 animate-pulse rounded-card-lg bg-white/5" />}

        {view.kind === "setup" && (
          <div className="stagger space-y-7">
            <header>
              <p className="eyebrow text-night-muted">Фокус</p>
              <h1 className="title mt-1 text-[32px] text-night-ink">Фокус-сессия</h1>
              <p className="mt-2 text-[17px] text-night-muted">Учитесь без отвлечений. Сессия до конца — капля для дерева.</p>
            </header>

            <TreeScene night stage={stage} wilting={false} title="Ваше дерево ночью" className="h-56 rounded-card-lg" />

            <fieldset>
              <legend className="mb-3 text-[17px] font-semibold text-night-ink">Длительность</legend>
              <div className="grid grid-cols-3 gap-1 rounded-full bg-night-2 p-1">
                {SESSION_LENGTHS.map((m) => {
                  const on = m === length;
                  return (
                    <label
                      key={m}
                      className={`pressable flex min-h-12 cursor-pointer items-center justify-center rounded-full text-[17px] font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-glow ${
                        on ? "bg-white text-accent" : "text-night-ink/85"
                      }`}
                    >
                      <input type="radio" name="len" value={m} checked={on} onChange={() => setLength(m)} className="sr-only" />
                      {m} мин
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <button type="button" onClick={onStart} className={`${btnNight} w-full`}>
              Начать {length} минут
            </button>
            {error && (
              <p role="alert" className="text-night-ink">
                Не получилось сохранить сессию. Попробуйте ещё раз.
              </p>
            )}

            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-card bg-white/6 p-4">
                <dt className="text-[13px] text-night-muted">Сегодня</dt>
                <dd className="stat mt-1 text-[32px] text-night-ink">
                  {stats.today}
                  <span className="ml-1 font-sans text-[15px] font-semibold tracking-normal text-night-muted">мин</span>
                </dd>
              </div>
              <div className="rounded-card bg-white/6 p-4">
                <dt className="text-[13px] text-night-muted">За 7 дней</dt>
                <dd className="stat mt-1 text-[32px] text-night-ink">
                  {stats.week}
                  <span className="ml-1 font-sans text-[15px] font-semibold tracking-normal text-night-muted">мин</span>
                </dd>
              </div>
            </dl>

            <Link href="/test/" className="pressable flex min-h-18 items-center gap-4 rounded-card bg-white/6 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-glow/25 text-night-ink">
                <Zap aria-hidden size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-night-ink">Тест реакции</span>
                <span className="block text-[14px] text-night-muted">90 секунд · ваш Focus Score на сегодня</span>
              </span>
              <ChevronRight aria-hidden size={20} className="text-night-muted" />
            </Link>
          </div>
        )}

        {view.kind === "running" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
            <p className="eyebrow text-night-muted">Фокус · {view.active.minutes} минут</p>
            <div className="animate-breathe">
              <ProgressRing
                night
                size={280}
                stroke={14}
                value={1 - remainingMs(view.active, now) / (view.active.minutes * 60_000)}
                label={`Осталось ${fmt(remainingMs(view.active, now))}`}
              >
                <span>
                  <span className="stat block text-[64px] text-night-ink" aria-live="off">
                    {fmt(remainingMs(view.active, now))}
                  </span>
                  <span className="text-[15px] text-night-muted">осталось</span>
                </span>
              </ProgressRing>
            </div>
            <p className="max-w-xs text-[17px] text-night-muted">Телефон отложен — дерево растёт. Можно закрыть вкладку: таймер продолжится.</p>
            {!confirmStop ? (
              <button type="button" onClick={() => setConfirmStop(true)} className={btnNightGhost}>
                Завершить раньше
              </button>
            ) : (
              <div role="group" aria-label="Завершить раньше?" className="w-full max-w-sm rounded-card bg-white/8 p-4">
                <p className="font-semibold text-night-ink">Завершить раньше? Капля за эту сессию не засчитается.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setConfirmStop(false)} className={btnNight}>
                    Продолжить
                  </button>
                  <button type="button" onClick={onStop} className={btnNightGhost}>
                    Завершить
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view.kind === "done" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center" role="status">
            <p className="inline-flex animate-drop items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[15px] font-semibold text-night-ink">
              <DropIcon size={20} /> +1 капля
            </p>
            <TreeScene stage={stage} wilting={false} title="Дерево после сессии" className="h-64 w-full animate-rise rounded-card-lg" />
            <h1 className="title text-[30px] text-night-ink">
              {view.minutes} {plural(view.minutes, ["минута", "минуты", "минут"])} фокуса
            </h1>
            <p className="text-[17px] text-night-muted">
              Отличная работа. Сделайте перерыв 5 минут: встаньте, разомнитесь. Короткие перерывы связаны с бодростью.{" "}
              <a href="https://pubmed.ncbi.nlm.nih.gov/36044424/" target="_blank" rel="noopener noreferrer" className="underline">
                Мета-анализ микро-перерывов
                <span className="sr-only"> (откроется в новой вкладке)</span>
              </a>
            </p>
            <button type="button" onClick={() => setView({ kind: "setup" })} className={`${btnNight} w-full max-w-sm`}>
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
