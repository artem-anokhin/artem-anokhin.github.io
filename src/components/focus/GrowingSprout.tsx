import { useId } from "react";

/**
 * Sprout that grows continuously with a focus session's progress (0–1):
 * seed → stem → leaf pairs → bud → flower. Night palette, sways gently.
 * Pure function of `progress`, so it survives reloads and background tabs.
 */

const STEM = "#5DB55A";
const LEAF_A = "#83CF6E";
const LEAF_B = "#5DB55A";
const VEIN = "#2F7A3A";
const SOIL = "#3A2A1E";
const SOIL_TOP = "#5A4130";
const SEED = "#A9774F";
const BLOOM = "#F49AC1";
const BLOOM_DARK = "#E2799F";
const POLLEN = "#FFC75A";

const LEAF_PATH = "M0 0 C 6 -8, 16 -8, 22 0 C 16 6.5, 6 6.5, 0 0 Z";

/** Leaf pairs: when they start growing, where on the stem (0 base – 1 top), max size. */
const LEAVES: { at: number; t: number; s: number }[] = [
  { at: 0.12, t: 0.3, s: 1.15 },
  { at: 0.32, t: 0.55, s: 1 },
  { at: 0.52, t: 0.75, s: 0.85 },
];

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (v: number) => 1 - (1 - v) ** 3;
/** 0→1 over [from, from+span] of progress. */
const ramp = (p: number, from: number, span: number) => easeOut(clamp((p - from) / span));

/** Short phrase for the current phase (changes 5 times per session). */
export function sproutPhase(p: number): string {
  if (p < 0.12) return "Семя просыпается";
  if (p < 0.32) return "Пробивается росток";
  if (p < 0.52) return "Раскрываются листья";
  if (p < 0.72) return "Росток крепнет";
  if (p < 0.9) return "Набирается бутон";
  if (p < 1) return "Скоро распустится";
  return "Распустился";
}

export function GrowingSprout({ progress, className = "" }: { progress: number; className?: string }) {
  const p = clamp(progress);
  const uid = useId().replace(/:/g, "");

  // Stem: quadratic curve from the soil to a top that rises with progress.
  const baseX = 60;
  const baseY = 112;
  const h = 6 + 66 * ramp(p, 0.04, 0.8);
  const topX = baseX + 3;
  const topY = baseY - h;
  const ctrlX = baseX - 7;
  const ctrlY = baseY - h * 0.5;
  const at = (t: number) => ({
    x: (1 - t) ** 2 * baseX + 2 * (1 - t) * t * ctrlX + t ** 2 * topX,
    y: (1 - t) ** 2 * baseY + 2 * (1 - t) * t * ctrlY + t ** 2 * topY,
  });

  const seed = 1 - ramp(p, 0.04, 0.1); // seed shell fades as the stem appears
  const bud = ramp(p, 0.72, 0.16);
  const bloom = ramp(p, 0.9, 0.1);
  const glow = 0.12 + 0.28 * p;

  return (
    <svg viewBox="0 0 120 130" aria-hidden className={className}>
      <defs>
        <radialGradient id={`glow-${uid}`} cx=".5" cy=".55" r=".5">
          <stop offset="0" stopColor="#83CF6E" stopOpacity={glow} />
          <stop offset="1" stopColor="#83CF6E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="74" r="58" fill={`url(#glow-${uid})`} />

      {/* soil */}
      <ellipse cx="60" cy="116" rx="34" ry="7" fill={SOIL} />
      <ellipse cx="60" cy="113.5" rx="28" ry="4" fill={SOIL_TOP} />

      {seed > 0 && <ellipse cx="60" cy="111" rx={5 * (0.6 + 0.4 * seed)} ry={3.6 * (0.6 + 0.4 * seed)} fill={SEED} opacity={seed} />}

      <g className="animate-sway" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        {h > 7 && (
          <path d={`M${baseX} ${baseY} Q ${ctrlX} ${ctrlY} ${topX} ${topY}`} stroke={STEM} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        )}

        {LEAVES.map(({ at: start, t, s }, i) => {
          const g = ramp(p, start, 0.16);
          if (g <= 0) return null;
          const { x, y } = at(t);
          return (
            <g key={i}>
              <g transform={`translate(${x} ${y}) rotate(-28) scale(${g * s})`}>
                <path d={LEAF_PATH} fill={i % 2 ? LEAF_B : LEAF_A} />
                <path d="M2 0 H19" stroke={VEIN} strokeOpacity=".35" strokeWidth="1" strokeLinecap="round" />
              </g>
              <g transform={`translate(${x} ${y}) rotate(-152) scale(${g * s})`}>
                <path d={LEAF_PATH} fill={i % 2 ? LEAF_A : LEAF_B} />
                <path d="M2 0 H19" stroke={VEIN} strokeOpacity=".35" strokeWidth="1" strokeLinecap="round" />
              </g>
            </g>
          );
        })}

        {/* first tiny leaf at the tip while the stem is young */}
        {p > 0.06 && bud < 1 && (
          <g transform={`translate(${topX} ${topY}) rotate(-70) scale(${0.55 * ramp(p, 0.06, 0.1) * (1 - bud)})`}>
            <path d={LEAF_PATH} fill={LEAF_A} />
          </g>
        )}

        {bud > 0 && (
          <g transform={`translate(${topX} ${topY - 3}) scale(1.35)`}>
            {bloom < 1 && <ellipse cx="0" cy="-3" rx={3.4 * bud} ry={5 * bud} fill={BLOOM_DARK} opacity={1 - bloom} />}
            {bloom > 0 &&
              [0, 72, 144, 216, 288].map((a) => (
                <ellipse
                  key={a}
                  cx="0"
                  cy={-6 * bloom}
                  rx={4 * bloom}
                  ry={6 * bloom}
                  fill={a % 144 ? BLOOM : BLOOM_DARK}
                  transform={`rotate(${a})`}
                />
              ))}
            {bloom > 0 && <circle r={3 * bloom} fill={POLLEN} />}
          </g>
        )}
      </g>
    </svg>
  );
}
