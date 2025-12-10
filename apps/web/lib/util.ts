import { BlockExecutionStatus, SelectedElementAction } from '@cloudydaiyz/furu-api';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSelectedActionLabel(action: SelectedElementAction) {
  switch (action) {
    case "click":
      return "Click";
    case "rightClick":
      return "Right click";
    case "doubleClick":
      return "Double click";
    case "hover":
      return "Hover";
    case "fill":
      return "Fill";
    case "assertVisibility":
      return "Assert visibility";
    case "assertText":
      return "Assert text";
    case "assertValue":
      return "Assert value";
    case "assertEmpty":
      return "Assert empty";
    case "assertSnapshot":
      return "Assert snapshot";
    default:
      return "No action";
  }
}

export function getSelectedElementCommand(
  action: SelectedElementAction,
  locator: string,
  ariaSnapshot: string,
) {
  switch (action) {
    case "click":
      return `await page.${locator}.click();`;
    case "rightClick":
      return `await page.${locator}.click({ button: 'right' });`;
    case "doubleClick":
      return `await page.${locator}.dblclick();`;
    case "hover":
      return `await page.${locator}.hover();`;
    case "fill":
      return `await page.${locator}.fill('text');`;
    case "assertVisibility":
      return `await expect(page.${locator}).toBeVisible();`;
    case "assertText":
      return `await expect(page.${locator}).toContainText('text');`;
    case "assertValue":
      return `await expect(page.${locator}).toHaveValue('text');`;
    case "assertEmpty":
      return `await expect(page.${locator}).toBeEmpty();`;
    case "assertSnapshot":
      return `await expect(page.${locator}).toMatchAriaSnapshot(${ariaSnapshot});`;
    default:
      return "No action";
  }
}

export function findLastLine(block: BlockExecutionStatus): number | null {
  let max = null;
  for (const line in block) {
    const lineNumber = Number.parseInt(line);
    if (!max || lineNumber > max) {
      max = lineNumber;
    }
  }
  return max;
}