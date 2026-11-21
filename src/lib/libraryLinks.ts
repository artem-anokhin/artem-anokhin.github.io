import type { CardId } from "./library";
import type { TipKey } from "./tips";

/** Each tip opens the matching knowledge card. */
export const TIP_CARD: Record<TipKey, CardId> = {
  sleepShort: "sleep-hours",
  caffeineLate: "caffeine-timing",
  caffeineMuch: "caffeine-dose",
  noBreakfast: "breakfast",
  highStress: "stress",
  lowActivity: "exercise",
  noRest: "micro-breaks",
  default: "phone",
};

/** Insight metric key → card. Task difficulty has no sourced card; long study days link to micro-breaks, mood to breathing. */
export const METRIC_CARD: Partial<Record<string, CardId>> = {
  sleepHours: "sleep-hours",
  sleepQuality: "sleep-debt",
  breakfast: "breakfast",
  cups: "caffeine-dose",
  caffeineGap: "caffeine-timing",
  water: "water",
  stress: "stress",
  activity: "exercise",
  rest: "micro-breaks",
  mood: "breathing",
  workHours: "micro-breaks",
};

export const cardHref = (id: CardId) => `/library/#${id}`;
