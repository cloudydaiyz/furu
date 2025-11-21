// Demonstrates implementing a simple dynamic code executor that supports
// line-by-line execution and top level awaits

import path from "path";
import fs from "fs/promises";
import { PassThrough, Readable, ReadableOptions } from "stream";
import repl, { Recoverable } from "repl";
import http from "http";
import vm from "vm";
import { chromium } from "@playwright/test";
import { processTopLevelAwait } from '../vendor/node/await';

import type { ArrowFunctionExpression, BlockStatement, CallExpression, ExpressionStatement, FunctionDeclaration, Statement } from "estree";
// import esprima as "esprima" // doesn't work since esprima may not have a default export; stick to named export
import * as esprima from "esprima";
import escodegen from "escodegen";

/** Line numbers specifying the range of lines to execute, inclusive */
interface ExecutionRange {
  start: number;
  end: number;
}

interface Command {
  workflow: string;
  executionRange?: ExecutionRange
}

interface WorkflowTemplate {
  wrapper: string[];
  workflowInsert: number;
}

interface WorkflowTemplateDisplacement {
  startRange: number;
  startLine: number;
}

const SETUP_SCRIPT = [
  'const { chromium } = require("playwright");',
  "const browser = await chromium.launch({ headless: false });",
  "const context = await browser.newContext();",
  "const page = await context.newPage();",
].join('\n');

const WORKFLOW_SCRIPT_TEMPLATE: WorkflowTemplate = {
  wrapper: [
    "async function workflow(page) {",
    "}",
  ],
  workflowInsert: 1,
}

const WORKFLOW_TEST_TEMPLATE: WorkflowTemplate = {
  wrapper: [
    "import { test } from '@playwright/test';",
    `test("workflow", async ({ page }) => {`,
    "});",
  ],
  workflowInsert: 2,
}

const title = "todo-mvc";
const sourcePath = path.join("examples", "workflows", `${title}.mjs`);
const context = vm.createContext({ console, require });

async function parse() {
  console.log('esprima:');
  console.log(esprima);
  console.log('-----');
  let source: string | undefined = undefined;

  try {
    const rawSource = await fs.readFile(sourcePath, "utf-8");
    source = [
      "async function workflow(page) {",
      'const { chromium } = require("playwright")',
      "const browser = await chromium.launch({ headless: false })",
      "const context = await browser.newContext()",
      "const page = await context.newPage()",
      rawSource,
      "await browser.close()",
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

    const processStatement = (statement: string) => processTopLevelAwait(statement) ?? statement;

    const context = vm.createContext({ console, require });
    console.log('regenerated workflowStatements:');
    for (const [index, statement] of workflowStatements.entries()) {
      const regenerated = escodegen.generate(statement);
      console.log(`${index}: ${regenerated}`);

      let processedStatement = processStatement(regenerated);
      console.log(`${index} (processed): ${processedStatement}`);

      await Promise.resolve(vm.runInContext(processedStatement, context));
    }
    // const closeStatement = processStatement("await browser.close()");
    // await Promise.resolve(vm.runInContext(closeStatement, context));
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
  await browser.close();
  return page;
}

// From: https://nodejs.org/api/vm.html#class-vmmodule
const resolveAndLinkDependencies: vm.ModuleLinker = (specifier, referencingModule, { attributes }) => {
  // NOTE: module.linkRequests and module.instantiate aren't available
  // on Node.js v22.17.0
  return referencingModule;
}

/**
 * From: https://nodejs.org/api/repl.html#repl-over-curl
 * Make a request using `curl --no-progress-meter -sSNT. localhost:8000`
 */
async function launchCurlRepl() {
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'multipart/octet-stream');

    repl.start({
      prompt: 'curl repl> ',
      input: req,
      output: res,
      terminal: false,
      useColors: true,
      useGlobal: false,
      // eval(cmd, context, filename, callback) {
      //   return defaultReplEval.bind(this)(cmd, context, filename, callback)
      // }
      // eval() {
      //   return createReplEval(this);
      // }
      eval(cmd, context, filename, callback) {
        return replEval(this, cmd, context, filename, callback);
      }
      // eval: createReplModuleEval(),
    });
  });

  server.listen(8000);
}

