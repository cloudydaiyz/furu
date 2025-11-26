import net from "net";
import vm from "vm";
import { executeAllCommands, executeCommand, parseCommands, SETUP_SCRIPT } from "./executor";
import { BlockExecutionStatus, ClientOperation, ExecutionRange, ExecutionStatus } from "./types";
import { ACCESS_KEY, BUFFER_DELIMITER, MessageBuffer, MessageSender, ServerConsole } from "./utils";
import { Statement } from "estree";
import escodegen from "escodegen";
import { Browser, BrowserContext, chromium } from "playwright";
import { BrowserContextInspector } from "./inspector";

export const OPERATION_SERVER_PORT = 8124;

interface OperationServerContext {
  sender: MessageSender;
  logger: ServerConsole;
  browser: Browser;
  browserContext: BrowserContext;
  executionContext: vm.Context;
  inspector: BrowserContextInspector;
}

export function runServer(accessKey = ACCESS_KEY) {
  const operationServer = net.createServer(async (connection) => {
    console.log(`client connected`, connection.address());

    const sender = new MessageSender(connection, BUFFER_DELIMITER);
    const buffer = new MessageBuffer(BUFFER_DELIMITER);

    let service: ServerOperationService | undefined = undefined;
    let authenticated = false;

    connection.on("data", async (data) => {
      try {
        buffer.append(data.toString());
        let captured = buffer.capture();

        while (captured) {
          const operation = JSON.parse(captured) as ClientOperation;
          console.log(operation);

          if (operation.opCode !== 1 && !authenticated) {
            sender.sendServerOperation({
              opCode: 2,
              data: {
                error: "unauthenticated"
              }
            });
          } else {
            switch (operation.opCode) {
              case 1:
                if (operation.data.accessKey === accessKey) {
                  try {
                    service = await ServerOperationService.create(sender);

                    authenticated = true;
                    sender.sendServerOperation({
                      opCode: 1,
                      data: "authenticated"
                    });
                  } catch (error) {
                    console.log(error);
                    sender.sendServerOperation({
                      opCode: 2,
                      data: {
                        error: "auth-error"
                      }
                    });
                  }
                } else {
                  sender.sendServerOperation({
                    opCode: 2,
                    data: {
                      error: "auth-invalid"
                    }
                  });
                }
                break;
              case 2:
                service?.executeWorkflow(
                  operation.data.workflow,
                  operation.data.range,
                  operation.data.resetContext
                );
              case 3:
                break;
              case 4:
                service?.setInspecting(operation.data.inspect);
                break;
              case 5:
                service?.resetContext();
                break;
              default:
                break;
            }
          }
          captured = buffer.capture();
        }
      } catch (err) {
        console.error("Error occurred on 'data':");
        console.error(err);
      }
    });

    connection.on('close', async () => {
      service?.close();
      console.log('client disconnected');
    });

    setTimeout(() => {
      if (!authenticated) {
        connection.end();
      }
    }, 10000);
  });

  operationServer.on('error', (err) => {
    throw err;
  });

  operationServer.listen(OPERATION_SERVER_PORT, () => {
    console.log('server bound');
  });

  process.send?.("ready");
}

class ServerOperationService {
  private sender!: MessageSender;
  private logger!: ServerConsole;
  private browser!: Browser;
  private browserContext!: BrowserContext;
  private executionContext!: vm.Context;
  private inspector!: BrowserContextInspector;

  private constructor(params: OperationServerContext) {
    Object.assign(this, params);
  }

  static async create(sender: MessageSender) {
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
      },
    );

    const page = await browserContext.newPage();

    executionContext = vm.createContext({
      require,
      fetch,
      browser,
      context: browserContext,
      console,
      page,
      DESTROY: true,
    });

    const aborter = new AbortController();
    executionContext.aborter = aborter;
    let aborted = false;
    aborter.signal.addEventListener("abort", () => {
      console.log('top-level abort event');
      aborted = true;
      throw new Error('top-level abort');
    });
    await executeAllCommands(executionContext, SETUP_SCRIPT, aborter);

    const serverContext: OperationServerContext = {
      sender,
      logger,
      browser,
      browserContext,
      executionContext,
      inspector,
    }
    return new ServerOperationService(serverContext);
  }

  resetContext() {
    this.executionContext = vm.createContext({
      require,
      fetch,
      browser: this.browser,
      context: this.browserContext,
      page,
    });
    return this.executionContext;
  }

  async executeWorkflow(workflow: string, range?: ExecutionRange, resetContext?: boolean) {
    if (!this.executionContext) return;

    if (resetContext) {
      this.resetContext();
    }

    const { statements, displacement } = parseCommands(
      workflow,
      range?.start,
      range?.end,
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
      const startLine = statement.loc?.start.line as number - displacement.startLine;
      const endLine = statement.loc?.end.line as number - displacement.startLine;
      const nextStatement = statements[index + 1] as Statement | undefined;
      const nextStartLine = nextStatement?.loc?.start.line
        ? nextStatement?.loc?.start.line - displacement.startLine
        : undefined;

      blockStatus[`${startLine}`] = "pending";
      sendStatus();

      try {
        const lineLabel = endLine - startLine
          ? `${startLine} - ${endLine}`
          : `${startLine}`


        this.logger.log(`${lineLabel}: ${escodegen.generate(statement)}`);

        const aborter = new AbortController();
        this.executionContext.aborter = aborter;

        await executeCommand(this.executionContext, statement, aborter);
        for (let i = startLine; i <= endLine; i++) {
          if (i !== endLine || nextStartLine !== endLine) {
            blockStatus[`${i}`] = "success";
          }
        }

        if (index === statements.length - 1) {
          executionStatus = "success";
          sendStatus();
        }
      } catch (error) {
        this.logger.error(error);
        blockStatus[`${startLine}`] = "error";
        executionStatus = "error";
        sendStatus();
        break;
      }
    }
  }

  setInspecting(inspect: boolean) {
    this.inspector.setInspecting(inspect);
  }

  close() {
    const aborter = new AbortController();
    this.executionContext.aborter = aborter;
    return executeAllCommands(this.executionContext, "await browser.close()", aborter);
  }
}