import { describe, expect, it } from "vitest";
import { rememberReturn, takeReturn } from "./returnTo";

describe("returnTo", () => {
  it("keeps only focus invite paths, once", () => {
    rememberReturn("/focus/?together=1800000000000&m=25");
    expect(takeReturn()).toBe("/focus/?together=1800000000000&m=25");
    expect(takeReturn()).toBe("/");
    rememberReturn("https://evil.example/");
    rememberReturn("//evil.example/focus/?together=1&m=25");
    expect(takeReturn()).toBe("/");
  });
});
