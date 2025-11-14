// Original at: https://github.com/mxschmitt/try-playwright/blob/main/frontend/src/examples/javascript/mobile-and-geolocation.js

// @ts-check

// const { chromium, devices } = playwright;
// const pixel5 = devices['Pixel 5'];
// const browser = await chromium.launch();
// const context = await browser.newContext({
//   ...pixel5,
//   geolocation: { longitude: 12.492507, latitude: 41.889938 },
//   permissions: ['geolocation']
// });

await page.goto('https://www.openstreetmap.org');
await page.locator('[aria-label="Show My Location"]').click();
await page.screenshot({ path: 'colosseum-iphone.png' });