import { db as defaultDb, type FocusDB, type Note } from "./db";
import { getProfile } from "./settings";

/** «Заметки»: quick private notes. Local only, consent-gated. Crisis wording is checked in the UI. */

export const NOTE_MAX = 2000;
export const MAX_NOTES = 500;

export function cleanNote(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = Array.from(v.replace(/\r\n?/g, "\n").trim()).slice(0, NOTE_MAX).join("").trim();
  return t || undefined;
}

export function sanitizeNote(v: unknown): Omit<Note, "id"> | null {
  if (!v || typeof v !== "object") return null;
  const n = v as Record<string, unknown>;
  const text = cleanNote(n.text);
  const ok = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x > 0 && x < 8.64e15;
  if (!text || !ok(n.createdAt)) return null;
  return { text, createdAt: n.createdAt, updatedAt: ok(n.updatedAt) ? n.updatedAt : n.createdAt };
}

export async function listNotes(db: FocusDB = defaultDb): Promise<Note[]> {
  return db.notes.orderBy("updatedAt").reverse().toArray();
}

/** Saves a new note or updates `id`. Null without consent, empty text or when full. */
export async function saveNote(text: string, id?: number, db: FocusDB = defaultDb, now = Date.now()): Promise<Note | null> {
  const t = cleanNote(text);
  if (!t) return null;
  return db.transaction("rw", db.notes, db.settings, async () => {
    if (!(await getProfile(db))) return null;
    if (id !== undefined) {
      const prev = await db.notes.get(id);
      if (!prev) return null;
      const row = { ...prev, text: t, updatedAt: now };
      await db.notes.put(row);
      return row;
    }
    if ((await db.notes.count()) >= MAX_NOTES) return null;
    const row: Note = { text: t, createdAt: now, updatedAt: now };
    row.id = await db.notes.add(row);
    return row;
  });
}

export async function deleteNote(id: number, db: FocusDB = defaultDb): Promise<void> {
  await db.notes.delete(id);
}
