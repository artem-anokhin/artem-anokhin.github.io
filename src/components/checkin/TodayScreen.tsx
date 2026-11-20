"use client";

import { useEffect, useState } from "react";
import { emptyCheckIn, type CheckInData } from "@/lib/checkin";
import { db, dayKey, saveCheckIn, type CheckIn } from "@/lib/db";
import { getProfile, type Profile } from "@/lib/settings";
import { btnPrimary } from "@/components/ui/controls";
import { TodayOverview } from "@/components/today/TodayOverview";
import { CheckInWizard } from "./CheckInWizard";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; profile: Profile; today: CheckIn | null; prefill: CheckInData; editing: boolean };

/** Strip storage fields so a row can seed the wizard. */
function toData(row: CheckIn): CheckInData {
  const { sleep, food, caffeine, mind, activity, work, rest, note, answered } = row;
  return { sleep, food, caffeine, mind, activity, work, rest, note, ...(answered ? { answered } : {}) };
}

export function TodayScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const profile = await getProfile();
      if (!profile) return; // AppShell redirects to onboarding
      const today = (await db.checkins.get(dayKey())) ?? null;
      // Prefill a new check-in from the latest previous day (minus the private note).
      const last = today ?? (await db.checkins.orderBy("date").last()) ?? null;
      // Values carried over from another day start as "not answered" until the user touches them.
      const prefill = today ? toData(today) : last ? { ...toData(last), note: "", answered: [] } : emptyCheckIn();
      if (alive) setState({ kind: "ready", profile, today, prefill, editing: !today });
    })().catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, [reload]);

  // A tab left open past midnight must show the new day, not yesterday's summary.
  useEffect(() => {
    let loadedFor = dayKey();
    const onVisible = () => {
      if (document.visibilityState === "visible" && dayKey() !== loadedFor) {
        loadedFor = dayKey();
        setReload((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (state.kind === "loading") {
    return <div aria-busy className="card h-80 animate-pulse" />;
  }
  if (state.kind === "error") {
    return (
      <section className="card p-6">
        <p className="text-ink">Не удалось открыть данные на этом устройстве.</p>
        <button type="button" className={`${btnPrimary} mt-4`} onClick={() => setReload((n) => n + 1)}>
          Попробовать ещё раз
        </button>
      </section>
    );
  }

  const { profile, today, prefill, editing } = state;

  if (today && !editing) {
    return (
      <TodayOverview
        data={toData(today)}
        mode={profile.mode}
        onEdit={() => setState({ ...state, prefill: toData(today), editing: true })}
      />
    );
  }

  return (
    <>
      {!today && <p className="mb-2 font-medium text-navy">Начнём? Это займёт минуту.</p>}
      <CheckInWizard
        key={today?.updatedAt ?? "new"}
        initial={prefill}
        mode={profile.mode}
        onSave={async (data) => {
          const row = await saveCheckIn(data);
          setState({ ...state, today: row, prefill: toData(row), editing: false });
        }}
      />
    </>
  );
}
