import { db as defaultDb, type FocusDB } from "./db";

export type Mode = "study" | "work";

export interface Profile {
  mode: Mode;
  /** Time the user gave explicit consent to local-only storage. */
  consentAt: number;
}

const PROFILE_KEY = "profile";

function isProfile(v: unknown): v is Profile {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (p.mode === "study" || p.mode === "work") && typeof p.consentAt === "number";
}

export async function getProfile(db: FocusDB = defaultDb): Promise<Profile | null> {
  const row = await db.settings.get(PROFILE_KEY);
  return isProfile(row?.value) ? row.value : null;
}

/** Saves the profile. `consent` must be literally true: no consent, no storage. */
export async function saveProfile(
  mode: Mode,
  consent: true,
  db: FocusDB = defaultDb,
  now = Date.now(),
): Promise<Profile> {
  if (consent !== true) throw new Error("Consent is required");
  const profile: Profile = { mode, consentAt: now };
  await db.settings.put({ key: PROFILE_KEY, value: profile });
  return profile;
}

export const MODE_LABEL: Record<Mode, string> = { study: "Учусь", work: "Работаю" };
