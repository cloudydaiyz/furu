// Global context for all custom tests
// https://github.com/microsoft/TypeScript/issues/15626

import playwright from 'playwright';

declare global {
  export const page: playwright.Page;
}