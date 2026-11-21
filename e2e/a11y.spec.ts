import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Onboard and load demo data so every screen has content. */
async function setup(page: Page) {
  await page.goto("/welcome/");
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Понятно" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Начать" }).click();
  await page.getByRole("link", { name: /Отметить день/ }).waitFor();
  await page.goto("/settings/");
  await page.getByRole("button", { name: /Показать демо-данные/ }).click();
  await page.waitForURL(/\/$/);
}

const PAGES = ["/", "/checkin/", "/focus/", "/test/", "/tree/", "/insights/", "/library/", "/week/", "/history/", "/settings/", "/habits/", "/privacy/", "/breathe/"];

for (const scheme of ["light", "dark"] as const) {
  test(`no serious accessibility violations (${scheme})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: scheme });
    await setup(page);
    const problems: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(400); // let entrance animations settle (opacity affects contrast checks)
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      for (const v of res.violations.filter((x) => x.impact === "serious" || x.impact === "critical")) {
        problems.push(`${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
}
