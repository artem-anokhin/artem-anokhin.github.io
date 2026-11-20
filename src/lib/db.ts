import Dexie, { type EntityTable } from "dexie";
import { sanitizeCheckIn, type CheckInData } from "./checkin";

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

/** Insert or update the check-in for `date`; keeps the original createdAt. */
export async function saveCheckIn(
  data: CheckInData,
  date: DayKey = dayKey(),
  database: FocusDB = db,
  now = Date.now(),
): Promise<CheckIn> {
  return database.transaction("rw", database.checkins, async () => {
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

