import { useId } from "react";

/** Flat SVG tree, 5 stages. No gradients or shadows. Colors from the design tokens. */

const LEAF = "#5DB55A";
const LEAF_LIGHT = "#83CF6E";
const TRUNK = "#A9774F";
const SOIL_DARK = "#8A5E3B";
const BLOOM = "#F49AC1";

const LEAF_SPOTS: [number, number, number][] = [
  [-24, 0, -35],
  [24, -14, 35],
  [-22, -30, -30],
  [22, -44, 30],
  [0, -58, 0],
];

const CROWN: [number, number, number][] = [
  [100, 92, 42],
  [66, 112, 30],
  [134, 112, 30],
  [82, 68, 28],
  [120, 70, 28],
];

const FLOWERS: [number, number][] = [
  [70, 100],
  [96, 64],
  [128, 92],
  [112, 124],
  [80, 128],
  [138, 120],
  [104, 90],
];

export function TreeSvg({ stage, wilting, title }: { stage: number; wilting: boolean; title: string }) {
  const titleId = useId();
  // Wilting: same shapes, crown sits a little lower and leaves are muted. No grey or brown.
  const leaf = wilting ? LEAF_LIGHT : LEAF;
  const droop = wilting ? 6 : 0;
  return (
    <svg viewBox="0 0 200 220" role="img" aria-labelledby={titleId} className="mx-auto h-auto w-full max-w-[280px]">
      <title id={titleId}>{title}</title>
      {/* soil */}
      <ellipse cx="100" cy="204" rx="78" ry="12" fill={TRUNK} />
      <ellipse cx="100" cy="200" rx="54" ry="6" fill={SOIL_DARK} opacity="0.35" />

      {stage === 0 && <ellipse cx="100" cy="192" rx="9" ry="6" fill={SOIL_DARK} />}

      {stage === 1 && (
        <g transform={`translate(0 ${droop / 2})`}>
          <path d="M100 198 V160" stroke={LEAF} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="88" cy="164" rx="12" ry="6" fill={LEAF_LIGHT} transform="rotate(-30 88 164)" />
          <ellipse cx="112" cy="158" rx="12" ry="6" fill={LEAF_LIGHT} transform="rotate(30 112 158)" />
        </g>
      )}

      {stage === 2 && (
        <g>
          <rect x="96" y="120" width="8" height="80" rx="4" fill={TRUNK} />
          <g transform={`translate(100 ${170 + droop})`}>
            {LEAF_SPOTS.map(([x, y, r], i) => (
              <ellipse key={i} cx={x} cy={y} rx="15" ry="7" fill={i % 2 ? LEAF_LIGHT : leaf} transform={`rotate(${r} ${x} ${y})`} />
            ))}
          </g>
        </g>
      )}

      {stage >= 3 && (
        <g>
          <path d="M92 200 L94 120 H106 L108 200 Z" fill={TRUNK} />
          <path d="M100 150 L76 124 M100 140 L126 116" stroke={TRUNK} strokeWidth="6" strokeLinecap="round" />
          <g transform={`translate(0 ${droop})`}>
            {CROWN.map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill={i === 0 || i === 3 ? leaf : LEAF_LIGHT} />
            ))}
            {stage === 4 &&
              !wilting &&
              FLOWERS.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="6" fill={BLOOM} />)}
          </g>
        </g>
      )}
    </svg>
  );
}
