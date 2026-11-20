/**
 * Tip texts for "one tip for tomorrow". Written by content-scientist from docs/sources.md only.
 * Trigger logic lives in src/lib/today.ts; this file holds wording + source per trigger.
 */

export type TipKey =
  | "sleepShort" // slept < 7 h (AASM/SRS ≥ 7 h; NSF 7–9 h)
  | "caffeineLate" // last caffeine < 6 h before bedtime (Drake 2013)
  | "caffeineMuch" // > 3 cups a day (FDA ~400 mg ≈ 2–3 cups)
  | "noBreakfast" // skipped breakfast (breakfast review)
  | "highStress" // stress 4–5 of 5 (acute stress meta-analysis; micro-breaks)
  | "lowActivity" // activity level "minimal" (acute exercise meta-analysis)
  | "noRest" // rest type "none" (micro-breaks meta-analysis)
  | "default"; // nothing above: phone away while studying (UT Austin 2017)

export interface Tip {
  /** Short title, ≤ 40 chars. */
  title: string;
  /** 1–2 sentences, ≤ 200 chars, «вы», no diagnoses, «связано», never «вызывает». */
  text: string;
  /** Short source name as shown to the user. */
  source: string;
  /** URL copied exactly from docs/sources.md. */
  url: string;
}

export const TIPS: Record<TipKey, Tip> = {
  sleepShort: {
    title: "Сон: чуть раньше в постель",
    text: "Взрослым обычно советуют не меньше 7 часов сна. Недосып связан со снижением внимания, а сами люди часто этого не замечают. Завтра, если наступит ваше время отбоя, то отложите телефон и ложитесь.",
    source: "AASM/SRS",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4434546/",
  },
  caffeineLate: {
    title: "Кофеин: раньше вечера",
    text: "В исследовании 400 мг кофеина за 6 часов до сна сократили сон примерно на час. Завтра, если захочется кофе ближе к вечеру, то выберите воду или чай без кофеина.",
    source: "Drake et al., 2013",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807",
  },
  caffeineMuch: {
    title: "Кофеина было много",
    text: "FDA называет безопасной для здоровых взрослых дозу до 400 мг в день, это примерно 2–3 чашки. Завтра, если потянетесь за третьей чашкой, то сначала выпейте стакан воды.",
    source: "FDA",
    url: "https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much",
  },
  noBreakfast: {
    title: "Завтрак перед учёбой",
    text: "Обзор исследований у подростков: завтрак связан с лучшим вниманием и памятью в то же утро, хотя доказательства умеренные. Завтра, если утром мало времени, то возьмите что-то лёгкое с собой.",
    source: "Breakfast review (45 studies)",
    url: "https://eprints.whiterose.ac.uk/id/eprint/100495/",
  },
  highStress: {
    title: "Стресс: короткая пауза",
    text: "Острый стресс связан с ухудшением рабочей памяти и гибкости мышления. Перерывы до 10 минут связаны с бодростью и меньшей усталостью. Завтра, если почувствуете напряжение, то сделайте паузу на несколько минут.",
    source: "Micro-breaks meta-analysis",
    url: "https://pubmed.ncbi.nlm.nih.gov/36044424/",
  },
  lowActivity: {
    title: "Немного движения",
    text: "Метаанализ 79 исследований: разовая физическая активность связана с небольшим, но стабильным плюсом для мышления. Завтра, если будет перерыв между парами, то пройдитесь пешком.",
    source: "Acute exercise meta-analysis",
    url: "https://pubmed.ncbi.nlm.nih.gov/22480735/",
  },
  noRest: {
    title: "Маленькие перерывы",
    text: "Перерывы до 10 минут связаны с бодростью и меньшей усталостью. Завтра, если закончите одну задачу, то сделайте короткую паузу: встаньте, потянитесь, посмотрите в окно.",
    source: "Micro-breaks meta-analysis",
    url: "https://pubmed.ncbi.nlm.nih.gov/36044424/",
  },
  default: {
    title: "Телефон подальше",
    text: "В исследовании телефон на столе был связан с более слабым результатом в заданиях. Повторить результат удалось лишь частично. Завтра, если сядете заниматься, то уберите телефон в сумку.",
    source: "UT Austin, 2017",
    url: "https://news.utexas.edu/2017/06/26/the-mere-presence-of-your-smartphone-reduces-brain-power",
  },
};
