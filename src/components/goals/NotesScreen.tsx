"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, Pencil, Trash2 } from "lucide-react";
import type { Note } from "@/lib/db";
import { NOTE_MAX, deleteNote, listNotes, saveNote } from "@/lib/notes";
import { hasCrisisWording } from "@/lib/crisis";
import { CrisisCard } from "@/components/CrisisCard";
import { btnPrimary } from "@/components/ui/controls";

const whenFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** «Заметки»: quick private notes; crisis wording shows the calm help card (never blocks). */
export function NotesScreen() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = useCallback(() => {
    listNotes()
      .then(setNotes)
      .catch(() => setNotes([]));
  }, []);
  useEffect(load, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const r = await saveNote(text, editing ?? undefined).catch(() => null);
    if (!r) return setError(true);
    setText("");
    setEditing(null);
    setError(false);
    load();
  }

  if (notes === null) return <div aria-busy="true" className="h-48 animate-pulse rounded-card-lg bg-surface" />;
  const q = query.trim().toLowerCase();
  const shown = q ? notes.filter((n) => n.text.toLowerCase().includes(q)) : notes;
  const crisis = hasCrisisWording(text) || notes.slice(0, 5).some((n) => hasCrisisWording(n.text));

  return (
    <div className="space-y-5">
      <form onSubmit={onSave} className="rounded-card-lg bg-surface p-4" aria-label={editing ? "Изменить заметку" : "Новая заметка"}>
        <label htmlFor="note" className="sr-only">
          Текст заметки
        </label>
        <textarea
          id="note"
          value={text}
          maxLength={NOTE_MAX}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Что на уме? Идея, вывод дня, что получилось…"
          className="w-full resize-y rounded-[10px] bg-fill p-3 text-[17px] text-ink placeholder:text-muted"
        />
        <div className="mt-2 flex items-center gap-3">
          <span className="flex-1 text-[13px] text-muted tabular-nums">
            {text.length}/{NOTE_MAX}
          </span>
          {editing !== null && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setText("");
              }}
              className="min-h-11 px-3 text-[15px] text-link"
            >
              Отмена
            </button>
          )}
          <button type="submit" disabled={!text.trim()} className={`${btnPrimary} px-6 disabled:opacity-50`}>
            {editing !== null ? "Сохранить" : "Добавить"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-[15px] text-danger">
            Не получилось сохранить. Попробуйте ещё раз.
          </p>
        )}
      </form>

      {crisis && <CrisisCard />}

      {notes.length > 3 && (
        <div>
          <label htmlFor="note-q" className="sr-only">
            Поиск по заметкам
          </label>
          <input
            id="note-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск"
            className="min-h-11 w-full rounded-[10px] bg-fill px-3 text-[17px] text-ink placeholder:text-muted"
          />
        </div>
      )}

      {notes.length === 0 ? (
        <p className="px-4 text-[15px] text-muted">Здесь появятся ваши заметки.</p>
      ) : (
        <ul className="group-list" aria-label="Заметки">
          {shown.map((n) => (
            <li key={n.id} className="flex items-start gap-2 py-3 pr-1 pl-4">
              <div className="min-w-0 flex-1">
                <p className="text-[17px] break-words whitespace-pre-wrap text-ink">{n.text}</p>
                <p className="mt-1 text-[13px] text-muted">{whenFmt.format(n.updatedAt)}</p>
                {confirmId === n.id && (
                  <div role="group" aria-label="Удалить заметку?" className="mt-2 flex items-center gap-2 rounded-[12px] bg-danger-tint p-2 pl-3">
                    <span className="flex-1 text-[15px] text-ink">Удалить заметку?</span>
                    <button type="button" onClick={() => setConfirmId(null)} className="min-h-11 px-3 text-[15px] text-link">
                      Нет
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteNote(n.id!).catch(() => {});
                        if (editing === n.id) {
                          setEditing(null);
                          setText("");
                        }
                        setConfirmId(null);
                        load();
                      }}
                      className="min-h-11 px-3 text-[15px] font-semibold text-danger"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label="Изменить заметку"
                onClick={() => {
                  setEditing(n.id!);
                  setText(n.text);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="grid size-11 shrink-0 place-items-center text-muted"
              >
                <Pencil aria-hidden size={18} />
              </button>
              <button
                type="button"
                aria-label="Удалить заметку"
                onClick={() => setConfirmId(n.id!)}
                className="grid size-11 shrink-0 place-items-center text-muted"
              >
                <Trash2 aria-hidden size={18} />
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-4 py-3 text-[15px] text-muted">Ничего не найдено</li>}
        </ul>
      )}

      <p className="flex items-start gap-2 px-4 text-[13px] text-muted">
        <Lock aria-hidden size={14} className="mt-0.5 shrink-0" />
        Заметки хранятся только на этом устройстве. Они попадают в «Экспорт данных» (файл не зашифрован) и удаляются кнопкой «Удалить все данные».
      </p>
    </div>
  );
}
