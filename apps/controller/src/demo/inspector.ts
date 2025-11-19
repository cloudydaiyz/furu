// Demonstrates using the Playwright InjectedScript and Recorder API to enable / disable
// Playwright Recorder capabilities in the browser

import { BrowserContext, chromium } from "@playwright/test";
import path from "path";
import fs from "fs/promises"
import type { InjectedScript } from "../vendor/playwright/injected/src/injectedScript";
import type { Recorder, RecorderDelegate } from "../vendor/playwright/injected/src/recorder/recorder";

const ROOT = path.join(__dirname, '..');
const injectedScriptPath = path.join(ROOT, "dist", "playwright", "injected", "generated", "injectedScript.js")
const recorderPath = path.join(ROOT, "dist", "playwright", "injected", "generated", "recorder.js")

const startMaximized = false;

type Action = typeof actions[number];
type ActionInput = {
  label: string;
  snippet: (locator: string, ariaSnapshot: string) => string;
}
type ActionMap = Record<Action, ActionInput>;

type SelectedElementOptions = {
  actions: readonly Action[],
  locators: string[],
  ariaSnapshot: string,
}

declare global {
  interface Window {
    injectedScriptModule: {
      InjectedScript: typeof InjectedScript;
    },
    recorderModule: {
      Recorder: typeof Recorder;
    }

    actionMap: ActionMap;
    currentOptions: SelectedElementOptions | undefined;
    injection: Promise<void>;
    setInspecting: (enabled: boolean) => void;
    generateActionSnippet?: (action: Action, locatorIndex: number) => string;
  }
}

const actions = [
  "click",
  "rightClick",
  "doubleClick",
  "hover",
  "fill",
  "assertVisibility",
  "assertText",
  "assertValue",
  "assertEmpty",
  "assertSnapshot",
] as const;

async function initBrowserContext(browserContext: BrowserContext, scriptPaths: string[]) {
  const scriptContents: string[] = [];
  for (const path of scriptPaths) {
    scriptContents.push(await fs.readFile(path, "utf-8"));
  }

  await browserContext.addInitScript(
    async ([scriptContents]) => {
      const actionMap: ActionMap = {
        "click": {
          label: "Click",
          snippet: (locator) => `await page.${locator}.click();`
        },
        "rightClick": {
          label: "Double click",
          snippet: (locator) => `await page.${locator}.click({ button: 'right' });`
        },
        "doubleClick": {
          label: "Double click",
          snippet: (locator) => `await page.${locator}.dblclick();`
        },
        "hover": {
          label: "Hover",
          snippet: (locator) => `await page.${locator}.hover();`
        },
        "fill": {
          label: "Fill",
          snippet: (locator) => `await page.${locator}.fill('Placeholder text');`
        },
        "assertVisibility": {
          label: "Assert visibility",
          snippet: (locator) => `await expect(page.${locator}).toBeVisible();`
        },
        "assertText": {
          label: "Assert text",
          snippet: (locator) => `await expect(page.${locator}).toHaveText('Placeholder text');`
        },
        "assertValue": {
          label: "Assert value",
          snippet: (locator) => `await expect(page.${locator}).toHaveValue('Placeholder value');`
        },
        "assertEmpty": {
          label: "Assert empty",
          snippet: (locator) => `await expect(page.${locator}).toBeEmpty();`
        },
        "assertSnapshot": {
          label: "Assert aria snapshot",
          snippet: (locator, ariaSnapshot) => `await expect(page.${locator}).toMatchAriaSnapshot(\`${ariaSnapshot}\`);`
        },
      }

      window.currentOptions = undefined;

      window.generateActionSnippet = (action, locatorIndex = 0) => {
        const locator = window.currentOptions?.locators[locatorIndex];
        const ariaSnapshot = window.currentOptions?.ariaSnapshot;
        if (!locator || !ariaSnapshot) return "";

        console.log(actionMap, action);
        return actionMap[action].snippet(locator, ariaSnapshot);
      }

      window.injection = new Promise((resolve, reject) => {
        const injectionListener = async () => {
          try {
            for (const scriptContent of scriptContents) {
              const script = document.createElement("script");
              script.text = scriptContent;
              document.head.appendChild(script);
            }
            window.removeEventListener("DOMContentLoaded", injectionListener)
            resolve();
          } catch (e) {
            console.error(`Error when initializing injected script`);
            console.error(e);
            window.removeEventListener("DOMContentLoaded", injectionListener)
            reject(e);
          }
        }
        window.addEventListener("DOMContentLoaded", injectionListener);
      });
    },
    [scriptContents] as const
  )
}

async function launch() {
  // launch browser
  const args = startMaximized ? ["--start-maximized"] : [];
  const browser = await chromium.launch({
    headless: false,
    // NOTE: The `--start-maximized` option only works for Chromium
    args
  });

  // https://playwright.dev/docs/emulation#viewport
  const context = await browser.newContext({
    viewport: {
      width: 1920,
      height: 1080
    }
  });

  const scriptPaths = [injectedScriptPath, recorderPath];
  await initBrowserContext(context, scriptPaths);

  await context.addInitScript(
    async ([actions]) => {
      window.addEventListener("DOMContentLoaded", async () => {
        await window.injection;

        // Access InjectedScript from the global PlaywrightInjected object
        const { InjectedScript } = window.injectedScriptModule;
        const { Recorder } = window.recorderModule;
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

        const recorder = new Recorder(injectedScript, { disableOverlay: true });
        console.log(recorder);

        const delegate: RecorderDelegate = {
          async performAction(action) {
            console.log('performAction action', action);
          },
          async recordAction(action) {
            console.log('recordAction action', action);
          },
          async elementPicked(elementInfo) {
            if (elementInfo.element) {
              const generated = injectedScript.generateSelector(elementInfo.element, { testIdAttributeName });
              const locator = injectedScript.utils.asLocator(recorder.state.language, generated.selector);
              const locators = injectedScript.utils.asLocators("javascript", elementInfo.selector);
              const allLocators = generated.selectors
                .map(selector => injectedScript.utils.asLocators("javascript", selector))
                .flat()
              window.currentOptions = { actions, locators: allLocators, ariaSnapshot: elementInfo.ariaSnapshot }

              console.log('elementPicked', { elementInfo, generated, locator, locators });
              console.log('elementPicked currentOptions', window.currentOptions);
            } else {
              console.log('elementPicked elementInfo', elementInfo);
            }
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
        }

        function setInspecting(enabled: boolean) {
          recorder.setUIState({
            mode: enabled ? "inspecting" : "none",
            language: "typescript",
            testIdAttributeName,
            overlay: { offsetX: 0 }
          }, delegate)
        }
        window.setInspecting = setInspecting;
        setInspecting(true)
      });
    },
    [actions] as const
  );

  const page = await context.newPage();

  // go to Hacker News
  await page.goto("https://news.ycombinator.com/newest");
}

(async () => {
  await launch();
})();