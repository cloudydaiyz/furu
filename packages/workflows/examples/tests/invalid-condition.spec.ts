import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});

if(process.env.FAULTY_BEHAVIOR) {
  throw new Error("This file should not run");
}