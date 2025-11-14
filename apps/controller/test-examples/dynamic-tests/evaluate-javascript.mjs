// Original at: https://github.com/mxschmitt/try-playwright/blob/main/frontend/src/examples/javascript/evaluate-javascript.js

// @ts-check

await page.goto('https://www.example.com/');
const dimensions = await page.evaluate(() => {
  return {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
    deviceScaleFactor: window.devicePixelRatio
  }
})
console.log(JSON.stringify(dimensions));