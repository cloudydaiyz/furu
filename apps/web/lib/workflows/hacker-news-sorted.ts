export const hackerNewsSorted = `/** @import * as index from "./index" */

await page.goto("https://news.ycombinator.com/newest");

let numArticlesSorted = 0;
let prevTimestamp = Infinity;
while (numArticlesSorted < 100) {
  const rows = await page.locator("span[title]").all();

  for (let i = 0; i < 30 && numArticlesSorted < 100; i++) {
    const item = rows[i];

    const title = await item.getAttribute("title");
    expect(title).not.toBeNull();

    const date = new Date(title.split(" ")[0]).getTime();

    expect(date).toBeLessThanOrEqual(prevTimestamp);
    prevTimestamp = date;
    numArticlesSorted++;
  }

  if (numArticlesSorted < 100) {
    await page.locator("a[rel=next]").click();
  }
}`