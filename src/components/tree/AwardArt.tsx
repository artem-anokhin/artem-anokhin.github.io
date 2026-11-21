import type { JSX } from "react";
import type { AwardId } from "@/lib/awards";

type Sphere = "sleep" | "food" | "caffeine" | "mind" | "activity" | "work" | "rest";

/** Colors used by a drawing: m = main, k = ink (dark accent), w = light detail, b = background. */
type Ink = { m: string; k: string; w: string; b: string };

const SPHERE: Record<AwardId, Sphere> = {
  "first-checkin": "work",
  "week-checkins": "work",
  "month-checkins": "caffeine",
  "first-session": "activity",
  "five-hours": "rest",
  "twenty-hours": "sleep",
  "calm-five": "sleep",
  "ten-tests": "food",
  "habit-ten": "activity",
  bloom: "mind",
  "first-goal": "mind",
  "night-owl": "sleep",
  "early-bird": "rest",
  marathon: "food",
  "hat-trick": "activity",
  together: "mind",
  "answer-42": "work",
};

const R = { strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;

function art(id: AwardId, c: Ink): JSX.Element {
  switch (id) {
    case "first-checkin":
      return (
        <g fill={c.m}>
          <path d="M17 24c0-6 3-10 7-10s6 4 5 9l-2 9c-1 4-9 4-10 0z" />
          <ellipse cx="24" cy="35.5" rx="4.5" ry="3" fill={c.k} />
          <circle cx="31.5" cy="15" r="2" />
          <circle cx="33" cy="19.5" r="1.6" />
          <circle cx="28" cy="11.5" r="2.2" />
        </g>
      );
    case "week-checkins":
      return (
        <g>
          <rect x="12" y="13" width="24" height="23" rx="4" fill={c.w} stroke={c.m} strokeWidth="2" />
          <path d="M12 17a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v3H12z" fill={c.m} />
          <path d="M18 10v5M30 10v5" stroke={c.k} strokeWidth="2.5" {...R} />
          <g fill={c.m}>
            {[0, 1, 2, 3].map((i) => <circle key={i} cx={16.5 + i * 5} cy="25" r="1.8" />)}
            {[0, 1, 2].map((i) => <circle key={i} cx={16.5 + i * 5} cy="31" r="1.8" />)}
          </g>
          <circle cx="31.5" cy="31" r="2.2" fill={c.k} />
        </g>
      );
    case "month-checkins":
      return (
        <g>
          <path d="M13 31c0-9 7-15 16-15 0 9-6 15-16 15z" fill={c.m} />
          <path d="M14 30l10-9" stroke={c.w} strokeWidth="1.5" {...R} />
          <circle cx="26" cy="22" r="8" fill={c.w} fillOpacity="0.35" stroke={c.k} strokeWidth="2.5" />
          <path d="M32 28l5 5" stroke={c.k} strokeWidth="2.5" {...R} />
        </g>
      );
    case "first-session":
      return (
        <g>
          <ellipse cx="24" cy="34" rx="6" ry="4" fill={c.k} />
          <path d="M24 31v-9" stroke={c.m} strokeWidth="2.5" {...R} />
          <path d="M24 23c-1-5-5-7-10-6 1 5 5 7 10 6z" fill={c.m} />
          <path d="M24 21c1-5 5-7 10-6-1 5-5 7-10 6z" fill={c.m} />
        </g>
      );
    case "five-hours":
      return (
        <g>
          <path d="M16 12h16M16 36h16" stroke={c.k} strokeWidth="2.5" {...R} />
          <path d="M18 12c0 7 12 8 12 12s-12 5-12 12M30 12c0 7-12 8-12 12s12 5 12 12" stroke={c.m} strokeWidth="2" {...R} />
          <path d="M20.5 35c1-3 6-3 7 0zM21 16h6c-1 2-5 2-6 0z" fill={c.m} />
        </g>
      );
    case "twenty-hours":
      return (
        <g>
          <path d="M8 36l12-17 5 6 4-5 11 16z" fill={c.m} />
          <path d="M17 23.5l3-4.5 3 4z" fill={c.w} />
          <path d="M20 19v-9" stroke={c.k} strokeWidth="2" {...R} />
          <path d="M20 10h7l-2 2.5 2 2.5h-7z" fill={c.k} />
        </g>
      );
    case "calm-five":
      return (
        <g>
          <path d="M27 11a8 8 0 1 0 6 13 9 9 0 0 1-6-13z" fill={c.m} />
          <path d="M10 33c3-3 5-3 7 0s4 3 7 0 5-3 7 0 4 3 7 0" stroke={c.k} strokeWidth="2.5" {...R} />
        </g>
      );
    case "ten-tests":
      return <path d="M27 9L14 27h9l-3 12 14-19h-9z" fill={c.m} stroke={c.k} strokeWidth="1.5" strokeLinejoin="round" />;
    case "habit-ten":
      return (
        <g>
          <ellipse cx="24" cy="33" rx="11" ry="4.5" fill={c.k} />
          <ellipse cx="24" cy="25" rx="8" ry="3.8" fill={c.m} />
          <ellipse cx="24" cy="18" rx="5" ry="3" fill={c.k} />
          <path d="M21 16.5h3" stroke={c.w} strokeWidth="1.2" {...R} />
        </g>
      );
    case "bloom":
      return (
        <g>
          <g fill={c.m}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="24" cy="15.5" rx="5" ry="7" transform={`rotate(${a} 24 24)`} />
            ))}
          </g>
          <circle cx="24" cy="24" r="4.5" fill={c.k} />
        </g>
      );
    case "first-goal":
      return (
        <g>
          <circle cx="22" cy="26" r="12" fill={c.m} />
          <circle cx="22" cy="26" r="8" fill={c.w} />
          <circle cx="22" cy="26" r="4" fill={c.m} />
          <path d="M22 26L36 12" stroke={c.k} strokeWidth="2.5" {...R} />
          <path d="M33 10l3 2 2 3M31 12l5 0M36 12v5" stroke={c.k} strokeWidth="2" {...R} />
        </g>
      );
    case "night-owl":
      return (
        <g>
          <path d="M12 14l6 4h12l6-4v14a12 12 0 0 1-24 0z" fill={c.m} />
          <circle cx="19" cy="25" r="5" fill={c.w} />
          <circle cx="29" cy="25" r="5" fill={c.w} />
          <circle cx="19.5" cy="25.5" r="2.3" fill={c.k} />
          <circle cx="28.5" cy="25.5" r="2.3" fill={c.k} />
          <path d="M22 31l2 3 2-3z" fill={c.k} />
        </g>
      );
    case "early-bird":
      return (
        <g>
          <path d="M9 36a15 15 0 0 1 30 0z" fill={c.m} />
          <path d="M24 17v-4M14 21l-2.5-3M34 21l2.5-3" stroke={c.m} strokeWidth="2" {...R} />
          <path d="M17 26c2-4 7-5 10-2l4-1-2 3c0 3-3 5-7 5l-5-2 3-1z" fill={c.k} />
          <circle cx="25.5" cy="25" r="1" fill={c.w} />
        </g>
      );
    case "marathon":
      return (
        <g>
          <path d="M15 20c3 1 6 1 8-1l5 7 9 3c2 1 2 5 0 5H15c-2 0-2-2-2-3z" fill={c.m} />
          <path d="M13 32h25" stroke={c.k} strokeWidth="2.5" {...R} />
          <path d="M22 23l2-1M24 26l2-1" stroke={c.w} strokeWidth="1.5" {...R} />
          <path d="M6 22h5M5 27h6M7 32h3" stroke={c.k} strokeWidth="2" {...R} />
        </g>
      );
    case "hat-trick":
      return (
        <g>
          {[13, 24, 35].map((x) => (
            <g key={x}>
              <path d={`M${x - 4} 24h8v2a4 5 0 0 1-8 0z`} fill={c.m} />
              <path d={`M${x - 5} 24a5 4 0 0 1 10 0z`} fill={c.k} />
              <path d={`M${x} 20v-2`} stroke={c.k} strokeWidth="1.5" {...R} />
            </g>
          ))}
        </g>
      );
    case "together":
      return (
        <g>
          <path d="M23 36c-8-2-12-10-9-20 7 3 10 11 9 20z" fill={c.m} />
          <path d="M25 36c8-2 12-10 9-20-7 3-10 11-9 20z" fill={c.k} />
          <path d="M22 34c-1-5-3-9-6-13M26 34c1-5 3-9 6-13" stroke={c.w} strokeWidth="1.2" {...R} />
        </g>
      );
    case "answer-42":
      return (
        <g>
          <path d="M24 24c0-3 4-3 4 0 0 5-8 5-8 0 0-7 12-7 12 0 0 9-16 9-16 0 0-11 20-11 20 0" stroke={c.m} strokeWidth="2.2" {...R} />
          <text x="24" y="40.5" textAnchor="middle" fontSize="7" fontWeight="800" fill={c.k} fontFamily="Inter, sans-serif">
            42
          </text>
        </g>
      );
    default: {
      const never: never = id;
      return never;
    }
  }
}

export function AwardArt({
  id,
  done,
  secret,
  size = 48,
}: {
  id: AwardId;
  done: boolean;
  secret?: boolean;
  size?: number;
}): JSX.Element {
  if (!done && secret) {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
        <circle cx="24" cy="24" r="24" fill="var(--color-fill)" />
        <path d="M18 18a6 6 0 1 1 9 5c-2 1.2-3 2.5-3 4.5v1.5" stroke="var(--color-chevron)" strokeWidth="4" {...R} />
        <circle cx="24" cy="35" r="2.5" fill="var(--color-chevron)" />
      </svg>
    );
  }
  const s = SPHERE[id];
  const c: Ink = done
    ? { m: `var(--color-s-${s})`, k: `var(--color-s-${s}-ink)`, w: "#fff", b: `var(--color-s-${s}-tint)` }
    : { m: "var(--color-fill-strong)", k: "var(--color-fill-strong)", w: "var(--color-fill)", b: "var(--color-fill)" };
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill={c.b} />
      {art(id, c)}
    </svg>
  );
}
