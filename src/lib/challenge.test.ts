import { describe, expect, it } from "vitest";
import { challengeLink, challengeVerdict, isTryPath, parseChallenge } from "./challenge";

describe("challenge link", () => {
  it("round-trips only a 0–100 integer", () => {
    expect(challengeLink("https://x.app", 73.6)).toBe("https://x.app/tests/stroop/?vs=74");
    expect(parseChallenge("?vs=74")).toBe(74);
    expect(parseChallenge("?vs=101")).toBeNull();
    expect(parseChallenge("?vs=-1")).toBeNull();
    expect(parseChallenge("?vs=7e1")).toBeNull();
    expect(parseChallenge("?vs=%3Cscript%3E")).toBeNull();
    expect(parseChallenge("")).toBeNull();
  });
  it("only the stroop test is open before consent", () => {
    expect(isTryPath("/tests/stroop/")).toBe(true);
    expect(isTryPath("/tests/stroop")).toBe(true);
    expect(isTryPath("/tests/")).toBe(false);
    expect(isTryPath("/notes/")).toBe(false);
  });
  it("verdict", () => {
    expect(challengeVerdict(80, 74)).toBe("Победа: 80 против 74!");
    expect(challengeVerdict(74, 74)).toBe("Ничья: 74 : 74");
    expect(challengeVerdict(60, 74)).toBe("60 против 74. Реванш?");
  });
});
