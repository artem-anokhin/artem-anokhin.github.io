import { shareCardSvg } from "./shareCard";

const tree = '<svg viewBox="0 0 200 220" role="img"><title id="t">Дерево: росток</title><ellipse cx="1" cy="1" rx="1" ry="1"/></svg>';

describe("shareCardSvg", () => {
  it("shows only stage, active days and the link", () => {
    const svg = shareCardSvg({ treeSvg: tree, stageName: "росток", activeDays: 5, url: "focusai.app" });
    expect(svg).toContain("5 из 7");
    expect(svg).toContain("дней с чек-ином");
    expect(svg).toContain("Стадия дерева: росток");
    expect(svg).toContain("focusai.app");
    expect(svg).toContain("<ellipse");
    expect(svg).not.toContain("<title");
  });

  it("clamps days and escapes text", () => {
    const svg = shareCardSvg({ treeSvg: tree, stageName: "<b>", activeDays: 12, url: "a&b" });
    expect(svg).toContain("7 из 7");
    expect(svg).toContain("&lt;b&gt;");
    expect(svg).toContain("a&amp;b");
  });
});
