/**
 * Keeps a «Учиться вместе» invite across onboarding: a first-time friend is sent
 * to /welcome/ and should land in the shared session after consent.
 * Only same-site focus invite paths are accepted (no open redirect). Tab-scoped.
 */
const KEY = "focusai-return";
const ALLOWED = /^\/focus\/\?together=\d{1,16}&m=(15|25|50)$/;

export function rememberReturn(pathWithSearch: string): void {
  try {
    if (ALLOWED.test(pathWithSearch)) sessionStorage.setItem(KEY, pathWithSearch);
  } catch {}
}

/** Returns and forgets the saved path, or "/" when none/invalid. */
export function takeReturn(): string {
  try {
    const v = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return v && ALLOWED.test(v) ? v : "/";
  } catch {
    return "/";
  }
}
