import { expect, test, type Page } from "@playwright/test";

/** No horizontal scroll at 375px (CLAUDE.md §3). */
async function fitsWidth(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("onboarding → demo data → every screen fits 375px", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome\/$/);
  await fitsWidth(page);
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Понятно" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Начать" }).click();
  await expect(page.getByRole("heading", { name: /Сегодня/ })).toBeVisible();

  await page.goto("/settings/");
  await page.getByRole("button", { name: "Показать демо-данные" }).click();
  await expect(page.getByText("Демо-данные.", { exact: true })).toBeVisible();

  for (const path of ["/", "/test/", "/insights/", "/tree/", "/library/", "/history/", "/settings/"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Демо-данные.", { exact: true })).toBeVisible();
    await fitsWidth(page);
    await page.screenshot({ path: `test-results/375${path.replaceAll("/", "_") || "_"}.png`, fullPage: true });
  }
  await page.goto("/insights/");
  await expect(page.getByText(/связан/).first()).toBeVisible();
});