async function launchFileRepl() {
  // sourceStream: StatementStream
  // repl.start({
  //   prompt: '$ ',
  //   input: sourceStream,
  //   writer: (output) => {
  //     // return `[Furu]: ${output}`;
  //     return `[Playwright]: ${output}`;
  //     // return `[Browser]: ${output}`;
  //   }
  // })

  const fd = await fs.open(sourcePath);
  const rs = fd.createReadStream();
  // console.log(rs);
  repl.start({ input: rs, output: process.stdout, terminal: false });
}

function isRecoverableError(error: Error) {
  if (error.name === 'SyntaxError') {
    return /^(Unexpected end of input|Unexpected token)/.test(error.message);
  }
  return false;
}

/** 
 * Using stdout directly interrupts the stream, you must use a Transform stream
 * that redirects output to stdout instead
 */
function createStdoutProxy() {
  const transform = new PassThrough();
  transform.pipe(process.stdout);
  return transform;
}

function createVmReplEval(throwOnError = false): repl.REPLEval {
  return (cmd, context, filename, callback) => {
    // console.log([...cmd]);
    let result;
    try {
      result = vm.runInContext(cmd, context);
    } catch (e) {
      if (isRecoverableError(e)) {
        return callback(new repl.Recoverable(e), result);
      } else {
        // console.log("Eval error", e);
        if (throwOnError) {
          console.log("throw");
          throw e;
        }
        return callback(null, e);
      }
    }
    // console.log("Line successful");
    callback(null, result);
  }
}

function createReplModuleEval(): repl.REPLEval {
  return async (cmd, context, filename, callback) => {
    console.log([...cmd]);
    let result;
    try {

      // result = vm.runInContext(wrappedCmd, context);
      // Use vm.Module for ESM support (top-level await, etc)
      const module = new vm.SourceTextModule(cmd, { context });
      await module.link(resolveAndLinkDependencies);

      console.log(module);
      console.log(module.linkRequests, module.instantiate, module.link, module.evaluate);
      console.log(context);

      // module.linkRequests([]);
      // module.instantiate();
      const evaluatedModule = await module.evaluate();

      // Get the last expression's result
      result = evaluatedModule;
    } catch (e) {
      if (isRecoverableError(e)) {
        return callback(new repl.Recoverable(e), undefined);
      }
      // logger.log("Eval error", e);
      callback(e, undefined);
    }
    callback(null, result);
  }
}

/** https://github.com/nodejs/node/issues/29719 */
const getDefaultReplEval = () => repl.start('$ ').eval;

/** 
 * Almost good, but the arguments for repl.REPLEval need to be passed in this function,
 * not just the server.
 */
function createReplEval(server: repl.REPLServer, throwOnError = false): repl.REPLEval {
  const defaultReplEval = getDefaultReplEval()

  return (cmd, context, filename, callback) => {
    // console.log([...cmd]);
    let result;
    try {
      result = defaultReplEval.bind(server)(cmd, context, filename, callback);
    } catch (e) {
      console.log("Eval error", e);
      if (throwOnError) {
        throw e;
      }
      return callback(null, e);
    }
    console.log("Line successful");
    callback(null, result);
  }
}

type REPLEvalCallback = (err: Error | null, result: any) => void;

function replEval(
  self: repl.REPLServer,
  cmd: string,
  context: vm.Context,
  filename: string,
  callback: REPLEvalCallback,
  throwOnError?: boolean,
) {
  const defaultReplEval = getDefaultReplEval()
  // console.log([...cmd]);

  const callbackWrapper: REPLEvalCallback = (err, result) => {
    console.log("cmd", cmd);
    if (err && !(err instanceof Recoverable)) {
      console.log("Eval error", err);
    } else {
      console.log("Line successful");
    }
    callback(err, result);
  }

  defaultReplEval.bind(self)(cmd, context, filename, callbackWrapper);
}

