// Original at: https://github.com/mxschmitt/try-playwright/blob/main/frontend/src/examples/javascript/record-video.js

for (let i = 0; i < 3; i++) {
  await page.goto('https://news.ycombinator.com/');
  await page.getByRole('link', { name: 'new', exact: true }).click();
  await page.locator('.pagetop > a').first().click();
  await page.getByRole('link', { name: 'comments', exact: true }).click();
  await page.getByRole('link', { name: 'ask', exact: true }).click();
  await page.getByRole('link', { name: 'show' }).click();
  await page.getByRole('link', { name: 'jobs' }).click();
  await page.getByRole('link', { name: 'login' }).click();
}