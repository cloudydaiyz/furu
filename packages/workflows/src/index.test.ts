import path from "path";
import fs from "fs/promises";
import { getWorkflowsFromDir, getWorkflowTitle, convertWorkflowToTest } from ".";

export const EXAMPLE_WORKFLOWS_DIR = path.join(__dirname, "..", "examples", "workflows");
export const EXAMPLE_GENERATED_DIR = path.join(__dirname, "..", "examples", "generated");

(async () => {
  await fs.rm(EXAMPLE_GENERATED_DIR, { recursive: true, force: true });
  const map = await getWorkflowsFromDir(EXAMPLE_WORKFLOWS_DIR);

  for (const [filename, content] of map) {
    if (filename === "index.d.ts") continue;
    const workflowTitle = getWorkflowTitle(filename);

    console.log();
    console.log("--------------------------------");
    console.log(`filename: ${filename}`);
    console.log(`workflow title: ${workflowTitle}`);
    console.log(`content:\n${content}`);

    console.log();
    console.log("--------------------------------");
    const parsed = await convertWorkflowToTest(content);
    console.log(`parsed:\n${parsed}`);
    console.log("--------------------------------");
    console.log();

    const outFilename = filename.replace(/\.mjs$/, ".spec.js");
    await fs.mkdir(EXAMPLE_GENERATED_DIR, { recursive: true });
    const outPath = path.join(EXAMPLE_GENERATED_DIR, outFilename);
    await fs.writeFile(outPath, parsed, "utf-8");
    console.log(`Wrote test file: ${outFilename}`);
  }
})();