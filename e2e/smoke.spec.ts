import { expect, test, type Page } from "@playwright/test";

/** No horizontal scroll at 375px (CLAUDE.md §3). */
async function fitsWidth(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("onboarding → demo data → every screen fits 375px", async ({ page }) => {
  // Privacy policy is public (Google Play needs a URL) and fits 375px.
  await page.goto("/privacy/");
  await expect(page.getByRole("heading", { name: /Политика/ })).toBeVisible();
  await fitsWidth(page);
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
  await expect(page.getByText(/выше в дни/).first()).toBeVisible();

  // «Карточка недели» is hidden in demo mode; clear the demo, add one real check-in.
  await page.goto("/tree/");
  await expect(page.getByText("Эта неделя")).toBeVisible();
  await expect(page.getByRole("button", { name: "Поделиться неделей" })).toHaveCount(0);
  await page.goto("/settings/");
  await page.getByRole("button", { name: "Убрать демо-данные" }).click();
  await expect(page).toHaveURL(/\/$/);
  for (let i = 0; i < 7; i++) await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText(/чек-ин сохранён/)).toBeVisible();
  // Headless Chromium has no share sheet, so the PNG downloads.
  await page.goto("/tree/");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Поделиться неделей" }).click();
  await (await download).saveAs("test-results/share-card.png");
  await expect(page.getByText(/Картинка сохранена/)).toBeVisible();

});
