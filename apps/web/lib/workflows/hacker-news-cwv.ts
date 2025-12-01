export const hackerNewsCwv = `/** 
 * @import * as index from "./index" 
 */

// Set up page listeners
page.on("console", async (msg) => {
  if (msg.type() === "trace" || msg.type() === "error") {
    console.log(msg.text());
  }
});

const badMetrics = [];

/**
 * @param {string} name 
 * @param {boolean} good 
 */
function validateMetric(name, good) {
  console.log(\`\${name} valid: \${good}\`);
  if (!good) {
    badMetrics.push(name);
  }
}
page.exposeFunction("validateMetric", validateMetric);

// Using classic script to get webVitals global namespace
const scriptSrc = await fetch("https://unpkg.com/web-vitals@4/dist/web-vitals.iife.js");
const scriptBody = await scriptSrc.text();

// Inject the script into the page
await page.addInitScript({ content: scriptBody });
await page.addInitScript(
  async ([scriptBody]) => {
    window.addEventListener("DOMContentLoaded", async () => {
      const script = document.createElement("script");
      script.text = scriptBody;
      try {
        document.head.appendChild(script);
      } catch (e) {
        console.error(
          "Error when initializing injected CWV script"
        );
        console.error(e);
      }

      /**
       * From GoogleChrome/web-vitals:
       * > Note that some of these metrics will not report until the user has interacted with the page,
       * > switched tabs, or the page starts to unload.
       * 
       * See: https://github.com/GoogleChrome/web-vitals#:~:text=Note%20that%20some%20of%20these%20metrics%20will%20not%20report%20until%20the%20user%20has%20interacted%20with%20the%20page%2C%20switched%20tabs%2C%20or%20the%20page%20starts%20to%20unload.
       * 
       * @param {Metric} m
       */
      function checkMetric(m) {
        console.trace(JSON.stringify(m, null, 4));
        if (m.rating !== "good") {
          window.validateMetric(m.name, false);
          return;
        }
        window.validateMetric(m.name, true);
      }

      webVitals.onCLS(checkMetric);
      webVitals.onFCP(checkMetric);
      webVitals.onINP(checkMetric);
      webVitals.onLCP(checkMetric);
      webVitals.onTTFB(checkMetric);
      console.log("Initialized web vital monitors");
    });
  },
  [scriptBody]
);

// Go to Hacker News, record FCP and TTFB
await page.goto("https://news.ycombinator.com/newest");

// Page click to record LCP and FID
await page.waitForLoadState('domcontentloaded');
console.log("Page click");
await page.locator("input[type=text]").click();

// Obtain navigation event metrics for page load time
// - NOTE: There is only one PerformanceNavigationTiming object in the performance timeline
//   See: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming
const [navTiming] = await page.evaluate(() =>
  window.performance.getEntriesByType("navigation").map((e) => e.toJSON())
);
console.debug("Navigation Entry:", navTiming);
console.log("Page load time:", navTiming.loadEventEnd);
validateMetric("Page load", navTiming.loadEventEnd < 2000);

// Page unload to record INP and CLS
console.log("Page unload");
await page.close();
expect(badMetrics).toHaveLength(0);`