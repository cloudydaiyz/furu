// Original at: https://github.com/mxschmitt/try-playwright/blob/main/frontend/src/examples/javascript/generate-pdf.js

await page.goto('https://www.google.com/search?q=Google');
await page.pdf({ path: `document.pdf` });