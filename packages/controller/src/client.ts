import net from "net";
import path from "path";
import fs from "fs/promises";
import { ClientOperation, ExecutionRange, ServerOperation, SocketConnection } from "./types";
import { BUFFER_DELIMITER, MessageBuffer, TCPMessageSender } from "./utils";
import { spawn } from "child_process";
import { CONTROLLER_PORT } from "./server";

const MAX_AUTH_RETRIES = 0;

export interface ControllerClientOptions {
  accessKey: string,
  host?: string,
  launchLocalServer?: boolean,
  onServerOperation?: (op: ServerOperation) => Promise<void>,
  maxAuthRetries?: number,
}

export async function sendSampleCommand(sender: TCPMessageSender, title: string, range?: ExecutionRange) {
  const sourcePath = path.join(__dirname, "..", "examples", "workflows", `${title}.mjs`);
  const workflow = await fs.readFile(sourcePath, "utf-8");
  const operation: ClientOperation = {
    opCode: 2,
    data: {
      workflow,
      range,
    }
  };
  sender.sendClientOperation(operation);
}

export function launchLocalServer(accessKey: string) {
  const serverFile = path.join(__dirname, "start.js");

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

function connectToServer({
  accessKey,
  host,
  onServerOperation,
  maxAuthRetries = MAX_AUTH_RETRIES,
}: ControllerClientOptions): SocketConnection {
  let sender: TCPMessageSender;

  const socket = net.createConnection(
    { port: CONTROLLER_PORT, host },
    async () => {
      console.log('connected to server!');

      const buffer = new MessageBuffer(BUFFER_DELIMITER);
      let authRetries = 0;

      socket.on('data', async (data) => {
        buffer.append(data.toString());
        let captured = buffer.capture();

        while (captured) {
          const operation = JSON.parse(captured) as ServerOperation;
          console.log(operation);

          switch (operation.opCode) {
            case 1:
              break;
            case 2:
              if ((operation.data.error === "auth-error"
                || operation.data.error === "unauthenticated")
                && authRetries < maxAuthRetries
              ) {
                sender.sendClientOperation({
                  opCode: 1,
                  data: { accessKey }
                });
                authRetries++;
              } else {
                socket.end();
              }
              break;
            case 3:
              break;
            case 4:
              break;
            case 5:
              console.log("selectedElement", operation.data);
              break;
            case 6:
              break;
            default:
              break;
          }

          await onServerOperation?.(operation);
          captured = buffer.capture();
        }
      });

      socket.on('end', () => {
        console.log('disconnected from server');
      });
    }
  );

  sender = new TCPMessageSender(socket, BUFFER_DELIMITER);
  sender.sendClientOperation({
    opCode: 1,
    data: { accessKey }
  });

  return { socket, sender };
}

export async function runClient(opts: ControllerClientOptions): Promise<SocketConnection> {
  const {
    accessKey,
    launchLocalServer: launchServer
  } = opts;

  if (launchServer) {
    const socket = await new Promise<SocketConnection>((res) => {
      const server = launchLocalServer(accessKey);
      server.on('message', msg => {
        if (msg === "ready") {
          res(connectToServer(opts));
        }
      });
    });
    return socket;
  }

  return connectToServer(opts);
}