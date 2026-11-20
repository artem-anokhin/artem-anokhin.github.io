import { useId } from "react";

/**
 * Flat SVG tree, 5 stages (семя → цветёт). Transparent background: the scene
 * (sky, hills) is drawn by TreeScene. Crown sways gently (CSS, reduced-motion safe).
 */

const DEEP = "#3F9A4A";
const LEAF = "#5DB55A";
const LIGHT = "#83CF6E";
const SHINE = "#A6E08E";
const TRUNK = "#A9774F";
const TRUNK_DARK = "#8A5E3B";
const BLOOM = "#F49AC1";
const BLOOM_DARK = "#E2799F";
const POLLEN = "#FFC75A";

/** Leaf pointing right from (0,0), length 30. */
const LEAF_PATH = "M0 0 C 8 -11, 22 -11, 30 0 C 22 9, 8 9, 0 0 Z";

function Leaf({ x, y, r, s = 1, fill = LIGHT }: { x: number; y: number; r: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d={LEAF_PATH} fill={fill} />
      <path d="M3 0 H26" stroke={DEEP} strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

function Flower({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-5" rx="3.6" ry="5.2" fill={a % 144 ? BLOOM : BLOOM_DARK} transform={`rotate(${a})`} />
      ))}
      <circle r="2.6" fill={POLLEN} />
    </g>
  );
}

const CROWN_BACK: [number, number, number][] = [
  [100, 96, 46],
  [62, 116, 32],
  [138, 116, 32],
];
const CROWN_MID: [number, number, number][] = [
  [78, 84, 30],
  [122, 84, 30],
  [100, 64, 30],
  [84, 122, 26],
  [118, 124, 26],
];
const CROWN_SHINE: [number, number, number][] = [
  [88, 62, 12],
  [114, 70, 10],
  [70, 96, 9],
];
const FLOWERS: [number, number, number][] = [
  [72, 98, 1],
  [96, 58, 1.1],
  [130, 92, 1],
  [110, 122, 0.9],
  [80, 128, 0.85],
  [140, 116, 0.8],
  [104, 88, 1],
  [62, 118, 0.8],
];

export function TreeSvg({ stage, wilting, title }: { stage: number; wilting: boolean; title: string }) {
  const titleId = useId();
  // Wilting: crown sits a little lower and colors soften. No grey or brown — never punishing.
  const leaf = wilting ? LIGHT : LEAF;
  const back = wilting ? LEAF : DEEP;
  const droop = wilting ? 6 : 0;
  const sway = wilting ? "" : "animate-sway";
  const swayStyle = { transformBox: "fill-box", transformOrigin: "50% 100%" } as const;

  return (
    <svg viewBox="0 0 200 220" role="img" aria-labelledby={titleId} className="mx-auto h-auto w-full max-w-[280px]">
      <title id={titleId}>{title}</title>
      {/* ground shadow + soil mound */}
      <ellipse cx="100" cy="206" rx="70" ry="8" fill="#1F6B35" opacity="0.14" />
      <path d="M58 206 C 70 190, 130 190, 142 206 Z" fill={TRUNK} />
      <path d="M70 204 C 82 196, 118 196, 130 204" stroke={TRUNK_DARK} strokeOpacity="0.4" strokeWidth="3" fill="none" strokeLinecap="round" />

      {stage === 0 && (
        <g>
          <ellipse cx="100" cy="192" rx="10" ry="7" fill={TRUNK_DARK} />
          <ellipse cx="97" cy="190" rx="3" ry="2" fill="#C99A72" />
          <path d="M100 186 C 100 180, 104 177, 108 176" stroke={LIGHT} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}

      {stage === 1 && (
        <g className={sway} style={swayStyle} transform={`translate(0 ${droop / 2})`}>
          <path d="M100 196 C 100 180, 98 168, 101 152" stroke={LEAF} strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <Leaf x={100} y={160} r={-150} s={0.9} />
          <Leaf x={101} y={154} r={-30} s={1} fill={leaf} />
        </g>
      )}

      {stage === 2 && (
        <g>
          <path d="M97 200 C 98 170, 99 140, 100 112 L 103 112 C 103 140, 104 170, 105 200 Z" fill={TRUNK} />
          <g className={sway} style={swayStyle} transform={`translate(0 ${droop})`}>
            <circle cx="101" cy="112" r="22" fill={back} />
            <Leaf x={100} y={150} r={-160} fill={leaf} />
            <Leaf x={102} y={142} r={-20} />
            <Leaf x={100} y={128} r={-155} />
            <Leaf x={102} y={120} r={-25} fill={leaf} />
            <Leaf x={101} y={104} r={-90} s={0.9} />
            <circle cx="94" cy="104" r="7" fill={SHINE} opacity="0.8" />
          </g>
        </g>
      )}

      {stage >= 3 && (
        <g>
          <path d="M90 202 C 94 170, 95 140, 95 112 L 105 112 C 105 140, 106 170, 110 202 Z" fill={TRUNK} />
          <path d="M99 150 C 90 138, 80 130, 72 124 M101 140 C 110 128, 120 120, 128 116" stroke={TRUNK} strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M104 196 C 104 176, 103 150, 102 124" stroke={TRUNK_DARK} strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" />
          <g className={sway} style={swayStyle} transform={`translate(0 ${droop})`}>
            {CROWN_BACK.map(([cx, cy, r], i) => (
              <circle key={`b${i}`} cx={cx} cy={cy} r={r} fill={back} />
            ))}
            {CROWN_MID.map(([cx, cy, r], i) => (
              <circle key={`m${i}`} cx={cx} cy={cy} r={r} fill={i % 2 ? LIGHT : leaf} />
            ))}
            {CROWN_SHINE.map(([cx, cy, r], i) => (
              <circle key={`s${i}`} cx={cx} cy={cy} r={r} fill={SHINE} opacity="0.75" />
            ))}
            {stage === 4 && !wilting && FLOWERS.map(([x, y, s], i) => <Flower key={i} x={x} y={y} s={s} />)}
          </g>
        </g>
      )}
    </svg>
  );
}
