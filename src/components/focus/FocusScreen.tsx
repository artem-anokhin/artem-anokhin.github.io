"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Coffee, Volume2, VolumeX, Wind, Zap } from "lucide-react";
import { db, dayKey } from "@/lib/db";
import {
  SESSION_LENGTHS,
  TASK_MAX,
  cancelSession,
  finishSession,
  getActiveSession,
  markAway,
  recentTasks,
  remainingMs,
  startSession,
  type ActiveSession,
  type SessionLength,
} from "@/lib/focusSession";
import { plural } from "@/lib/plural";
import { tap } from "@/lib/haptics";
import { hasCrisisWording } from "@/lib/crisis";
import { NOISES, chime, isNoiseId, playNoise, stopNoise, unlockAudio, type NoiseId } from "@/lib/sound";
import { CrisisCard } from "@/components/CrisisCard";
import { loadTree } from "@/lib/garden";
import { GrowingSprout, sproutPhase } from "./GrowingSprout";
import { btnNight, btnNightGhost } from "@/components/ui/controls";
import { DropIcon, ProgressRing, TreeScene } from "@/components/ui/visuals";

type View =
  | { kind: "loading" }
  | { kind: "setup" }
  | { kind: "running"; active: ActiveSession }
  | { kind: "done"; minutes: number; away: number; task?: string }
  | { kind: "break"; endsAt: number };

const BREAK_MIN = 5;
const NOISE_KEY = "focusNoise";

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
    const request = () =>
      (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
        .request("screen")
        .then((l) => {
          if (gone) void l.release().catch(() => {});
          else lock = l;
        })
        .catch(() => {});
    void request();
    // The browser drops the lock when the tab hides; take it again on return.
    const onVis = () => document.visibilityState === "visible" && !gone && void request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release().catch(() => {});
    };
  }, [on]);
}

