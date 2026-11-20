import Dexie, { type EntityTable } from "dexie";

/**
 * Local-first storage. All user data stays in this browser's IndexedDB.
 * Schemas are filled in by later milestones (M1 check-in, M2 focus test).
 */

/** Calendar day in local time, "YYYY-MM-DD". */
export type DayKey = string;

export interface CheckIn {
  date: DayKey;
  createdAt: number;
  updatedAt: number;
}

export interface FocusTestResult {
  id?: number;
  date: DayKey;
  takenAt: number;
  score: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export class FocusDB extends Dexie {
  checkins!: EntityTable<CheckIn, "date">;
  focusTests!: EntityTable<FocusTestResult, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor(name = "focusai") {
    super(name);
    this.version(1).stores({
      checkins: "&date",
      focusTests: "++id, date",
      settings: "&key",
    });
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
