// Original at: https://github.com/mxschmitt/try-playwright/blob/main/frontend/src/examples/javascript/intercept-requests.js

// @ts-check

// Log and continue all network requests
await page.route('**', (route, request) => {
  console.log(request.url());
  route.continue();
});

await page.goto('http://todomvc.com');