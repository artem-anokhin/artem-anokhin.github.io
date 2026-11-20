import { db as defaultDb, dayKey, type FocusDB } from "./db";
import { getExperiment, getExperimentHistory } from "./settings";
import { treeState, type TreeState } from "./tree";

/** The one way screens load the tree, so every screen shows the same drops and stage. */
export async function loadTree(db: FocusDB = defaultDb, today: string = dayKey()): Promise<TreeState> {
  const [checkins, tests, sessions, experiment, past] = await Promise.all([
    db.checkins.toArray(),
    db.focusTests.toArray(),
    db.sessions.toArray(),
    getExperiment(db),
    getExperimentHistory(db),
  ]);
  return treeState({
    checkinDates: checkins.map((c) => c.date),
    tests,
    experiment,
    pastExperiments: past,
    sessionDates: sessions.map((s) => s.date),
    today,
  });
}