async function launchRepl() {
  const readable = new Readable({ read: () => { } });

  // const output = process.stdout;
  // const output = fsCallback.createWriteStream("null", { fd: 1 });
  const output = createStdoutProxy();

  repl.start({
    prompt: '$ ',
    input: readable,
    output,
    terminal: false,
    eval() {
      return createReplEval(this);
    }
  });

  readable.push('const { chromium } = require("playwright");\n');
  readable.push("1 + 1\n");
  // console.log("Hello world");
  readable.push("2 + 1\n");
  readable.push("function hello() {\n");
  // console.log("1");
  readable.push("  return 'world';\n");
  // console.log("2");
  readable.push("}\n");
  // console.log("3");
  readable.push("hello()\n");
  // console.log("Hello again world");
  readable.push("chromium\n");
}

async function launchParsedRepl() {
  let source: string | undefined = undefined;

  try {
    const rawSource = await fs.readFile(sourcePath, "utf-8");

    // In workflows, the page object is assumed to be defined, so
    // the source is wrapped in a function to avoid syntax errors.

    source = [
      "(async () => {",
      "const { chromium } = require('playwright')",
      "const browser = await chromium.launch({ headless: false })",
      "context = await browser.newContext()",
      "page = await context.newPage()",
      rawSource,
      "})()"
    ].join("\n");

    // Make sure "pnpm exec playwright install" is called before this

    const sourceAst = esprima.parseModule(source, { loc: true, range: true });
    const wrapper = sourceAst.body[0] as ExpressionStatement;
    const expression = wrapper.expression as CallExpression;
    const callee = expression.callee as ArrowFunctionExpression;
    const workflowStatements = (callee.body as BlockStatement).body;

    const readable = new Readable({ read: () => { } });
    // const readable = Readable.from(workflowStatements);

    // const output = process.stdout;
    // const output = fsCallback.createWriteStream("null", { fd: 1 });
    const output = createStdoutProxy();

    // repl.start({
    //   prompt: '$ ',
    //   input: readable,
    //   output,
    //   terminal: false,
    //   eval(cmd, context, filename, callback) {
    //     return replEval(this, cmd, context, filename, callback);
    //   }
    // });

    for (const [index, statement] of workflowStatements.entries()) {
      const regenerated = `${escodegen.generate(statement)}`;
      console.log(`${index}: ${regenerated}`)
      // readable.push(regenerated);
    }
  } catch (e) {
    console.error('FATAL ERROR:');
    console.error(e);

    if (source && typeof e.index === "number") {
      console.log('--- error origin ---');
      const stop = source.indexOf(" ", e.index);
      console.log(source.substring(e.index, stop));
    }
  }
}

async function runWithTopLevelAwait() {
  const context = {
    animal: 'cat',
    count: 2,
  };
  const script = new vm.Script('count += 1; name = "kitty";');

  vm.createContext(context);
  for (let i = 0; i < 10; ++i) {
    script.runInContext(context);
  }
  console.log(context);

  const asyncScript = new vm.Script(`
async function hello() {
  console.log("world")    
}
await hello()`);
  asyncScript.runInContext(context);
}

function processStatement(statement: string) {
  return processTopLevelAwait(statement) ?? statement
}

function getWorkflowStatements(ast: esprima.Program) {
  const wrapper = ast.body[0] as FunctionDeclaration;
  return wrapper.body.body;
}

function buildWorkflowTemplate(workflow: string, template: WorkflowTemplate) {
  const script = template.wrapper.slice();
  script.splice(template.workflowInsert, 0, workflow);
  return script.join("\n");
}

function getWorkflowTemplateDisplacement(template: WorkflowTemplate): WorkflowTemplateDisplacement {
  const startRange = template.wrapper.reduce((acc, line, i) => acc + line.length + 1, 0);
  const startLine = template.workflowInsert;
  return { startRange, startLine };
}

