// Global context for all custom tests
// https://github.com/microsoft/TypeScript/issues/15626

import playwright from 'playwright';
import * as playwrightTest from "@playwright/test";
import * as axePlaywright from "axe-playwright";
import * as baseWebVitals from 'web-vitals';

declare global {
  export const page: playwright.Page;
  export const test: typeof playwrightTest.test;
  export const expect: typeof playwrightTest.expect;
  export type Locator = playwrightTest.Locator;
  export const injectAxe: typeof axePlaywright.injectAxe;
  export const checkA11y: typeof axePlaywright.checkA11y;
  export const getAxeResults: typeof axePlaywright.getAxeResults;

  export const webVitals: typeof baseWebVitals;
  export type Metric = baseWebVitals.Metric;
}