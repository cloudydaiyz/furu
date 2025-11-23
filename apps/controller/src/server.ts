import net from "net";
import vm from "vm";
import { executeAllCommands, executeCommand, parseCommands, SETUP_SCRIPT } from "./execute";
import { BlockExecutionStatus, ClientOperation, ExecutionStatus } from "./types";
import { BUFFER_DELIMITER, DELETE_THIS_ACCESS_KEY, MessageBuffer, MessageSender, sendServerOperation } from "./utils";
import { Statement } from "estree";
import escodegen from "escodegen";
import { Browser, BrowserContext, chromium } from "playwright";
import { Console } from "console";
import util from "util";

export const OPERATION_SERVER_PORT = 8124;

export class ServerConsole extends Console {
  sender: MessageSender;

  constructor(sender: MessageSender) {
    super({ stdout: process.stdout });
    this.sender = sender;
  }

  private sendMessage(severity: number, message: string) {
    this.sender.sendServerOperation({
      opCode: 4,
      data: {
        timestamp: Date.now(),
        origin: "Playwright",
        severity,
        message,
      }
    });
  }

  override log(message?: any, ...optionalParams: any[]): void {
    this.sendMessage(1, util.format("%s", message, ...optionalParams));
    super.log(message, ...optionalParams);
  }

  override error(message?: any, ...optionalParams: any[]): void {
    this.sendMessage(3, util.format("%s", message, ...optionalParams));
    super.log(message, ...optionalParams);
  }
}

export function runOperationServer() {
  const operationServer = net.createServer(async (c) => {
    console.log(`client connected`, c.address());
    const sender: MessageSender = new MessageSender(c, BUFFER_DELIMITER);
    const buffer = new MessageBuffer(BUFFER_DELIMITER);
    const logger = new ServerConsole(sender);

    let authenticated = false;
    let browser: Browser | undefined = undefined;
    let browserContext: BrowserContext | undefined = undefined;
    let context: vm.Context | undefined = undefined;

    c.on("data", async (data) => {
      try {
        // console.log('data string', data.toString());
        buffer.append(data.toString());

        let captured = buffer.capture();
        // console.log("captured", captured);
        // console.log('remaining', Buffer.from(buffer.buffered).toString());

        while (captured) {
          const operation = JSON.parse(captured) as ClientOperation;
          console.log(operation);
          // console.log(JSON.stringify(operation, null, 2));

          switch (operation.opCode) {
            case 1:
              if (operation.data.accessKey === DELETE_THIS_ACCESS_KEY) {
                try {
                  authenticated = true;

                  browser = await chromium.launch({ headless: false });
                  browserContext = await browser.newContext();
                  context = vm.createContext({
                    require,
                    fetch,
                    context: browserContext,
                  });

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
                  })

                  await executeAllCommands(context, SETUP_SCRIPT);

                  sender.sendServerOperation({
                    opCode: 1,
                    data: "authenticated"
                  });
                } catch (error) {
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
              if (!authenticated || !context) return;

              const { statements, displacement } = parseCommands(
                operation.data.workflow,
                operation.data.range?.start,
                operation.data.range?.end,
              );

              const blockStatus: BlockExecutionStatus = {};
              let executionStatus: ExecutionStatus = "running";

              const sendStatus = () => sender.sendServerOperation({
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

                  logger.log(`${lineLabel}: ${escodegen.generate(statement)}`);
                  await executeCommand(context, statement);
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
                  logger.error(error);
                  blockStatus[`${startLine}`] = "error";
                  executionStatus = "error";
                  sendStatus();
                  break;
                }
              }
            default:
              break;
          }
          captured = buffer.capture();
        }
      } catch (err) {
        console.error("Error occurred on 'data':");
        console.error(err);
      }
    });

    c.on('close', async () => {
      if (context) {
        await executeAllCommands(context, "await browser.close()");
      }
      console.log('client disconnected');
    });

    setTimeout(() => {
      if (!authenticated) {
        c.end();
      }
    }, 10000);
  });

  operationServer.on('error', (err) => {
    throw err;
  });

  operationServer.listen(OPERATION_SERVER_PORT, () => {
    console.log('server bound');
  });
}

export function runServer() {
  runOperationServer();
}