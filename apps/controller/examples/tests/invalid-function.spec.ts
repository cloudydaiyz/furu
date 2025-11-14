import { test, expect } from '@playwright/test';

function faultyBehavior() {
  throw new Error("This file should not run");
}

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});

faultyBehavior();