async function executeCommands(context: vm.Context, workflow: string, range?: ExecutionRange) {
  let source: string | undefined = undefined;
  try {
    source = buildWorkflowTemplate(workflow, WORKFLOW_SCRIPT_TEMPLATE);
    const sourceAst = esprima.parseModule(source, { loc: true, range: true });
    const wrapper = sourceAst.body[0] as FunctionDeclaration;
    const workflowStatements = wrapper.body.body;

    let selectedStatements: Statement[];
    if (range) {
      const { start, end } = range;
      selectedStatements = getStatementsWithinRange(workflow, start, end);
    } else {
      selectedStatements = workflowStatements;
    }

    for (const [index, statement] of workflowStatements.entries()) {
      const regenerated = escodegen.generate(statement);
      let processedStatement = processStatement(regenerated);
      await Promise.resolve(vm.runInContext(processedStatement, context));
    }
  } catch (e) {
    console.error(e);
    if (source && typeof e.index === "number") {
      console.log('--- error origin ---');
      const stop = source.indexOf(" ", e.index);
      console.log(source.substring(e.index, stop));
    }
  }
}

async function generateWorkflowFiles(title: string, workflow?: string) {
  if (!workflow) {
    workflow = await fs.readFile(sourcePath, "utf-8");
    await fs.mkdir(`.hidden/workflow`, { recursive: true });
    await fs.writeFile(`.hidden/workflow/${title}.mjs`, workflow);
  }

  const test = buildWorkflowTemplate(workflow, WORKFLOW_TEST_TEMPLATE);
  await fs.mkdir(`.hidden/test`, { recursive: true });
  await fs.writeFile(`.hidden/test/${title}.spec.ts`, test);

  const script = buildWorkflowTemplate(workflow, WORKFLOW_SCRIPT_TEMPLATE);
  await fs.mkdir(`.hidden/script`, { recursive: true });
  await fs.writeFile(`.hidden/script/${title}.mjs`, script);

  const sourceAst = esprima.parseModule(script, { loc: true, range: true });
  await fs.mkdir(`.hidden/ast`, { recursive: true });
  await fs.writeFile(`.hidden/ast/${title}.json`, JSON.stringify(sourceAst, null, 2));

  const wrapper = sourceAst.body[0] as FunctionDeclaration;
  const workflowStatements = wrapper.body.body;
  return { workflow, sourceAst, workflowStatements }
}

function getStatementsWithinRange(workflow: string, startLine: number, endLine: number) {
  const script = buildWorkflowTemplate(workflow, WORKFLOW_SCRIPT_TEMPLATE);
  const sourceAst = esprima.parseModule(script, { loc: true, range: true });
  const workflowStatements = getWorkflowStatements(sourceAst);

  const withinRange: Statement[] = [];
  const { startLine: startLineDisplacement } = getWorkflowTemplateDisplacement(WORKFLOW_SCRIPT_TEMPLATE);
  for (const statement of workflowStatements) {
    if (statement.loc
      && statement.loc.start.line >= startLine + startLineDisplacement
      && statement.loc.start.line <= endLine + startLineDisplacement
    ) {
      withinRange.push(statement);
    }
  }
  return withinRange;
}

async function testGetStatementsWithinRange() {
  const { workflow } = await generateWorkflowFiles(title);
  const statements = getStatementsWithinRange(workflow, 15, 32);

  for (const [index, statement] of statements.entries()) {
    const regenerated = escodegen.generate(statement);
    console.log(`${index}: ${regenerated}`);
  }
  console.log('displacement', getWorkflowTemplateDisplacement(WORKFLOW_SCRIPT_TEMPLATE));
}

// parse();
// launchCurlRepl();
// launchFileRepl();
// launchRepl();
// launchParsedRepl();
// runWithTopLevelAwait();
// testGetStatementsWithinRange()

executeCommands(context, SETUP_SCRIPT)
  .then(() => fs.readFile(sourcePath, "utf-8"))
  .then(workflow => executeCommands(context, workflow, { start: 1, end: 43 }))
  .finally(() => executeCommands(context, "await browser.close()"));