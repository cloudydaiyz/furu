import net from "net";
import vm from "vm";
import crypto from "crypto";
import { Console } from "console";
import { executeCommands, SETUP_SCRIPT } from "./execute";
import { ClientOperation, ServerOperation } from "./types";
import { sendOperation } from "./utils";

export interface Session {
  socket: {
    operation: net.Socket;
    console?: net.Socket;
  }
}

const sessionMap = new Map<string, Session>();

export const OPERATION_SERVER_PORT = 8124;
export const CONSOLE_SERVER_PORT = 8125;

export function runOperationServer() {
  const operationServer = net.createServer(async (c) => {
    const sessionId = crypto.randomUUID();
    sessionMap.set(sessionId, { socket: { operation: c } });
    console.log(`client ${sessionId} connected`, c.address());

    const context = vm.createContext({ require });
    await executeCommands(context, SETUP_SCRIPT);

    c.on("data", async (data) => {
      try {
        const session = sessionMap.get(sessionId);
        if (!session) {
          throw new Error("No session");
        }

        const consoleSocket = session.socket.console;
        const clientConsole = consoleSocket
          ? new Console({ stdout: consoleSocket, stderr: consoleSocket })
          : console;
        context.console = clientConsole;

        const operation = JSON.parse(data.toString()) as ClientOperation;
        if (operation.opCode === 1) {
          const { workflow, executionRange } = operation.data;
          await executeCommands(context, workflow, executionRange)
            .finally(() => {
              const finishOperation: ServerOperation = { opCode: 2, data: "finished" };
              sendOperation(c, finishOperation);
            });
        }
      } catch (err) {
        console.error("Error occurred on 'data':", err)
      }
    });

    c.on('close', async () => {
      sessionMap.delete(sessionId);
      await executeCommands(context, "await browser.close()");
      console.log('client disconnected');
    });

    const sessionOperation: ServerOperation = {
      opCode: 1,
      data: { sessionId }
    };
    sendOperation(c, sessionOperation);
  });

  operationServer.on('error', (err) => {
    throw err;
  });

  operationServer.listen(OPERATION_SERVER_PORT, () => {
    console.log('server bound');
  });
}

export function runConsoleServer() {
  const consoleServer = net.createServer(async (c) => {
    console.log(`client connected`, c.address());
    let sessionId: string | undefined = undefined;

    c.on("data", async (data) => {
      try {
        const operation = JSON.parse(data.toString()) as ClientOperation;
        if (operation.opCode === 2) {
          const session = sessionMap.get(operation.data.sessionId);
          if (!session) {
            throw new Error("Invalid session");
          }
          sessionId = operation.data.sessionId;

          session.socket.console = c;
        }
      } catch (err) {
        console.error("Error occurred on 'data':", err)
        c.write(data); // echo
      }
    });

    c.on('close', async () => {
      if (sessionId) {
        const session = sessionMap.get(sessionId);
        if (session) {
          session.socket.console = undefined;
        }
      }
      console.log('client disconnected');
    });
  });

  consoleServer.on('error', (err) => {
    throw err;
  });

  consoleServer.listen(CONSOLE_SERVER_PORT, () => {
    console.log('server bound');
  });
}

export function runServer() {
  runOperationServer();
  runConsoleServer();
}