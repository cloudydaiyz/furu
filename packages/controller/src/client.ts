import net from "net";
import path from "path";
import fs from "fs/promises";
import { ClientOperation, ServerOperation, SocketConnection } from "./types";
import { OPERATION_SERVER_PORT } from "./server";
import { BUFFER_DELIMITER, MessageBuffer, MessageSender, ACCESS_KEY } from "./utils";
import { spawn } from "child_process";

const dirname = path.dirname(__filename);

export async function getSampleCommand() {
  const title = "todo-mvc";
  // const title = "hacker-news-sorted";
  // const title = "hacker-news-cwv";
  // const title = "hacker-news-accessibility";
  // const title = "crawl-y-combinator";

  const sourcePath = path.join(dirname, "..", "examples", "workflows", `${title}.mjs`);
  const workflow = await fs.readFile(sourcePath, "utf-8");
  const operation: ClientOperation = {
    opCode: 2,
    data: {
      workflow,
      // executionRange: { start: 1, end: 5 }
    }
  };
  return operation;
}

export function launchServer(accessKey = ACCESS_KEY) {
  const serverFile = path.join(dirname, "start.js");
  console.log(serverFile);
  const child = spawn(process.argv[0], [serverFile], {
    env: { ACCESS_KEY: accessKey },
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
  });
  process.on("exit", () => {
    console.log('error');
    child.kill();
  });
  child.on('error', err => {
    console.log('error');
    console.log(err);
    throw err;
  });
  return child;
}

function connectToServer(accessKey: string, host?: string): SocketConnection {
  let sender: MessageSender;
  const buffer = new MessageBuffer(BUFFER_DELIMITER);

  const serverSocket = net.createConnection(
    { port: OPERATION_SERVER_PORT, host },
    async () => {
      console.log('connected to server!');

      serverSocket.on('data', async (data) => {
        buffer.append(data.toString());
        let captured = buffer.capture();

        while (captured) {
          const operation = JSON.parse(captured) as ServerOperation;
          console.log(operation);

          switch (operation.opCode) {
            case 1:
              // For demo purposes
              const commandOperation = await getSampleCommand();
              sender.sendClientOperation(commandOperation);
              break;
            case 2:
              if (operation.data.error === "auth-error") {
                sender.sendClientOperation({
                  opCode: 1,
                  data: { accessKey }
                });
              } else {
                serverSocket.end();
              }
              break;
            case 3:
              if (operation.data.status !== "running") {
                serverSocket.end();
              }
              break;
            case 4:
              break;
            default:
              break;
          }
          captured = buffer.capture();
        }
      });

      serverSocket.on('end', () => {
        console.log('disconnected from server');
      });
    }
  );

  sender = new MessageSender(serverSocket, BUFFER_DELIMITER);
  sender.sendClientOperation({
    opCode: 1,
    data: { accessKey: ACCESS_KEY }
  });
  return { socket: serverSocket, sender };
}

export async function runClient(accessKey = ACCESS_KEY, launchLocalServer?: boolean) {
  if (launchLocalServer) {
    const socket = await new Promise<SocketConnection>((res) => {
      const server = launchServer(accessKey);
      server.on('message', msg => {
        if (msg === "ready") {
          res(connectToServer(accessKey));
        }
      });
    });
    return socket;
  }
  return connectToServer(accessKey);
}