/** Light haptic feedback where the browser supports it (Android Chrome); a no-op elsewhere. */
export function tap(kind: "light" | "success" = "light"): void {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    navigator.vibrate(kind === "success" ? [12, 40, 18] : 8);
  } catch {
    // Ignore: haptics are a nicety only.
  }
}
