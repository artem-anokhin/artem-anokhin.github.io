import { db as defaultDb, dayKey, type FocusDB, type FocusTestResult } from "./db";
import type { FocusSummary } from "./focusTest";
import { getProfile } from "./settings";

const isCount = (x: number) => Number.isInteger(x) && x >= 0;

/**
 * Store a finished focus test. Returns null (nothing stored) when there is no
 * consented profile, no score (too little data) or any value is out of range.
 */
export async function saveFocusTest(
  summary: FocusSummary,
  now = Date.now(),
  database: FocusDB = defaultDb,
): Promise<FocusTestResult | null> {
  const { score, medianRt, lapses, falseStarts, trials } = summary;
  if (score === null || medianRt === null) return null;
  const valid =
    isCount(score) && score <= 100 &&
    Number.isFinite(medianRt) && medianRt > 0 &&
    isCount(lapses) && isCount(falseStarts) && isCount(trials) && lapses <= trials;
  if (!valid || !Number.isFinite(now)) return null;
  const row: FocusTestResult = {
    date: dayKey(new Date(now)),
    takenAt: now,
    score,
    medianRt: Math.round(medianRt),
    lapses,
    falseStarts,
    trials,
  };
  // Consent check and insert in one transaction, so a delete in another tab can't race in.
  return database.transaction("rw", database.focusTests, database.settings, async () => {
    if (!(await getProfile(database))) return null; // no consent → no storage
    row.id = await database.focusTests.add(row);
    return row;
  });
}
