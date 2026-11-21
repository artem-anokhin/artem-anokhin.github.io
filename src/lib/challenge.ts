/**
 * «Побей мой результат»: a friend's score travels in the link (`?vs=74`).
 * Only a 0–100 integer, nothing personal. The test opens without onboarding;
 * nothing is stored until consent.
 */
export const CHALLENGE_PATHS = ["/tests/stroop/"] as const;

export function challengeLink(origin: string, score: number): string {
  return `${origin}/tests/stroop/?vs=${Math.round(score)}`;
}

export function parseChallenge(search: string): number | null {
  const v = new URLSearchParams(search).get("vs");
  if (v === null || !/^\d{1,3}$/.test(v)) return null;
  const n = Number(v);
  return n >= 0 && n <= 100 ? n : null;
}

/** Paths that work before consent (try first, set up later). */
export function isTryPath(pathname: string): boolean {
  const p = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return (CHALLENGE_PATHS as readonly string[]).includes(p);
}

export function challengeVerdict(mine: number, theirs: number): string {
  if (mine > theirs) return `Победа: ${mine} против ${theirs}!`;
  if (mine === theirs) return `Ничья: ${mine} : ${theirs}`;
  return `${mine} против ${theirs}. Реванш?`;
}

export async function shareChallenge(score: number): Promise<"shared" | "copied" | "error" | "cancel"> {
  const url = challengeLink(window.location.origin, score);
  const text = `Мой результат в «Цвет и слово» — ${score}. Побьёшь?`;
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "Побей мой результат · FocusAI", text, url });
      return "shared";
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch (e) {
    return e instanceof DOMException && e.name === "AbortError" ? "cancel" : "error";
  }
}
