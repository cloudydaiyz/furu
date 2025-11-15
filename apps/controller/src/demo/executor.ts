import path from "path";
import fs from "fs/promises";
import { Readable, ReadableOptions } from "stream";
import repl from "repl";
import { chromium } from "@playwright/test";

import type { FunctionDeclaration, Statement } from "estree";
// import esprima as "esprima" // doesn't work since esprima may not have a default export; stick to named export
import * as esprima from "esprima";
import escodegen from "escodegen";

const sourcePath = path.join("examples", "workflows", "evaluate-javascript.mjs");

async function parse() {
  console.log('esprima:');
  console.log(esprima);
  console.log('-----');
  let source: string | undefined = undefined;

  try {
    const rawSource = await fs.readFile(sourcePath, "utf-8");
    source = [
      "async function workflow(page) {",
      rawSource,
      "}",
    ].join("\n");
    console.log('source:');
    console.log(source);
    console.log('-----');

    const sourceAst = esprima.parseModule(source, { loc: true, range: true });
    console.log('sourceAst:');
    console.log(JSON.stringify(sourceAst, null, 2));
    console.log('-----');

    const wrapper = sourceAst.body[0] as FunctionDeclaration;
    const workflowStatements = wrapper.body.body;
    console.log('regenerated workflowStatements:');
    for (const [index, statement] of workflowStatements.entries()) {
      console.log(`${index}: ${escodegen.generate(statement)}`);
    }
  } catch (e) {
    console.error(e);
    console.log(JSON.stringify(e, null, 2));

    if (source && typeof e.index === "number") {
      console.log('--- error origin ---');
      const stop = source.indexOf(" ", e.index);
      console.log(source.substring(e.index, stop));
    }
  }
}

/**
 * Gets statements within the default `workflow` function that have a block depth of 1
 * between the given start line and end line (inclusive).
 * 
 * If the range isn't provided, it checks the entire input.
 */
async function getStatementsInRange(source: string, range?: [number, number]) {
  // const [startLine, endLine] = range;
}

class StatementStream extends Readable {
  constructor(statements: Statement[], options?: ReadableOptions) {
    super(options);
    statements.forEach(statement => this.appendStatement(statement));
  }

  appendStatement(statement: Statement) {
    const code = escodegen.generate(statement);
  }
}

async function getPlaywrightContext() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  return page;
}

async function launchRepl(sourceStream: StatementStream) {
  repl.start({
    prompt: '$ ',
    input: sourceStream,
    writer: (output) => {
      // return `[Furu]: ${output}`;
      return `[Playwright]: ${output}`;
      // return `[Browser]: ${output}`;
    }
  })
}

parse();