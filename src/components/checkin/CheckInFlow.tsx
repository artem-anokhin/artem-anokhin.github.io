"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { emptyCheckIn, type CheckInData } from "@/lib/checkin";
import { db, dayKey, saveCheckIn, type CheckIn } from "@/lib/db";
import { getProfile, type Profile } from "@/lib/settings";
import { btnPrimary, btnSecondary } from "@/components/ui/controls";
import { DropIcon } from "@/components/ui/visuals";
import { TreeSvg } from "@/components/tree/TreeSvg";
import { STAGES } from "@/lib/tree";
import { loadTree } from "@/lib/garden";
import { CheckInWizard } from "./CheckInWizard";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "wizard"; profile: Profile; prefill: CheckInData; isEdit: boolean }
  | { kind: "done"; isEdit: boolean; stage: number };

/** Strip storage fields so a row can seed the wizard. */
function toData(row: CheckIn): CheckInData {
  const { sleep, food, caffeine, mind, activity, work, rest, note, answered } = row;
  return { sleep, food, caffeine, mind, activity, work, rest, note, ...(answered ? { answered } : {}) };
}

/** /checkin/: full-screen wizard, then a short celebration (+1 капля). */
export function CheckInFlow() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      const profile = await getProfile();
      if (!profile) return; // AppShell redirects to onboarding
      const today = (await db.checkins.get(dayKey())) ?? null;
      // Prefill from the latest previous day (minus the private note); carried values start "not answered".
      const last = today ?? (await db.checkins.orderBy("date").last()) ?? null;
      const prefill = today ? toData(today) : last ? { ...toData(last), note: "", answered: [] } : emptyCheckIn();
      if (alive) setState({ kind: "wizard", profile, prefill, isEdit: !!today });
    })().catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.kind === "loading") return <div aria-busy="true" className="min-h-dvh animate-pulse bg-s-sleep-tint" />;
  if (state.kind === "error") {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="text-ink">Не удалось открыть данные на этом устройстве.</p>
          <Link href="/" className={`${btnPrimary} mt-4`}>
            На главную
          </Link>
        </div>
      </div>
    );
  }
  if (state.kind === "done") return <Done isEdit={state.isEdit} stage={state.stage} />;

  return (
    <CheckInWizard
      initial={state.prefill}
      mode={state.profile.mode}
      onSave={async (data) => {
        const row = await saveCheckIn(data);
        if (!row) {
          // Consent is gone (e.g. data deleted in another tab): back to onboarding.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/welcome/");
          return;
        }
        const tree = await loadTree().catch(() => null);
        setState({ kind: "done", isEdit: state.isEdit, stage: tree?.stage ?? 0 });
      }}
    />
  );
}

function Done({ isEdit, stage }: { isEdit: boolean; stage: number }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 pt-16 pb-[calc(16px+env(safe-area-inset-bottom))] text-center">
      <div className="mx-auto w-full max-w-md flex-1">
        {!isEdit && (
          <p className="inline-flex animate-drop items-center gap-2 rounded-full bg-surface px-4 py-2 text-[15px] font-semibold text-ink">
            <DropIcon size={20} /> +1 капля
          </p>
        )}
        <div className="mx-auto mt-6 w-56 origin-bottom animate-grow">
          <TreeSvg stage={stage} wilting={false} title={`Дерево: ${STAGES[stage]}`} />
        </div>
        <h1 className="title mt-6 text-[28px]" role="status">
          {isEdit ? "Чек-ин обновлён" : "День отмечен"}
        </h1>
        <p className="mt-2 text-[17px] text-muted">
          {isEdit ? "Изменения сохранены только на этом устройстве." : "Ещё 90 секунд — и узнаете свой Focus Score на сегодня."}
        </p>
      </div>
      <div className="mx-auto grid w-full max-w-md gap-3">
        {!isEdit && (
          <Link href="/test/" className={btnPrimary}>
            Пройти тест фокуса
          </Link>
        )}
        <Link href="/" className={btnSecondary}>
          На главную
        </Link>
      </div>
    </div>
  );
}
