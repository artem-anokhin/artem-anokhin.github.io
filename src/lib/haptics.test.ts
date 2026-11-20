import { afterEach, describe, expect, it, vi } from "vitest";
import { tap } from "./haptics";

afterEach(() => vi.unstubAllGlobals());

describe("haptics", () => {
  it("does nothing without the Vibration API", () => {
    vi.stubGlobal("navigator", {});
    expect(() => tap()).not.toThrow();
  });

  it("uses a short pulse and a success pattern", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    tap();
    tap("success");
    expect(vibrate).toHaveBeenNthCalledWith(1, 8);
    expect(vibrate).toHaveBeenNthCalledWith(2, [12, 40, 18]);
  });
});
