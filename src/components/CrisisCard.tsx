import { HeartHandshake } from "lucide-react";
import { HELP_LINES } from "@/lib/crisis";

/** Calm, non-blocking help card (CLAUDE.md §4). */
export function CrisisCard() {
  return (
    <aside role="note" aria-label="Где найти поддержку" className="card border-bloom/60 p-5">
      <div className="flex items-start gap-3">
        <HeartHandshake aria-hidden className="mt-0.5 shrink-0 text-link" size={24} />
        <div>
          <p className="font-semibold text-ink">Похоже, сейчас может быть непросто.</p>
          <p className="mt-1 text-sm text-muted">
            Вы не обязаны справляться в одиночку. Поговорить можно бесплатно:
          </p>
          <ul className="mt-3 space-y-2">
            {HELP_LINES.map((l) => (
              <li key={l.phone}>
                <a
                  href={`tel:${l.phone}`}
                  className="inline-flex min-h-11 items-center gap-2 font-semibold text-link underline underline-offset-4"
                >
                  <span className="font-display text-xl font-extrabold">{l.phone}</span>
                  <span className="text-sm font-medium text-ink">{l.label}</span>
                </a>
              </li>
            ))}
            <li className="text-sm text-ink">или психолог вашего вуза</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
