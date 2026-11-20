import { expect, test, type Page } from "@playwright/test";

/** No horizontal scroll at 375px (CLAUDE.md §3). */
async function fitsWidth(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

const DEMO = (page: Page) => page.getByText("Демо-данные.", { exact: true });

test("onboarding → demo → every screen fits 375px → check-in → focus → share", async ({ page }) => {
  // Privacy policy is public (Google Play needs a URL) and fits 375px.
  await page.goto("/privacy/");
  await expect(page.getByRole("heading", { name: /Политика/ })).toBeVisible();
  await fitsWidth(page);

  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome\/$/);
  await fitsWidth(page);
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Понятно" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Начать" }).click();
  await expect(page.getByRole("link", { name: /Отметить день/ })).toBeVisible();

  await page.goto("/settings/");
  await page.getByRole("button", { name: "Показать демо-данные" }).click();
  await expect(DEMO(page)).toBeVisible();

  // Tabs and sections with navigation show the demo label.
  for (const path of ["/", "/focus/", "/tree/", "/insights/", "/library/", "/history/", "/settings/"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    if (path !== "/focus/") await expect(DEMO(page)).toBeVisible();
    await fitsWidth(page);
  }
  // Full-screen screens (no navigation).
  for (const path of ["/checkin/", "/test/", "/week/"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("navigation", { name: "Основная навигация" })).toHaveCount(0);
    await fitsWidth(page);
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
  await page.getByRole("link", { name: /Отметить день/ }).click();
  for (let i = 0; i < 7; i++) await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByRole("status").filter({ hasText: "День отмечен" })).toBeVisible();
  await page.getByRole("link", { name: "На главную" }).click();
  await expect(page.getByText("Чек-ин готов")).toBeVisible();

  // Focus session starts and hides navigation; stopping early saves nothing.
  await page.goto("/focus/");
  await page.getByRole("button", { name: "Начать 25 минут" }).click();
  await expect(page.getByRole("img", { name: /Осталось/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Основная навигация" })).toBeHidden();
  await page.getByRole("button", { name: "Завершить раньше" }).click();
  await page.getByRole("button", { name: "Завершить", exact: true }).click();
  await expect(page.getByRole("button", { name: "Начать 25 минут" })).toBeVisible();

  // Headless Chromium has no share sheet, so the PNG downloads.
  await page.goto("/tree/");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Поделиться неделей" }).click();
  await (await download).saveAs("test-results/share-card.png");
  await expect(page.getByText(/Картинка сохранена/)).toBeVisible();
});
