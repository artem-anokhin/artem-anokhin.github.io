import type { SphereKey } from "./checkin";

export interface HabitIdea {
  id: string;
  title: string;
  why: string;
  sphere: SphereKey;
  source: string;
  url: string;
}

const AASM = "AASM/SRS";
const AASM_URL = "https://pmc.ncbi.nlm.nih.gov/articles/PMC4434546/";
const VAN_DONGEN = "Van Dongen et al., 2003";
const VAN_DONGEN_URL = "https://Www.Gwern.net/doc/melatonin/2003-vandongen.pdf";
const NSF = "National Sleep Foundation";
const NSF_URL = "https://pubmed.ncbi.nlm.nih.gov/29073412/";
const DRAKE = "Drake et al., 2013";
const DRAKE_URL = "https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807";
const FDA = "FDA";
const FDA_URL =
  "https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much";
const BREAKFAST = "Обзор о завтраке (45 исследований)";
const BREAKFAST_URL = "https://eprints.whiterose.ac.uk/id/eprint/100495/";
const HYDRATION = "Мета-анализ обезвоживания (Georgia Tech)";
const HYDRATION_URL =
  "https://www.news.gatech.edu/2018/07/16/we-get-parched-cognition-can-sputter-dehydration-study-says";
const EXERCISE = "Мета-анализ острой активности (79 исследований)";
const EXERCISE_URL = "https://pubmed.ncbi.nlm.nih.gov/22480735/";
const STRESS = "Мета-анализ острого стресса";
const STRESS_URL = "https://pubmed.ncbi.nlm.nih.gov/27371161/";
const MICRO = "Мета-анализ микро-перерывов";
const MICRO_URL = "https://pubmed.ncbi.nlm.nih.gov/36044424/";
const PHONE = "UT Austin, 2017";
const PHONE_URL = "https://news.utexas.edu/2017/06/26/the-mere-presence-of-your-smartphone-reduces-brain-power";
const IMPL = "Мета-анализ «если–то» планов (94 исследования)";
const IMPL_URL =
  "https://kops.uni-konstanz.de/server/api/core/bitstreams/eb48c8cf-7855-478e-90ec-1ea6d44f8252/content";

export const HABIT_IDEAS: readonly HabitIdea[] = [
  {
    id: "sleep-seven-hours",
    title: "Отбой с запасом на 7 часов",
    why: "Взрослым нужно не меньше 7 часов сна — это связано с вниманием днём.",
    sphere: "sleep",
    source: AASM,
    url: AASM_URL,
  },
  {
    id: "sleep-range",
    title: "Сон в пределах 7–9 часов",
    why: "Для молодых взрослых рекомендуют 7–9 часов сна.",
    sphere: "sleep",
    source: NSF,
    url: NSF_URL,
  },
  {
    id: "sleep-dont-cut",
    title: "Не урезать сон ради дел",
    why: "Недосып связан со спадом внимания, хотя сами вы этого почти не замечаете.",
    sphere: "sleep",
    source: VAN_DONGEN,
    url: VAN_DONGEN_URL,
  },
  {
    id: "caffeine-earlier",
    title: "Последний кофе — пораньше",
    why: "Кофеин за 6 часов до сна связан с потерей около часа сна.",
    sphere: "caffeine",
    source: DRAKE,
    url: DRAKE_URL,
  },
  {
    id: "caffeine-count",
    title: "Не больше 2–3 чашек кофе",
    why: "До 400 мг кофеина в день (около 2–3 чашек) — ориентир для здоровых взрослых.",
    sphere: "caffeine",
    source: FDA,
    url: FDA_URL,
  },
  {
    id: "breakfast",
    title: "Позавтракать утром",
    why: "Завтрак связан с вниманием и памятью в то же утро (обзор про детей и подростков, данные умеренные).",
    sphere: "food",
    source: BREAKFAST,
    url: BREAKFAST_URL,
  },
  {
    id: "water-daytime",
    title: "Пить воду в течение дня",
    why: "Заметное обезвоживание связано со спадом мышления, сильнее всего — внимания.",
    sphere: "food",
    source: HYDRATION,
    url: HYDRATION_URL,
  },
  {
    id: "move-a-bit",
    title: "Короткая прогулка или зарядка",
    why: "Разовая активность связана с небольшим, но стабильным плюсом для мышления.",
    sphere: "activity",
    source: EXERCISE,
    url: EXERCISE_URL,
  },
  {
    id: "micro-break",
    title: "Перерыв до 10 минут",
    why: "Короткие перерывы связаны с бодростью и меньшей усталостью.",
    sphere: "rest",
    source: MICRO,
    url: MICRO_URL,
  },
  {
    id: "phone-away",
    title: "Телефон подальше от стола",
    why: "Телефон на столе связан с худшими результатами в задачах (повторить удалось лишь отчасти).",
    sphere: "work",
    source: PHONE,
    url: PHONE_URL,
  },
  {
    id: "if-then-plan",
    title: "План «если–то» на день",
    why: "Планы «если–то» связаны с тем, что цели достигаются чаще.",
    sphere: "work",
    source: IMPL,
    url: IMPL_URL,
  },
  {
    id: "stress-pause",
    title: "Заметить стресс и сделать паузу",
    why: "Острый стресс связан с ухудшением рабочей памяти и гибкости мышления.",
    sphere: "mind",
    source: STRESS,
    url: STRESS_URL,
  },
];

export const HABIT_FORMATION: { text: string; source: string; url: string } = {
  text: "Привычка закрепляется в типичном случае за 66 дней (медиана), у разных людей — от 18 до 254. Один пропущенный день её не ломает.",
  source: "Lally, 2010",
  url: "https://core.ac.uk/download/70653523.pdf",
};