/** «Фокус»: study timer that waters the tree (night surface, docs/DESIGN.md §4). */
export function FocusScreen() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [length, setLength] = useState<SessionLength>(25);
  const [stats, setStats] = useState({ today: 0, week: 0, stage: 0 });
  const [task, setTask] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [noise, setNoise] = useState<NoiseId>("off");
  const [muted, setMuted] = useState(false);
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
    setRecent(recentTasks(sessions));
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const active = await getActiveSession();
      await loadStats();
      const saved = (await db.settings.get(NOISE_KEY))?.value;
      if (!alive) return;
      if (isNoiseId(saved)) setNoise(saved);
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
  const ticking = running || view.kind === "break";
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  // Leaving the app during a session is counted (gently shown at the end), like Forest.
  useEffect(() => {
    if (!running) return;
    const onVis = () => {
      if (document.visibilityState === "hidden") void markAway().catch(() => {});
      else setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [running]);

  // Noise plays only while a session runs.
  useEffect(() => {
    if (!running || muted) return;
    playNoise(noise);
    return () => stopNoise();
  }, [running, muted, noise]);

  // Break over → chime and back to setup.
  useEffect(() => {
    if (view.kind !== "break") return;
    const id = setTimeout(() => {
      chime();
      tap("success");
      setView({ kind: "setup" });
    }, Math.max(0, view.endsAt - Date.now()));
    return () => clearTimeout(id);
  }, [view]);

  useEffect(() => {
    if (view.kind !== "running" || remainingMs(view.active, now) > 0 || finishing.current) return;
    finishing.current = true;
    const minutes = view.active.minutes;
    finishSession()
      .then(async (row) => {
        await loadStats().catch(() => {}); // stats are cosmetic; the session is already saved
        if (row) {
          tap("success");
          chime();
        }
        setView(row ? { kind: "done", minutes, away: row.away ?? 0, task: row.task } : { kind: "setup" });
      })
      .catch(() => {
        setError(true);
        setView({ kind: "setup" });
      });
    // `finishing` stays true until the next start: a late tick must not finish twice.
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
    finishing.current = false;
    unlockAudio(); // inside the tap, so noise and the end chime may play
    const active = await startSession(length, undefined, Date.now(), task).catch(() => null);
    if (!active) return setError(true);
    setNow(Date.now());
    setView({ kind: "running", active });
  }

  async function onStop() {
    try {
      await cancelSession();
    } catch {
      setError(true);
    }
    setConfirmStop(false);
    setView({ kind: "setup" });
  }

  function pickNoise(id: NoiseId) {
    setNoise(id);
    void db.settings.put({ key: NOISE_KEY, value: id }).catch(() => {});
  }

  function startBreak() {
    unlockAudio(); // inside the tap so the end chime can play
    setNow(Date.now());
    setView({ kind: "break", endsAt: Date.now() + BREAK_MIN * 60_000 });
  }

  const stage = stats.stage;

  return (
    <div className="night fixed inset-0 z-10 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 pt-[calc(24px+env(safe-area-inset-top))] pb-36">
        {view.kind === "loading" && <div aria-busy="true" className="mt-24 h-72 animate-pulse rounded-card-lg bg-white/5" />}

        {view.kind === "setup" && (
          <div className="stagger space-y-7">
            <header>
              <h1 className="title mt-1 text-[32px] text-night-ink">Фокус-сессия</h1>
              <p className="mt-2 text-[17px] text-night-muted">Учитесь без отвлечений: за сессию из семени вырастет росток, а дерево получит каплю.</p>
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

            <div>
              <label htmlFor="task" className="mb-3 block text-[17px] font-semibold text-night-ink">
                Над чем работаете? <span className="font-normal text-night-muted">· необязательно</span>
              </label>
              <input
                id="task"
                value={task}
                maxLength={TASK_MAX}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Например, курсовая"
                autoComplete="off"
                className="min-h-12 w-full rounded-card bg-night-2 px-4 text-[17px] text-night-ink placeholder:text-night-muted focus-visible:outline-3 focus-visible:outline-glow"
              />
              {recent.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2" aria-label="Недавние задачи">
                  {recent.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTask(r)}
                      aria-pressed={task === r}
                      className={`pressable min-h-11 rounded-full px-4 text-[15px] ${task === r ? "bg-white text-accent" : "bg-white/8 text-night-ink/85"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
              {hasCrisisWording(task) && (
                <div className="mt-3">
                  <CrisisCard />
                </div>
              )}
            </div>

            <fieldset>
              <legend className="mb-3 text-[17px] font-semibold text-night-ink">Звук</legend>
              <div className="grid grid-cols-3 gap-1 rounded-full bg-night-2 p-1">
                {NOISES.map((n) => {
                  const on = n.id === noise;
                  return (
                    <label
                      key={n.id}
                      className={`pressable flex min-h-12 cursor-pointer items-center justify-center rounded-full text-[15px] font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-glow ${
                        on ? "bg-white text-accent" : "text-night-ink/85"
                      }`}
                    >
                      <input type="radio" name="noise" value={n.id} checked={on} onChange={() => pickNoise(n.id)} className="sr-only" />
                      {n.label}
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-[13px] text-night-muted">Звук создаётся на устройстве и играет только во время сессии.</p>
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

            <Link href="/breathe/" className="pressable flex min-h-18 items-center gap-4 rounded-card bg-white/6 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-s-caffeine/30 text-night-ink">
                <Wind aria-hidden size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-night-ink">Дыхание перед сессией</span>
                <span className="block text-[14px] text-night-muted">1 минута · вдох 4 с, выдох 6 с</span>
              </span>
              <ChevronRight aria-hidden size={20} className="text-night-muted" />
            </Link>

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
          <div className="flex flex-1 flex-col items-center justify-center-safe gap-6 text-center">
            <p className="eyebrow text-night-muted">
              {view.active.task ? view.active.task : "Фокус"} · {view.active.minutes} минут
            </p>
            <RunningSprout active={view.active} now={now} />
            <p className="max-w-xs text-[15px] text-night-muted">Телефон отложен — росток растёт. Можно закрыть вкладку: таймер продолжится.</p>
            {noise !== "off" && (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-pressed={muted}
                className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-white/8 px-4 text-[15px] text-night-ink/85"
              >
                {muted ? <VolumeX aria-hidden size={18} /> : <Volume2 aria-hidden size={18} />}
                {muted ? "Звук выключен" : NOISES.find((n) => n.id === noise)?.label}
              </button>
            )}
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
          <div className="flex flex-1 flex-col items-center justify-center-safe gap-6 text-center" role="status">
            <div className="animate-pop">
              <ProgressRing night size={200} stroke={8} value={1} color="#83CF6E">
                <GrowingSprout progress={1} className="w-[136px]" />
              </ProgressRing>
            </div>
            <p className="inline-flex animate-drop items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[15px] font-semibold text-night-ink">
              <DropIcon size={20} /> +1 капля в ваше дерево
            </p>
            <h1 className="title text-[30px] text-night-ink">
              {view.minutes} {plural(view.minutes, ["минута", "минуты", "минут"])} фокуса
            </h1>
            {view.task && <p className="-mt-4 text-[17px] text-night-ink/85">{view.task}</p>}
            {view.task && hasCrisisWording(view.task) && <CrisisCard />}
            <p className="text-[15px] text-night-muted">
              {view.away === 0 ? (
                "Ни разу не выходили из приложения — чистый фокус."
              ) : (
                <>
                  Выходили из приложения {view.away} {plural(view.away, ["раз", "раза", "раз"])}. Если телефон рядом отвлекает, попробуйте убрать его
                  подальше.{" "}
                  <a href="https://news.utexas.edu/2017/06/26/the-mere-presence-of-your-smartphone-reduces-brain-power" target="_blank" rel="noopener noreferrer" className="underline">
                    Исследование
                    <span className="sr-only"> (откроется в новой вкладке)</span>
                  </a>{" "}
                  (подтверждено частично)
                </>
              )}
            </p>
            <p className="text-[17px] text-night-muted">
              Сделайте перерыв 5 минут: встаньте, разомнитесь. Короткие перерывы связаны с бодростью.{" "}
              <a href="https://pubmed.ncbi.nlm.nih.gov/36044424/" target="_blank" rel="noopener noreferrer" className="underline">
                Мета-анализ микро-перерывов
                <span className="sr-only"> (откроется в новой вкладке)</span>
              </a>
            </p>
            <div className="grid w-full max-w-sm gap-2">
              <button type="button" onClick={startBreak} className={`${btnNight} w-full`}>
                <Coffee aria-hidden size={20} className="mr-2 inline" />
                Перерыв {BREAK_MIN} минут
              </button>
              <button type="button" onClick={() => setView({ kind: "setup" })} className={`${btnNightGhost} w-full`}>
                Готово
              </button>
              <Link href="/tree/" className="pressable min-h-11 py-2 text-[15px] text-night-muted underline">
                Посмотреть дерево
              </Link>
            </div>
          </div>
        )}

        {view.kind === "break" && <BreakView endsAt={view.endsAt} now={now} length={length} onEnd={() => setView({ kind: "setup" })} onNext={onStart} />}
      </div>
    </div>
  );
}

/** Running view centrepiece: the sprout grows with the ring; a drop waters it every 20%. */
function RunningSprout({ active, now }: { active: ActiveSession; now: number }) {
  const left = remainingMs(active, now);
  const p = 1 - left / (active.minutes * 60_000);
  const milestone = Math.floor(Math.max(0, Math.min(1, p)) * 5);
  return (
    <>
      <ProgressRing night size={256} stroke={10} value={p} label={`Осталось ${fmt(left)}`}>
        <span className="relative block">
          <GrowingSprout progress={p} className="w-[210px]" />
          {milestone > 0 && (
            <span key={milestone} className="absolute top-6 left-1/2 -ml-2.5 animate-water" aria-hidden>
              <DropIcon size={20} />
            </span>
          )}
        </span>
      </ProgressRing>
      <div>
        <p className="stat text-[56px] text-night-ink" aria-live="off">
          {fmt(left)}
        </p>
        <p className="mt-2 text-[17px] font-semibold text-[#9BDB7E]" aria-live="polite">
          {sproutPhase(p)}
        </p>
      </div>
    </>
  );
}

const BREAK_IDEAS = ["Встаньте и пройдитесь", "Выпейте воды", "Посмотрите в окно, вдаль", "Потянитесь, расправьте плечи"];

/** Short break timer after a session (micro-breaks meta-analysis, docs/sources.md). */
function BreakView({
  endsAt,
  now,
  length,
  onEnd,
  onNext,
}: {
  endsAt: number;
  now: number;
  length: number;
  onEnd: () => void;
  onNext: () => void;
}) {
  const left = Math.max(0, endsAt - now);
  const p = 1 - left / (BREAK_MIN * 60_000);
  return (
    <div className="flex flex-1 flex-col items-center justify-center-safe gap-6 text-center">
      <p className="eyebrow text-night-muted">Перерыв</p>
      <ProgressRing night size={220} stroke={8} value={p} color="#83CF6E" label={`Перерыв, осталось ${fmt(left)}`}>
        <Coffee aria-hidden size={56} className="text-night-ink/85" />
      </ProgressRing>
      <p className="stat text-[48px] text-night-ink" aria-live="off">
        {fmt(left)}
      </p>
      <ul className="w-full max-w-sm divide-y divide-white/10 rounded-card bg-white/6 text-left">
        {BREAK_IDEAS.map((i) => (
          <li key={i} className="px-4 py-3 text-[17px] text-night-ink/85">
            {i}
          </li>
        ))}
      </ul>
      <p className="max-w-sm text-[13px] text-night-muted">
        Перерывы до 10 минут связаны с бодростью и меньшей усталостью.{" "}
        <a href="https://pubmed.ncbi.nlm.nih.gov/36044424/" target="_blank" rel="noopener noreferrer" className="underline">
          Источник
          <span className="sr-only"> (откроется в новой вкладке)</span>
        </a>
      </p>
      <button type="button" onClick={onNext} className={`${btnNight} w-full max-w-sm`}>
        Ещё сессия · {length} мин
      </button>
      <button type="button" onClick={onEnd} className={`${btnNightGhost} -mt-3 w-full max-w-sm`}>
        Закончить перерыв
      </button>
    </div>
  );
}
