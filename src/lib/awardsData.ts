import { db as defaultDb, type FocusDB } from "./db";
import { AWARDS_SEEN_KEY, awards, type Award } from "./awards";
import { countGoalsDone } from "./goals";
import { loadTree } from "./garden";

/** All awards computed from the local data. */
export async function loadAwards(db: FocusDB = defaultDb, stage?: number): Promise<Award[]> {
  const [checkins, tests, sessions, habitLogs, goalsDone, st] = await Promise.all([
    db.checkins.toArray(),
    db.focusTests.toArray(),
    db.sessions.toArray(),
    db.habitLogs.toArray(),
    countGoalsDone(db),
    stage === undefined ? loadTree(db).then((t) => t.stage) : Promise.resolve(stage),
  ]);
  return awards({ checkins, tests, sessions, habitLogs, stage: st, goalsDone });
}

export async function seenAwardIds(db: FocusDB = defaultDb): Promise<Set<string> | null> {
  const v = (await db.settings.get(AWARDS_SEEN_KEY))?.value;
  return Array.isArray(v) ? new Set(v.filter((x): x is string => typeof x === "string")) : null;
}

/** Earned awards the user has not seen in the Garden yet. */
export async function unseenAwards(db: FocusDB = defaultDb): Promise<Award[]> {
  const [list, seen] = await Promise.all([loadAwards(db), seenAwardIds(db)]);
  const earned = list.filter((a) => a.done);
  // Before the first Garden visit: new users still see their first awards; long-time users are not flooded.
  if (!seen) return earned.length > 3 ? [] : earned;
  return earned.filter((a) => !seen.has(a.id));
}
