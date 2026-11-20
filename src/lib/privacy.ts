import { db as defaultDb, type FocusDB } from "./db";

export const EXPORT_FORMAT = "focusai-export";
export const EXPORT_VERSION = 1;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  checkins: unknown[];
  focusTests: unknown[];
  /** All settings rows: profile, experiment, experimentHistory, … */
  settings: unknown[];
}

/** Snapshot of every table, read in one transaction so it is consistent. */
export async function exportData(database: FocusDB = defaultDb, now = new Date()): Promise<ExportFile> {
  return database.transaction("r", database.checkins, database.focusTests, database.settings, async () => ({
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    checkins: await database.checkins.toArray(),
    focusTests: await database.focusTests.toArray(),
    settings: await database.settings.toArray(),
  }));
}

export function exportFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `focusai-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** Triggers a local download; nothing leaves the device. */
export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Deletes all user data (check-ins, tests, profile, experiments) in one transaction. */
export async function deleteAllData(database: FocusDB = defaultDb): Promise<void> {
  await database.transaction("rw", database.checkins, database.focusTests, database.settings, async () => {
    await database.checkins.clear();
    await database.focusTests.clear();
    await database.settings.clear();
  });
}
