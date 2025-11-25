// Each test in this suite will take at least 5 seconds to run
// Helpful for measuring timeouts

import { test } from '@playwright/test';
import { delay } from '../../src/util';

test('delay for 5 seconds', async ({ page }) => {
  const start = Date.now();
  await delay(5000);
  const delta = Date.now() - start;
  console.log(`Delayed for ${delta}ms (${delta / 1000} seconds)`);
});

test('delay for another 5 seconds', async ({ page }) => {
  const start = Date.now();
  await delay(5000);
  const delta = Date.now() - start;
  console.log(`Delayed for ${delta}ms (${delta / 1000} seconds)`);
});