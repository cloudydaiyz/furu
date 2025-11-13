import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs/promises"
import type { InjectedScript } from "./playwright/injected/src/injectedScript";
import type { Recorder } from "./playwright/injected/src/recorder/recorder";

const ROOT = path.join(__dirname, '..');
const injectedScriptPath = path.join(ROOT, "dist", "playwright", "injected", "generated", "injectedScript.js")
const recorderPath = path.join(ROOT, "dist", "playwright", "injected", "generated", "recorder.js")

let injectedScriptBody: string | undefined = undefined;
let recorderBody: string | undefined = undefined;

declare global {
  interface Window {
    InjectedScriptModule: {
      InjectedScript: typeof InjectedScript;
    },
    RecorderModule: {
      Recorder: typeof Recorder;
    }
  }
}

// For later
type LineNumberKey = `${number}`

async function getInjectedScriptBody() {
  if (!injectedScriptBody) {
    injectedScriptBody = (await fs.readFile(injectedScriptPath, "utf-8"))
  }
  return injectedScriptBody;
}

async function getRecorderBody() {
  if (!recorderBody) {
    recorderBody = (await fs.readFile(recorderPath, "utf-8"))
  }
  return recorderBody;
}

async function sortHackerNewsArticles() {
  // launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  const injectedScriptBody = await getInjectedScriptBody();
  const recorderScriptBody = await getRecorderBody();

  await context.addInitScript(
    async ([injectedScriptBody, recorderScriptBody]) => {
      window.addEventListener("DOMContentLoaded", async () => {
        const script1 = document.createElement("script");
        script1.text = injectedScriptBody;
        try {
          document.head.appendChild(script1);
        } catch (e) {
          console.error("Error when initializing injected script");
          console.error(e);
        }

        const script2 = document.createElement("script");
        script2.text = recorderScriptBody;
        try {
          document.head.appendChild(script2);
        } catch (e) {
          console.error("Error when initializing injected recorder script");
          console.error(e);
        }

        // Access InjectedScript from the global PlaywrightInjected object
        const { InjectedScript } = window.InjectedScriptModule;
        const { Recorder } = window.RecorderModule;
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

        const recorder = new Recorder(injectedScript)
        console.log(recorder);

        const element = document.querySelector(".title");
        if (element) {
          const data = injectedScript.generateSelector(element, { testIdAttributeName });
          console.log(data);
        }

        recorder.setUIState({
          // mode: "none",
          // mode: "standby",
          // mode: "recording",
          // mode: "inspecting",
          // mode: "recording-inspecting",
          // mode: "assertingText",
          // mode: "assertingVisibility",
          // mode: "assertingValue",
          mode: "assertingSnapshot",
          language: "typescript",
          testIdAttributeName,
          overlay: {
            offsetX: 0
          }
        }, {
          async performAction(action) {
            console.log('performAction action', action);
          },
          async recordAction(action) {
            console.log('recordAction action', action);
          },
          async elementPicked(elementInfo) {
            console.log('elementPicked elementInfo', elementInfo);
            // injectedScript.generateSelector(element)
          },
          async setMode(mode) {
            console.log('setMode mode', mode);
          },
          async setOverlayState(state) {
            console.log('setOverlayState state', state);
          },
          highlightUpdated() {
            console.log('highlightUpdated');
          },
        })

        /**
          From Playwright (trace-viewer/src/ui/snapshotTab.tsx)
          ```
          recorder.setUIState({
            mode: isInspecting ? 'inspecting' : 'none',
            actionSelector,
            ariaTemplate,
            language: sdkLanguage,
            testIdAttributeName,
            overlay: { offsetX: 0 },
          }, {
            async elementPicked(elementInfo: ElementInfo) {
              setHighlightedElement({
                locator: asLocator(sdkLanguage, frameSelector + elementInfo.selector),
                ariaSnapshot: elementInfo.ariaSnapshot,
                lastEdited: 'none',
              });
            },
            highlightUpdated() {
              for (const r of recorders) {
                if (r.recorder !== recorder)
                  r.recorder.clearHighlight();
              }
            }
          })
          ```
        */
      });
    },
    [injectedScriptBody, recorderScriptBody]
  );

  const page = await context.newPage();

  // go to Hacker News
  await page.goto("https://news.ycombinator.com/newest");
}

(async () => {
  await sortHackerNewsArticles();
})();