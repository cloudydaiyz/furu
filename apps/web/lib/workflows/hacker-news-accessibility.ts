export const hackerNewsAccessibility = `/** @import * as index from "./index" */

await page.goto("https://news.ycombinator.com/newest");
await injectAxe(page);
await checkA11y(page);`
