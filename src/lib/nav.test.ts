import { NAV_ITEMS, isActive } from "./nav";

describe("isActive", () => {
  it("matches home only on root", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/test/", "/")).toBe(false);
  });
  it("matches sections with or without trailing slash", () => {
    expect(isActive("/test", "/test/")).toBe(true);
    expect(isActive("/insights/", "/insights/")).toBe(true);
    expect(isActive("/tree/", "/test/")).toBe(false);
  });
});

describe("nav edge cases", () => {
  it("handles empty path and prefix collisions", () => {
    expect(isActive("", "/")).toBe(true);
    expect(isActive("/testing/", "/test/")).toBe(false);
    expect(isActive("/test/x/", "/test/")).toBe(true);
  });
  it("every href ends with a slash (trailingSlash export)", () => {
    expect(NAV_ITEMS.every((i) => i.href.endsWith("/"))).toBe(true);
  });
});
