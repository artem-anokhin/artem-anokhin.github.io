import Dexie, { type EntityTable } from "dexie";
import { sanitizeCheckIn, type CheckInData, type SphereKey } from "./checkin";

/**
 * Local-first storage. All user data stays in this browser's IndexedDB.
 * Only indexed fields are declared in the Dexie schema; the rest of a row
 * (check-in answers) needs no schema version bump.
 */

/** Calendar day in local time, "YYYY-MM-DD". */
export type DayKey = string;

export interface CheckIn extends CheckInData {
  date: DayKey;
  createdAt: number;
  updatedAt: number;
  /** Synthetic demo row (see demo.ts); real saves never set it. */
  demo?: true;
}

export interface FocusTestResult {
  id?: number;
  date: DayKey;
  takenAt: number;
  score: number;
  /** Non-indexed details (added in M2, no schema bump needed). */
  medianRt?: number;
  lapses?: number;
  falseStarts?: number;
  trials?: number;
  /** Synthetic demo row (see demo.ts). */
  demo?: true;
}

/** A finished «Фокус-сессия» (study timer). Only completed sessions are stored. */
export interface FocusSession {
  id?: number;
  date: DayKey;
  startedAt: number;
  minutes: number;
  /** Optional «Над чем работаете?» label (non-indexed). */
  task?: string;
  /** Times the user left the app during the session (non-indexed). */
  away?: number;
  /** Joined via a «Учиться вместе» link (non-indexed). */
  together?: true;
  /** Self-rating after the session: 1 трудно, 2 нормально, 3 отлично (non-indexed). */
  feel?: 1 | 2 | 3;
  /** Synthetic demo row (see demo.ts). */
  demo?: true;
}

/** A small daily habit the user chose («Привычки»). */
export interface Habit {
  id?: number;
  title: string;
  sphere: SphereKey;
  /** Id from HABIT_IDEAS when picked from suggestions. */
  ideaId?: string;
  createdAt: number;
  /** 1 = removed from the active list (history kept). Number so Dexie can index it. */
  archived: 0 | 1;
  demo?: true;
}

/** One habit done on one day. */
export interface HabitLog {
  habitId: number;
  date: DayKey;
  doneAt: number;
  demo?: true;
}

/** «Цели»: a personal goal with optional due date and small steps. */
export interface Goal {
  id?: number;
  title: string;
  /** Optional «зачем» line. */
  why?: string;
  due?: DayKey;
  /** WOOP method: inner obstacle and the «Если…, то…» plan. */
  obstacle?: string;
  plan?: string;
  steps: { text: string; done: boolean }[];
  /** 0 = active, 1 = reached (number so Dexie can index it). */
  done: 0 | 1;
  doneAt?: number;
  createdAt: number;
}

/** «Заметки»: free-text notes, local only. */
export interface Note {
  id?: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

/** Extra mini-tests: «Цвет и слово» (Stroop) and «Запомни порядок» (memory span). */
export interface BrainTest {
  id?: number;
  kind: "stroop" | "span";
  date: DayKey;
  takenAt: number;
  /** stroop: 0–100 (our own scale); span: longest sequence repeated (2–9). */
  score: number;
  /** stroop only: share correct 0–1, median RT ms, interference ms (incongruent − congruent). */
  accuracy?: number;
  medianRt?: number;
  interference?: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export class FocusDB extends Dexie {
  checkins!: EntityTable<CheckIn, "date">;
  focusTests!: EntityTable<FocusTestResult, "id">;
  settings!: EntityTable<Setting, "key">;
  sessions!: EntityTable<FocusSession, "id">;
  habits!: EntityTable<Habit, "id">;
  habitLogs!: Dexie.Table<HabitLog, [number, string]>;
  goals!: EntityTable<Goal, "id">;
  notes!: EntityTable<Note, "id">;
  brainTests!: EntityTable<BrainTest, "id">;

  constructor(name = "focusai") {
    super(name);
    this.version(1).stores({
      checkins: "&date",
      focusTests: "++id, date",
      settings: "&key",
    });
    // v2: focus sessions (study timer).
    this.version(2).stores({ sessions: "++id, date" });
    // v3: habits and their daily marks.
    this.version(3).stores({ habits: "++id, archived", habitLogs: "&[habitId+date], date, habitId" });
    // v4: goals and notes.
    this.version(4).stores({ goals: "++id, done", notes: "++id, updatedAt" });
    // v5: extra mini-tests.
    this.version(5).stores({ brainTests: "++id, kind, date" });
  }
}

export const db = new FocusDB();

/** Local calendar day key for a date. */
export function dayKey(d: Date = new Date()): DayKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Settings key of the consented profile (shared with settings.ts and privacy.ts). */
export const PROFILE_KEY = "profile";

/** True when a consented profile exists (kept here to avoid a settings ↔ db import cycle). */
async function hasConsent(database: FocusDB): Promise<boolean> {
  const v = (await database.settings.get(PROFILE_KEY))?.value as { consentAt?: unknown } | undefined;
  return typeof v?.consentAt === "number";
}

/**
 * Insert or update the check-in for `date`; keeps the original createdAt.
 * Returns null (nothing stored) without a consented profile.
 */
export async function saveCheckIn(
  data: CheckInData,
  date: DayKey = dayKey(),
  database: FocusDB = db,
  now = Date.now(),
): Promise<CheckIn | null> {
  return database.transaction("rw", database.checkins, database.settings, async () => {
    if (!(await hasConsent(database))) return null; // no consent → no storage
    const prev = await database.checkins.get(date);
    const row: CheckIn = {
      ...sanitizeCheckIn(data),
      date,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
    await database.checkins.put(row);
    return row;
  });
}

