/**
 * Detects crisis / self-harm wording in a free-text note so the UI can show
 * a calm help card (CLAUDE.md §4). It never blocks saving and never diagnoses.
 * Runs locally only. False positives are acceptable; the card is gentle.
 */

const PATTERNS: readonly RegExp[] = [
  /суицид/,
  /самоубийств/,
  /покончить\s+с\s+(собой|жизнью)/,
  /(убить|убью|убиваю)\s+себя/,
  /(не\s+хочу|не\s+хочется|нет\s+сил|не\s+могу)\s+(больше\s+)?жить/,
  /(незачем|не\s+для\s+чего)\s+жить/,
  /себя\s+(убить|убью)/,
  /(хочу|хочется)\s+исчезнуть/,
  /вскрыть\s+вены/,
  /наложить\s+на\s+себя\s+руки/,
  /не\s+хочу\s+(больше\s+)?просыпаться/,
  /жить\s+не\s+(хочу|хочется)/,
  /(хочу|хочется)\s+(умереть|исчезнуть\s+навсегда)/,
  /(нет|не\s+вижу)\s+смысла\s+жить/,
  /лучше\s+бы\s+меня\s+не\s+было/,
  /(порезать|порезал\p{L}*|режу|резал\p{L}*|резать|ранить)\s+себ/u,
  /(причинить|причиняю)\s+себе\s+(вред|боль)/,
  /селф\s?харм/,
  /пове(ситься|шусь|сился|силась)/,
  /(выпрыгнуть|прыгнуть|спрыгнуть)\s+(из\s+окна|с\s+крыши|с\s+моста)/,
  /\bsuicid/,
  /kill\s+myself/,
  /self[-\s]?harm/,
  /want\s+to\s+die/,
];

/** Lowercase, ё→е, punctuation → spaces, so «не хочу... жить» still matches. */
export function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ")} `;
}

export function hasCrisisWording(text: string): boolean {
  if (!text) return false;
  const t = normalize(text);
  return PATTERNS.some((re) => re.test(t));
}

/** Help lines in Kazakhstan — source: docs/sources.md (re-check before release). */
export const HELP_LINES = [
  { phone: "111", label: "Контакт-центр, круглосуточно и анонимно" },
  { phone: "150", label: "Линия для детей и молодёжи" },
] as const;
