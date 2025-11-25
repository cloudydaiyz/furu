/** @import * as index from "./index" */

await page.goto("https://news.ycombinator.com/newest");
console.log('hello 1');
console.table([
  { name: 'Bob' },
  { name: 'Bob' },
  { name: 'Bob' },
  { name: 'Bob' },
  { name: 'Bob' },
  { name: 'Bob' },
])
console.log('hello 2');
await injectAxe(page);
console.log('hello 3');
await checkA11y(page);
console.log('hello 4');
