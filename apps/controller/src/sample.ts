import { chromium } from "@playwright/test";
import { InjectedScript } from "./playwright/injected/src/injectedScript";
import path from "path";
import fs from "fs/promises"

const ROOT = path.join(__dirname, '..');
const injectedScriptPath = path.join(ROOT, "dist", "playwright", "injected", "generated", "injectedScript.js")

let injectedScriptBody: string | undefined = undefined;

declare global {
  interface Window {
    PlaywrightInjected: {
      InjectedScript: typeof InjectedScript;
    };
  }
}

async function getInjectedScriptBody() {
  if (!injectedScriptBody) {
    injectedScriptBody = (await fs.readFile(injectedScriptPath, "utf-8"))
  }
  return injectedScriptBody;
}

async function sortHackerNewsArticles() {
  // launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  const scriptBody = await getInjectedScriptBody();
  await context.addInitScript(
    async ([scriptBody]) => {
      window.addEventListener("DOMContentLoaded", async () => {
        const script = document.createElement("script");
        script.text = scriptBody;
        try {
          document.head.appendChild(script);
        } catch (e) {
          console.error("Error when initializing injected CWV script");
          console.error(e);
        }

        // Access InjectedScript from the global PlaywrightInjected object
        const { InjectedScript } = window.PlaywrightInjected;

        const testIdAttributeName = 'data-testid';
        const injectedScript = new InjectedScript(
          window,
          {
            isUnderTest: false,
            sdkLanguage: "javascript",
            testIdAttributeName,
            stableRafCount: 1,
            browserName: 'chromium',
            customEngines: []
          }
        );
        console.log(injectedScript);

        const element = document.querySelector(".title");
        if (element) {
          const data = injectedScript.generateSelector(element, { testIdAttributeName });
          console.log(data);
        }
      });
    },
    [scriptBody]
  );

  const page = await context.newPage();

  // go to Hacker News
  await page.goto("https://news.ycombinator.com/newest");
}

(async () => {
  await sortHackerNewsArticles();
})();