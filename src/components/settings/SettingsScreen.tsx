"use client";

import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChoiceField, btnSecondary } from "@/components/ui/controls";
import { HELP_LINES } from "@/lib/crisis";
import { deleteAllData, downloadJson, exportData, exportFileName } from "@/lib/privacy";
import { MODE_LABEL, getProfile, updateMode, type Mode, type Profile } from "@/lib/settings";

const MODES = (Object.keys(MODE_LABEL) as Mode[]).map((value) => ({ value, label: MODE_LABEL[value] }));

const btnDanger =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-danger bg-card px-6 font-semibold text-danger transition-colors hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-50";
const btnDangerSolid =
  "inline-flex min-h-12 items-center justify-center rounded-2xl bg-danger px-6 font-semibold text-white transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50";

const consentDate = (t: number) =>
  new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

export function SettingsScreen() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    let alive = true;
    getProfile()
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfile(null));
    return () => {
      alive = false;
    };
  }, []);

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

  async function onExport() {
    setError(null);
    try {
      downloadJson(await exportData(), exportFileName());
    } catch {
      setError("Не получилось экспортировать. Попробуйте ещё раз.");
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

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <section aria-labelledby="s-profile" className="card p-5">
        <h2 id="s-profile" className="mb-4 font-display text-lg font-extrabold text-ink">
          Профиль
        </h2>
        <ChoiceField legend="Сейчас я" name="mode" value={profile.mode} options={MODES} onChange={changeMode} columns={2} />
        <p role="status" className="mt-2 min-h-5 text-sm text-navy">
          {saved ? "Сохранено" : ""}
        </p>
        <p className="text-sm text-muted">Согласие дано: {consentDate(profile.consentAt)}</p>
      </section>

      <section aria-labelledby="s-privacy" className="card p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden className="mt-0.5 shrink-0 text-navy" size={24} />
          <div>
            <h2 id="s-privacy" className="font-display text-lg font-extrabold text-ink">
              Приватность
            </h2>
            <p className="mt-1 text-muted">
              Все данные хранятся только на этом устройстве. Мы их не видим и никуда не отправляем.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="s-export" className="card p-5">
        <h2 id="s-export" className="font-display text-lg font-extrabold text-ink">
          Экспорт данных
        </h2>
        <p className="mt-1 text-sm text-muted">
          Файл JSON со всеми отметками, заметками, тестами и настройками. Сохраняется на это устройство.
          Файл не зашифрован — храните его осторожно.
        </p>
        <button type="button" onClick={onExport} className={`${btnSecondary} mt-4 gap-2`}>
          <Download aria-hidden size={20} />
          Экспорт данных
        </button>
      </section>

      <section aria-labelledby="s-delete" className="card p-5">
        <h2 id="s-delete" className="font-display text-lg font-extrabold text-ink">
          Удалить все данные
        </h2>
        <p className="mt-1 text-sm text-muted">
          Удалит отметки, тесты, эксперименты и профиль с этого устройства.
        </p>
        {!confirming ? (
          <button ref={deleteRef} type="button" onClick={() => setConfirming(true)} className={`${btnDanger} mt-4`}>
            <Trash2 aria-hidden size={20} />
            Удалить все данные
          </button>
        ) : (
          <div role="group" aria-labelledby="s-confirm" className="mt-4 rounded-2xl bg-soft p-4">
            <p id="s-confirm" className="font-semibold text-ink">
              Удалить всё без возможности восстановления?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                ref={cancelRef}
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className={`${btnSecondary} disabled:opacity-50`}
              >
                Отмена
              </button>
              <button type="button" disabled={busy} onClick={onDelete} className={btnDangerSolid}>
                Да, удалить
              </button>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="s-about" className="card p-5">
        <h2 id="s-about" className="font-display text-lg font-extrabold text-ink">
          О приложении
        </h2>
        <p className="mt-1 font-medium text-ink">Не является медицинской консультацией.</p>
        <p className="mt-2 text-sm text-muted">Если тяжело, поговорить можно бесплатно:</p>
        <ul className="mt-2 space-y-1">
          {HELP_LINES.map((l) => (
            <li key={l.phone}>
              <a
                href={`tel:${l.phone}`}
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-navy underline underline-offset-4"
              >
                <span className="font-display text-xl font-extrabold">{l.phone}</span>
                <span className="text-sm font-medium text-ink">{l.label}</span>
              </a>
            </li>
          ))}
          <li className="text-sm text-ink">или психолог вашего вуза</li>
        </ul>
      </section>
    </div>
  );
}
