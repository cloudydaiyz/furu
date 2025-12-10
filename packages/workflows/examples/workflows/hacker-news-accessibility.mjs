await page.goto("https://news.ycombinator.com/newest");
await injectAxe(page);
await checkA11y(page);