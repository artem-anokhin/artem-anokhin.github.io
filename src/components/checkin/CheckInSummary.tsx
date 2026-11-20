import { CircleCheck, Pencil } from "lucide-react";
import { CrisisCard } from "@/components/CrisisCard";
import { btnSecondary } from "@/components/ui/controls";
import {
  ACTIVITY_OPTIONS,
  FOOD_OPTIONS,
  REST_OPTIONS,
  formatHours,
  sleepHours,
  type CheckInData,
} from "@/lib/checkin";
import { hasCrisisWording } from "@/lib/crisis";
import type { Mode } from "@/lib/settings";

const label = <T extends string>(opts: readonly { value: T; label: string }[], v: T) =>
  opts.find((o) => o.value === v)?.label ?? "—";

export function summaryRows(d: CheckInData, mode: Mode): [string, string][] {
  return [
    ["Сон", `${formatHours(sleepHours(d.sleep.bedtime, d.sleep.wake))}, качество ${d.sleep.quality}/5`],
    ["Питание", `${d.food.breakfast ? "с завтраком" : "без завтрака"}, ${label(FOOD_OPTIONS, d.food.regularity).toLowerCase()}`],
    [
      "Кофеин и вода",
      `${d.caffeine.cups} чаш.${d.caffeine.lastAt ? ` (последняя в ${d.caffeine.lastAt})` : ""}, вода ${d.caffeine.water} стак.`,
    ],
    ["Психосостояние", `стресс ${d.mind.stress}/5, настроение ${d.mind.mood}/5`],
    ["Активность", label(ACTIVITY_OPTIONS, d.activity.level) + (d.activity.note ? ` — ${d.activity.note}` : "")],
    [mode === "work" ? "Работа" : "Учёба", `${formatHours(d.work.hours)}, сложность ${d.work.difficulty}/5`],
    ["Отдых", label(REST_OPTIONS, d.rest.type)],
  ];
}

export function CheckInSummary({
  data,
  mode,
  onEdit,
}: {
  data: CheckInData;
  mode: Mode;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-4">
      <section className="card p-5 md:p-6" aria-labelledby="done-title">
        <div className="mb-4 flex items-center gap-2">
          <CircleCheck aria-hidden className="text-leaf" size={26} />
          <h2 id="done-title" className="font-display text-xl font-extrabold text-navy">
            Сегодня отмечено
          </h2>
        </div>
        <dl className="divide-y divide-line">
          {summaryRows(data, mode).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-sm text-muted">{k}</dt>
              <dd className="font-medium text-ink sm:text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {data.note && (
          <p className="mt-4 rounded-2xl bg-soft p-4 text-sm whitespace-pre-wrap text-ink">{data.note}</p>
        )}
        <button type="button" className={`${btnSecondary} mt-5 w-full gap-2`} onClick={onEdit}>
          <Pencil aria-hidden size={18} /> Изменить
        </button>
      </section>
      {hasCrisisWording(`${data.note} ${data.activity.note}`) && <CrisisCard />}
    </div>
  );
}
