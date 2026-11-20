// Screenshots of every screen at 375px with demo data: `node scripts/screens.mjs [baseUrl]`.
// Needs a running build (`npm run build && npx serve out -l 4173`). Output: test-results/screens/.
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:4173";
const out = "test-results/screens";
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, locale: "ru-RU" });
await page.goto(`${base}/welcome/`);
await page.screenshot({ path: `${out}/01-welcome.png` });
await page.getByRole("button", { name: "Далее" }).click();
await page.getByRole("button", { name: "Далее" }).click();
await page.getByRole("button", { name: "Понятно" }).click();
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: "Начать" }).click();
await page.waitForURL(`${base}/`);
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/02-home-empty.png`, fullPage: true });
await page.goto(`${base}/settings/`);
await page.getByRole("button", { name: "Показать демо-данные" }).click();
await page.waitForURL(`${base}/`);
const shots = [
  ["/", "03-home"],
  ["/checkin/", "04-checkin"],
  ["/focus/", "05-focus"],
  ["/test/", "06-test"],
  ["/tree/", "07-tree"],
  ["/insights/", "08-insights"],
  ["/library/", "09-library"],
  ["/week/", "10-week"],
  ["/history/", "11-history"],
  ["/habits/", "13-habits"],
  ["/settings/", "12-settings"],
];
for (const [path, name] of shots) {
  await page.goto(`${base}${path}`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
// A few check-in steps.
await page.goto(`${base}/checkin/`);
for (let i = 1; i <= 3; i++) {
  await page.getByRole("button", { name: "Далее" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/04-checkin-${i + 1}.png` });
}
await b.close();
console.log("saved to", out);
