import type { CheckInData, Scale5 } from "./checkin";
import { db as defaultDb, dayKey, type CheckIn, type FocusDB, type FocusSession, type FocusTestResult } from "./db";
import { getProfile } from "./settings";

/**
 * Demo data for presentations (CLAUDE.md §4: always labelled «демо-данные»).
 * Values are synthetic. Loaded only into an empty, consented app, and the
 * "demo" settings flag makes the UI show a visible label until data is deleted.
 */

export const DEMO_KEY = "demo";
export const DEMO_DAYS = 21;

/** Small deterministic PRNG so the demo looks the same every time. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp5 = (n: number) => Math.min(5, Math.max(1, Math.round(n))) as Scale5;
const hhmm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Builds `days` synthetic days ending yesterday (today stays free for a live check-in). */
export function buildDemo(today: Date = new Date(), days = DEMO_DAYS, seed = 7) {
  const r = rng(seed);
  const checkins: CheckIn[] = [];
  const tests: FocusTestResult[] = [];
  const sessions: FocusSession[] = [];
  for (let i = days; i >= 1; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 20, 0);
    const date = dayKey(d);
    const sleepH = 5.5 + r() * 3; // 5.5–8.5 h
    const bed = 23 * 60 + (r() - 0.3) * 120;
    const cups = Math.floor(r() * 4);
    const stress = clamp5(4.5 - (sleepH - 5.5) + (r() - 0.5) * 2);
    const data: CheckInData = {
      sleep: { bedtime: hhmm(bed), wake: hhmm(bed + sleepH * 60), quality: clamp5(sleepH - 3.5 + (r() - 0.5)) },
      food: { breakfast: r() > 0.35, regularity: r() > 0.7 ? "varied" : r() > 0.25 ? "normal" : "poor" },
      caffeine: { cups, lastAt: cups ? hhmm(10 * 60 + r() * 8 * 60) : null, water: 3 + Math.floor(r() * 6) },
      mind: { stress, mood: clamp5(6 - stress + (r() - 0.5) * 2) },
      activity: { level: r() > 0.6 ? "frequent" : r() > 0.3 ? "medium" : "minimal", note: "" },
      work: { hours: 3 + Math.floor(r() * 6), difficulty: clamp5(2 + r() * 3) },
      rest: { type: r() > 0.6 ? "physical" : r() > 0.3 ? "hobby" : "none" },
      note: "",
    };
    const t = d.getTime();
    checkins.push({ ...data, date, createdAt: t, updatedAt: t, demo: true });
    if (r() > 0.45) sessions.push({ date, startedAt: t - 3 * 3_600_000, minutes: r() > 0.5 ? 50 : 25, demo: true });
    if (r() > 0.12) {
      const score = Math.round(Math.min(95, Math.max(30, 40 + (sleepH - 5.5) * 12 + (r() - 0.5) * 16)));
      tests.push({ date, takenAt: t + 60_000, score, medianRt: Math.round(420 - score * 1.6), lapses: Math.floor(r() * 3), falseStarts: Math.floor(r() * 2), trials: 30, demo: true });
    }
  }
  return { checkins, tests, sessions };
}

export async function isDemo(database: FocusDB = defaultDb): Promise<boolean> {
  return (await database.settings.get(DEMO_KEY))?.value === true;
}

/** Loads demo data. Returns false (nothing written) without consent or if any real data exists. */
export async function loadDemo(database: FocusDB = defaultDb, today = new Date()): Promise<boolean> {
  return database.transaction("rw", [database.checkins, database.focusTests, database.settings, database.sessions, database.habits, database.habitLogs], async () => {
    if (!(await getProfile(database))) return false;
    if ((await database.checkins.count()) || (await database.focusTests.count())) return false;
    const { checkins, tests, sessions } = buildDemo(today);
    await database.checkins.bulkPut(checkins);
    await database.focusTests.bulkAdd(tests);
    await database.sessions.bulkAdd(sessions);
    // Two demo habits with marks on most days.
    const ids = await database.habits.bulkAdd(
      [
        { title: "Стакан воды утром", sphere: "caffeine", createdAt: 1, archived: 0, demo: true },
        { title: "Прогулка 10 минут", sphere: "activity", createdAt: 2, archived: 0, demo: true },
      ],
      { allKeys: true },
    );
    await database.habitLogs.bulkPut(
      checkins.flatMap((c, i) =>
        ids.filter((_, j) => (i + j) % 3 !== 0).map((habitId) => ({ habitId: habitId as number, date: c.date, doneAt: c.createdAt, demo: true as const })),
      ),
    );
    await database.settings.put({ key: DEMO_KEY, value: true });
    return true;
  });
}

/** Removes only demo-tagged rows and the flag; real check-ins, tests, experiments and the profile stay. */
export async function clearDemo(database: FocusDB = defaultDb): Promise<void> {
  await database.transaction("rw", [database.checkins, database.focusTests, database.settings, database.sessions, database.habits, database.habitLogs], async () => {
    await database.sessions.filter((s) => s.demo === true).delete();
    await database.habitLogs.filter((l) => l.demo === true).delete();
    await database.habits.filter((h) => h.demo === true).delete();
    await database.checkins.filter((c) => c.demo === true).delete();
    await database.focusTests.filter((t) => t.demo === true).delete();
    await database.settings.delete(DEMO_KEY);
  });
}
