import vm from "vm";
import type { FunctionDeclaration, Statement } from "estree";
import * as esprima from "esprima";
import escodegen from "escodegen";
import { processTopLevelAwait } from './vendor/node/await';
import { BlockExecutionStatus, ExecutionRange, ExecutionStatus, WorkflowTemplate, WorkflowTemplateDisplacement } from "./types";
import { Browser, BrowserContext, Page, chromium } from "playwright";
import { BrowserContextInspector } from "./inspector";
import { TCPMessageSender, ServerConsole } from "./utils";

export interface WorkflowExecutionContext {
  sender: TCPMessageSender;
  logger: ServerConsole;
  browser: Browser;
  browserContext: BrowserContext;
  page: Page;
  executionContext: vm.Context;
  inspector: BrowserContextInspector;
  aborter: AbortController;
}

interface VMContext {
  require: typeof require;
  fetch: typeof fetch;
  browser: Browser;
  context: BrowserContext;
  console: typeof console;
  page: Page;
}

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

export function createVMContext(ctx: VMContext) {
  return vm.createContext(ctx);
}

function processStatement(statement: string) {
  return processTopLevelAwait(statement) ?? statement;
}

function getWorkflowStatements(ast: esprima.Program) {
  const wrapper = ast.body[0] as FunctionDeclaration;
  return wrapper.body.body;
}

function useWorkflowTemplate(workflow: string, template: WorkflowTemplate) {
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
  const source = useWorkflowTemplate(workflow, WORKFLOW_SCRIPT_TEMPLATE);
  const sourceAst = esprima.parseModule(source, { loc: true, range: true });
  const workflowStatements = getWorkflowStatements(sourceAst);
  return getStatementsWithinRange(workflowStatements, startLine, endLine);
}

export async function executeCommand(
  context: vm.Context,
  statement: Statement,
) {
  const regenerated = escodegen.generate(statement);
  const processedStatement = processStatement(regenerated);
  await Promise.resolve(
    vm.runInContext(processedStatement, context, { breakOnSigint: true })
  )
}

class AbortError extends Error { }

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

export class WorkflowExecutor {
  private sender!: TCPMessageSender;
  private logger!: ServerConsole;
  private browser!: Browser;
  private browserContext!: BrowserContext;
  private page!: Page;
  private executionContext!: vm.Context;
  private inspector!: BrowserContextInspector;
  private aborter!: AbortController;

  private constructor(params: WorkflowExecutionContext) {
    Object.assign(this, params);
  }

  static async create(sender: TCPMessageSender) {
    const logger = new ServerConsole(sender);

    let browser: Browser;
    let browserContext: BrowserContext;
    let executionContext: vm.Context;
    let inspector: BrowserContextInspector;

    browser = await chromium.launch({ headless: false });
    browserContext = await browser.newContext();

    browserContext.on('console', (consoleMessage) => {
      const message = consoleMessage.text();
      const messageType = consoleMessage.type();
      sender.sendServerOperation({
        opCode: 4,
        data: {
          timestamp: Date.now(),
          origin: "Browser",
          severity: messageType === "debug" ? 0
            : messageType === "warning" ? 2
              : messageType === "error" ? 3
                : 1,
          message,
        }
      });
    });

    inspector = await BrowserContextInspector.create(
      browserContext,
      (opts) => {
        sender.sendServerOperation({
          opCode: 5,
          data: opts,
        });
      }
    );

    const page = await browserContext.newPage();

    executionContext = createVMContext({
      require,
      fetch,
      browser,
      context: browserContext,
      console,
      page,
    });

    const aborter = new AbortController();
    try {
      await executeAllCommands(executionContext, SETUP_SCRIPT);
    } catch (err) {
      console.error("Unable to start ServerOperationService. Error:");
      console.error(err);
      throw err;
    }

    return new WorkflowExecutor({
      sender,
      logger,
      browser,
      browserContext,
      page,
      executionContext,
      inspector,
      aborter,
    });
  }

  resetContext() {
    this.resetAborter();
    this.executionContext = createVMContext({
      require,
      fetch,
      browser: this.browser,
      context: this.browserContext,
      page: this.page,
      console,
    });
    this.sender.sendServerOperation({
      opCode: 6,
      data: "context-reset",
    });
    return this.executionContext;
  }

  resetAborter() {
    this.aborter = new AbortController();
    this.executionContext._abortSignal = this.aborter.signal;
  }

  abort(reason?: any) {
    this.aborter.abort(reason);
  }

  async executeWorkflow(workflow: string, range?: ExecutionRange, resetContext?: boolean) {
    if (!this.executionContext) {
      throw new Error("Execution context is not set up");
    }

    if (resetContext) {
      this.resetContext();
    } else {
      this.resetAborter();
    }

    const { statements, displacement } = parseCommands(
      workflow,
      range?.start,
      range?.end
    );

    const blockStatus: BlockExecutionStatus = {};
    let executionStatus: ExecutionStatus = "running";

    const sendStatus = () => this.sender.sendServerOperation({
      opCode: 3,
      data: {
        lines: blockStatus,
        status: executionStatus,
      }
    });

    for (const [index, statement] of statements.entries()) {
      const startLine = (statement.loc?.start.line as number) - displacement.startLine;
      const endLine = (statement.loc?.end.line as number) - displacement.startLine;
      const nextStatement = statements[index + 1] as Statement | undefined;
      const nextStartLine = nextStatement?.loc?.start.line
        ? nextStatement?.loc?.start.line - displacement.startLine
        : undefined;

      blockStatus[`${startLine}`] = "pending";
      sendStatus();

      try {
        const lineLabel = endLine - startLine
          ? `${startLine} - ${endLine}`
          : `${startLine}`;

        this.logger.log(`${lineLabel}: ${escodegen.generate(statement)}`);

        const result = await Promise.race([
          executeCommand(
            this.executionContext,
            statement,
          ).catch(err => {
            if (!this.aborter.signal.aborted) {
              throw err;
            }
          }),
          new Promise((reject) => {
            const abort = () => {
              console.log('executeCommand aborted');
              reject(new AbortError("Command aborted"));
            }
            this.aborter.signal.addEventListener("abort", abort);
            if (this.aborter.signal.aborted) abort();
          }),
        ]);

        if (result instanceof Error) {
          throw result;
        }

        for (let i = startLine; i <= endLine; i++) {
          if (i !== endLine || nextStartLine !== endLine) {
            blockStatus[`${i}`] = "success";
          }
        }
      } catch (error) {
        this.logger.error(error);
        blockStatus[`${startLine}`] = "error";
        executionStatus = "error";
        sendStatus();
        return;
      }
    }

    executionStatus = "success";
    sendStatus();
  }

  setInspecting(inspect: boolean) {
    this.inspector.setInspecting(inspect);
  }

  async close() {
    this.resetAborter();
    await executeAllCommands(
      this.executionContext,
      "await browser.close()",
    );
  }
}