import path from "path";
import prettier from "prettier";
import fs from "fs/promises";

export const WORKFLOW_TEST_TEMPLATE = [
  "import { test } from '@playwright/test';",
  "",
  'test("workflow", async ({ page }) => {',
  "});",
];

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

export async function convertWorkflowToTest(content: string): Promise<string> {
  const template = WORKFLOW_TEST_TEMPLATE.slice();
  template.splice(3, 0, content);
  return prettier.format(template.join("\n"), { parser: "typescript" });
}