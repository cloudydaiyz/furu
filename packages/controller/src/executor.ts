import vm from "vm";
import { processTopLevelAwait } from './vendor/node/await';

import type { FunctionDeclaration, Statement } from "estree";
import * as esprima from "esprima";
import escodegen from "escodegen";
import { WorkflowTemplate, WorkflowTemplateDisplacement } from "./types";

export const SETUP_SCRIPT = [
  // 'const { chromium } = require("playwright");',
  'const { test, expect, Locator } = require("@playwright/test");',
  'const { injectAxe, checkA11y, getAxeResults } = require("axe-playwright")',
  // "const browser = await chromium.launch({ headless: false });",
  // "const context = await browser.newContext();",
  // "const page = await context.newPage();",
].join('\n');

export const WORKFLOW_SCRIPT_TEMPLATE: WorkflowTemplate = {
  wrapper: [
    "async function workflow(page) {",
    "}",
  ],
  workflowInsert: 1,
}

export const WORKFLOW_TEST_TEMPLATE: WorkflowTemplate = {
  wrapper: [
    "import { test } from '@playwright/test';",
    `test("workflow", async ({ page }) => {`,
    "});",
  ],
  workflowInsert: 2,
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

export function getWorkflowTemplateDisplacement(template: WorkflowTemplate): WorkflowTemplateDisplacement {
  const startRange = template.wrapper.reduce((acc, line) => acc + line.length + 1, 0);
  const startLine = template.workflowInsert;
  return { startRange, startLine };
}

/**
 * Gets the top-level statements within the given workflow
 * between the given start line and end line (inclusive).
 */
function getStatementsWithinRange(statements: Statement[], startLine?: number, endLine?: number) {
  const withinRange: Statement[] = [];
  const displacement = getWorkflowTemplateDisplacement(WORKFLOW_SCRIPT_TEMPLATE);
  const { startLine: startLineDisplacement } = displacement;
  for (const statement of statements) {
    if (statement.loc
      && (!startLine || statement.loc.start.line >= startLine + startLineDisplacement)
      && (!endLine || statement.loc.start.line <= endLine + startLineDisplacement)
    ) {
      withinRange.push(statement);
    }
  }

  return {
    statements: withinRange,
    displacement,
  };
}

export function parseCommands(
  workflow: string,
  startLine?: number,
  endLine?: number
) {
  const source = buildWorkflowTemplate(workflow, WORKFLOW_SCRIPT_TEMPLATE);
  const sourceAst = esprima.parseModule(source, { loc: true, range: true });
  const workflowStatements = getWorkflowStatements(sourceAst);
  return getStatementsWithinRange(workflowStatements, startLine, endLine);
}

export async function executeCommand(
  context: vm.Context,
  statement: Statement
) {
  const regenerated = escodegen.generate(statement);
  const processedStatement = processStatement(regenerated);
  await Promise.resolve(vm.runInContext(processedStatement, context));
}

export async function executeAllCommands(
  context: vm.Context,
  workflow: string,
  startLine?: number,
  endLine?: number,
) {
  const { statements } = parseCommands(workflow, startLine, endLine);
  for (const [index, statement] of statements.entries()) {
    await executeCommand(context, statement);
  }
}