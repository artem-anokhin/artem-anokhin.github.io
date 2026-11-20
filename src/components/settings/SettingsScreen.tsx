"use client";

import { Download, Presentation, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChoiceField, btnSecondary } from "@/components/ui/controls";
import { HELP_LINES } from "@/lib/crisis";
import { ReminderCard } from "./ReminderCard";
import { db } from "@/lib/db";
import { DEMO_DAYS, clearDemo, isDemo, loadDemo } from "@/lib/demo";
import { deleteAllData, downloadJson, exportData, exportFileName, importData } from "@/lib/privacy";
import { MODE_LABEL, getProfile, updateMode, type Mode, type Profile } from "@/lib/settings";

const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

const MODES = (Object.keys(MODE_LABEL) as Mode[]).map((value) => ({ value, label: MODE_LABEL[value] }));

const btnDangerSolid =
  "pressable inline-flex min-h-[50px] items-center justify-center rounded-[14px] bg-[#d70015] px-5 text-[17px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

const consentDate = (t: number) =>
  new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

export function SettingsScreen() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Parsed import file waiting for confirmation. */
  const [pending, setPending] = useState<unknown>(null);
  /** "empty" = no data yet (demo can be loaded), "demo" = demo loaded, "real" = user data. */
  const [dataKind, setDataKind] = useState<"empty" | "demo" | "real" | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    let alive = true;
    getProfile()
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfile(null));
    Promise.all([isDemo(), db.checkins.count(), db.focusTests.count()])
      .then(([demo, c, t]) => alive && setDataKind(demo ? "demo" : c + t ? "real" : "empty"))
      .catch(() => alive && setDataKind(null));
    return () => {
      alive = false;
    };
  }, []);

  // Deep links like /settings/#reminder: scroll once the content is rendered.
  const loaded = profile != null;
  useEffect(() => {
    if (!loaded || !window.location.hash) return;
    try {
      document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
    } catch {
      // Malformed hash: nothing to scroll to.
    }
  }, [loaded]);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) deleteRef.current?.focus(); // back to the trigger after «Отмена»
    wasConfirming.current = confirming;
  }, [confirming]);

  if (profile === undefined) {
    return <div aria-busy="true" className="card h-40 animate-pulse p-5" />;
  }
  // No profile: AppShell sends the user to onboarding.
  if (profile === null) return null;

  async function changeMode(mode: Mode) {
    setError(null);
    setSaved(false);
    try {
      const p = await updateMode(mode);
      if (p) {
        setProfile(p);
        setSaved(true);
      }
    } catch {
      setError("Не получилось сохранить. Попробуйте ещё раз.");
    }
  }


  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > IMPORT_MAX_BYTES) throw new Error("too big");
      const data: unknown = JSON.parse(await file.text());
      if ((data as { format?: unknown })?.format !== "focusai-export") throw new Error("format");
      setPending(data);
    } catch {
      setError("Это не файл экспорта FocusAI.");
    }
  }

  async function onImport() {
    setBusy(true);
    try {
      if (!(await importData(pending))) throw new Error("rejected");
      // Full reload on purpose: every screen re-reads the imported data.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch {
      setBusy(false);
      setPending(null);
      setError("Не получилось импортировать файл. Данные не изменены.");
    }
  }

  async function onExport() {
    setError(null);
    try {
      downloadJson(await exportData(), exportFileName());
    } catch {
      setError("Не получилось экспортировать. Попробуйте ещё раз.");
    }
  }

  async function onDemo() {
    setError(null);
    setBusy(true);
    try {
      if (dataKind === "demo") await clearDemo();
      else if (!(await loadDemo())) throw new Error("not empty");
      // Full reload on purpose: every screen re-reads the new data.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch {
      setBusy(false);
      setError("Не получилось. Попробуйте ещё раз.");
    }
  }

  async function onDelete() {
    setError(null);
    setBusy(true);
    try {
      await deleteAllData();
      // Full reload on purpose: drops all in-memory state after data is gone.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/welcome/");
    } catch {
      setBusy(false);
      setError("Не получилось удалить данные. Попробуйте ещё раз.");
    }
  }

  const row = "flex min-h-[50px] w-full items-center gap-3 px-4 py-2.5 text-left text-[17px] active:bg-pressed";
  const icon = (bg: string) => `grid size-[30px] shrink-0 place-items-center rounded-[7px] text-white ${bg}`;

  return (
    <div className="space-y-7">
      {error && (
        <p role="alert" className="px-4 text-[15px] font-medium text-danger">
          {error}
        </p>
      )}

      <Group id="s-profile" title="Профиль" footer={`Согласие дано: ${consentDate(profile.consentAt)}`}>
        <div className="p-4">
          <ChoiceField legend="Сейчас я" name="mode" value={profile.mode} options={MODES} onChange={changeMode} columns={2} />
          <p role="status" className="text-[13px] text-link empty:hidden">
            {saved ? "Сохранено" : ""}
          </p>
        </div>
      </Group>

      <ReminderCard />

      <Group
        id="s-export"
        title="Перенос данных"
        footer="Экспорт — файл JSON со всеми отметками, заметками и настройками. Он не зашифрован — храните его осторожно. Импорт на другом телефоне перенесёт всё без аккаунта."
      >
        <a href="/privacy/" className={row}>
          <span className={icon("bg-leaf")}>
            <ShieldCheck aria-hidden size={18} />
          </span>
          <span className="flex-1 text-ink">Политика конфиденциальности</span>
        </a>
        <button type="button" onClick={onExport} className={row}>
          <span className={icon("bg-accent")}>
            <Download aria-hidden size={18} />
          </span>
          <span className="flex-1 text-ink">Экспорт данных</span>
        </button>
        <label className={`${row} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent`}>
          <span className={icon("bg-s-sleep")}>
            <Upload aria-hidden size={18} />
          </span>
          <span className="flex-1 text-ink">Импорт данных</span>
          <input type="file" accept="application/json,.json" onChange={onPickFile} className="sr-only" />
        </label>
        {(dataKind === "empty" || dataKind === "demo") && (
          <button type="button" disabled={busy} onClick={onDemo} className={`${row} disabled:opacity-50`}>
            <span className={icon("bg-[#ff9f0a]")}>
              <Presentation aria-hidden size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-ink">{dataKind === "demo" ? "Убрать демо-данные" : "Показать демо-данные"}</span>
              <span className="block text-[13px] text-muted">
                {dataKind === "demo" ? "Ваши собственные отметки останутся" : `Пример за ${DEMO_DAYS} день с пометкой «демо-данные»`}
              </span>
            </span>
          </button>
        )}
      </Group>

      {pending !== null && (
        <div role="group" aria-labelledby="s-import-confirm" className="rounded-card-lg bg-surface p-4">
          <p id="s-import-confirm" className="text-[17px] font-semibold text-ink">
            Заменить текущие данные данными из файла?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => setPending(null)} className={`${btnSecondary} disabled:opacity-50`}>
              Отмена
            </button>
            <button type="button" disabled={busy} onClick={onImport} className={btnDangerSolid}>
              Да, заменить
            </button>
          </div>
        </div>
      )}

      <Group id="s-delete" title="Удаление" footer="Удалит отметки, тесты, привычки, эксперименты и профиль с этого устройства.">
        {!confirming ? (
          <button ref={deleteRef} type="button" onClick={() => setConfirming(true)} className={`${row} justify-center font-medium text-danger`}>
            Удалить все данные
          </button>
        ) : (
          <div role="group" aria-labelledby="s-confirm" className="p-4">
            <p id="s-confirm" className="text-[17px] font-semibold text-ink">
              Удалить всё без возможности восстановления?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button ref={cancelRef} type="button" disabled={busy} onClick={() => setConfirming(false)} className={`${btnSecondary} disabled:opacity-50`}>
                Отмена
              </button>
              <button type="button" disabled={busy} onClick={onDelete} className={btnDangerSolid}>
                Да, удалить
              </button>
            </div>
          </div>
        )}
      </Group>

      <Group id="s-about" title="Поддержка" footer="Не является медицинской консультацией.">
        {HELP_LINES.map((l) => (
          <a key={l.phone} href={`tel:${l.phone}`} className={row}>
            <span className="w-12 text-[20px] font-bold text-link tabular-nums">{l.phone}</span>
            <span className="flex-1 text-[15px] text-ink">{l.label}</span>
          </a>
        ))}
        <p className="px-4 py-3 text-[15px] text-ink">или психолог вашего вуза</p>
      </Group>
    </div>
  );
}

/** iOS-style settings group: small header, white rows, muted footer. */
function Group({ id, title, footer, children }: { id: string; title: string; footer?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="px-4 pb-1.5 text-[13px] text-muted uppercase">
        {title}
      </h2>
      <div className="group-list">{children}</div>
      {footer && <p className="px-4 pt-1.5 text-[13px] leading-snug text-muted">{footer}</p>}
    </section>
  );
}
