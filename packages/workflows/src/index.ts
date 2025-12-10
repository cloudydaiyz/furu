import path from "path";
import prettier from "prettier";
import fs from "fs/promises";

export function getWorkflowTitle(filename: string) {
  return filename.substring(0, filename.indexOf("."));
}

export async function getWorkflowsFromDir(dir: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const files = await fs.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileStat = await fs.stat(filePath);
    if (fileStat.isFile()) {
      const content = await fs.readFile(filePath, "utf-8");
      map.set(file, content);
    }
  }
  return map;
}

interface ConvertWorkflowOptions {
  expectFail?: boolean;
}

export async function convertWorkflowToTest(content: string, options: ConvertWorkflowOptions = {}): Promise<string> {
  const template = [
    "import { test, expect } from '@playwright/test';",
    "import { injectAxe, checkA11y, getAxeResults } from 'axe-playwright'",
    "",
    `test${options.expectFail ? ".fail" : ""}("workflow", async ({ page }) => {`,
    "});",
  ];
  template.splice(4, 0, content);
  return prettier.format(template.join("\n"), { parser: "typescript" });
}