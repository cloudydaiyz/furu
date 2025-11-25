import { test, expect } from '@playwright/test';

async function faultyBehavior() {
  setTimeout(() => { throw new Error("This file should not run") }, 1000);
}

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});

faultyBehavior();