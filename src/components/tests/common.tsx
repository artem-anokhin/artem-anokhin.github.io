/** Night full-screen shell shared by the mini-tests. */
export function NightShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="night min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-5 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(20px+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

/** Tiny trend line of past results (last 12), latest dot highlighted. */
export function Sparkline({ values, label, night = true, width = 220, height = 56 }: { values: number[]; label: string; night?: boolean; width?: number; height?: number }) {
  const v = values.slice(-12);
  if (v.length < 2) return null;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const span = max - min || 1;
  const x = (i: number) => 6 + (i * (width - 12)) / (v.length - 1);
  const y = (n: number) => height - 6 - ((n - min) / span) * (height - 12);
  const d = v.map((n, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join(" ");
  const stroke = night ? "#7EA2FF" : "var(--color-accent)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}: ${v.join(", ")}`}>
      <path d={d} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <circle cx={x(v.length - 1)} cy={y(v.at(-1)!)} r={4.5} fill={stroke} />
    </svg>
  );
}
