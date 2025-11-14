// Global context for all custom tests

import playwright from 'playwright';

declare global {
  export const page: playwright.Page;
}