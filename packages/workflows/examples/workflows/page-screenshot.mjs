// Original at: https://github.com/mxschmitt/try-playwright/blob/main/frontend/src/examples/javascript/page-screenshot.js

// Try to add 'playwright.firefox' to the list ↓
// for (const browserType of [playwright.chromium, playwright.webkit]) {
await page.goto('https://playwright.dev');

// await page.screenshot({ path: `example-${browserType.name()}.png` });
await page.screenshot({ path: `example-browser.png` });