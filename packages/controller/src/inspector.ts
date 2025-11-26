import { BrowserContext, Page } from "@playwright/test";
import path from "path";
import fs from "fs/promises"
import type { InjectedScript } from "./vendor/playwright/injected/src/injectedScript";
import type { Recorder, RecorderDelegate } from "./vendor/playwright/injected/src/recorder/recorder";
import { UIState } from "./vendor/playwright/recorder/src/recorderTypes";
import { SelectedElementOptions } from "./types";

const ROOT = path.join(__dirname, "..");
const injectedScriptPath = path.join(ROOT, "dist", "vendor", "playwright", "injected", "generated", "injectedScript.js")
const recorderPath = path.join(ROOT, "dist", "vendor", "playwright", "injected", "generated", "recorder.js")

const testIdAttributeName = 'data-testid';

type Action = typeof actions[number];
type ActionInput = {
  label: string;
  snippet: (locator: string, ariaSnapshot: string) => string;
}
type ActionMap = Record<Action, ActionInput>;

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
    setInspecting: (enabled: boolean) => void;
    generateActionSnippet?: (action: Action, locatorIndex: number) => string;
    setUIState: (state: UIState) => void;
    updateCurrentOptions: (opts: SelectedElementOptions) => Promise<void>;
    onReady: () => void;
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

export class BrowserContextInspector {
  private context: BrowserContext;
  private currentOptions: SelectedElementOptions | undefined;
  private inspecting: boolean;

  private constructor(context: BrowserContext) {
    this.context = context;
    this.currentOptions = undefined;
    this.inspecting = false;
  }

  static async create(
    browserContext: BrowserContext,
    onUpdateCurrentOptions: (opts: SelectedElementOptions) => void | Promise<void>
  ) {
    const scriptPaths = [injectedScriptPath, recorderPath];
    const scriptContents: string[] = [];
    for (const path of scriptPaths) {
      scriptContents.push(await fs.readFile(path, "utf-8"));
    }

    const inspector = new BrowserContextInspector(browserContext);

    browserContext.exposeBinding(
      "updateCurrentOptions",
      async (source, options: SelectedElementOptions) => {
        inspector.currentOptions = options;
        await onUpdateCurrentOptions(options);
      }
    );

    browserContext.exposeBinding(
      "onReady",
      ({ page }) => {
        console.log(inspector.inspecting);
        inspector.setUIState(inspector.inspecting, page);
      }
    );

    await browserContext.addInitScript(
      async ([scriptContents, testIdAttributeName]) => {
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

        function onInject() {
          // Access InjectedScript from the global PlaywrightInjected object
          const { InjectedScript } = window.injectedScriptModule;
          const { Recorder } = window.recorderModule;

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
            async elementPicked(elementInfo) {
              if (elementInfo.element) {
                const generated = injectedScript.generateSelector(elementInfo.element, { testIdAttributeName });
                const locator = injectedScript.utils.asLocator(recorder.state.language, generated.selector);
                const locators = injectedScript.utils.asLocators("javascript", elementInfo.selector);
                const allLocators = generated.selectors
                  .map(selector => injectedScript.utils.asLocators("javascript", selector))
                  .flat()
                const currentOptions = { locators: allLocators, ariaSnapshot: elementInfo.ariaSnapshot }
                window.currentOptions = currentOptions;
                window.updateCurrentOptions(currentOptions);
              }
            },
          };

          window.setUIState = (state) => recorder.setUIState(state, delegate);
        }

        const injectionListener = async () => {
          try {
            for (const scriptContent of scriptContents) {
              const script = document.createElement("script");
              script.text = scriptContent;
              document.head.appendChild(script);
            }
            window.removeEventListener("DOMContentLoaded", injectionListener);

            onInject();
            window.onReady();
          } catch (e) {
            console.error(`Error when initializing injected script`);
            console.error(e);
            window.removeEventListener("DOMContentLoaded", injectionListener);
          }
        }
        window.addEventListener("DOMContentLoaded", injectionListener);
      },
      [scriptContents, testIdAttributeName] as const
    );

    return inspector;
  }

  setInspecting(inspecting: boolean) {
    this.setUIState(inspecting);
    this.inspecting = inspecting;
  }

  private async setUIState(inspecting: boolean, page?: Page) {
    const state: UIState = {
      mode: inspecting ? "inspecting" : "none",
      language: "typescript",
      testIdAttributeName,
      overlay: { offsetX: 0 }
    }

    if (page) {
      await page.evaluate(([state]) => window.setUIState(state), [state]);
    } else {
      await Promise.all(this.context.pages().map(page => {
        return page.evaluate(([state]) => window.setUIState(state), [state]);
      }));
    }
  }

  getContext() {
    return this.context;
  }

  getCurrentOptions() {
    return this.currentOptions;
  }
}