import net from "net";
import path from "path";
import fs from "fs/promises";
import { ClientOperation, ServerOperation } from "./types";
import { OPERATION_SERVER_PORT } from "./server";
import { sendClientOperation, DELETE_THIS_ACCESS_KEY, BUFFER_DELIMITER, MessageBuffer, MessageSender } from "./utils";

async function getSampleCommand() {
  // const title = "todo-mvc";
  // const title = "hacker-news-sorted";
  // const title = "hacker-news-cwv";
  const title = "hacker-news-accessibility";
  // const title = "crawl-y-combinator";

  const sourcePath = path.join("examples", "workflows", `${title}.mjs`);
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

function launchServer() {

}

function connectToServer(accessKey: string) {
  let authenticated = false;
  let sender: MessageSender;
  const buffer = new MessageBuffer(BUFFER_DELIMITER);

  const serverSocket = net.createConnection(
    { port: OPERATION_SERVER_PORT },
    async () => {
      console.log('connected to server!');

      serverSocket.on('data', async (data) => {
        // console.log('data string', data.toString());
        buffer.append(data.toString());

        let captured = buffer.capture();
        // console.log("captured", captured);
        // console.log('remaining', Buffer.from(buffer.buffered).toString());

        while (captured) {
          const operation = JSON.parse(captured) as ServerOperation;
          console.log(operation);
          // console.log(JSON.stringify(operation, null, 2));

          switch (operation.opCode) {
            case 1:
              authenticated = true;

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
    data: { accessKey }
  });
}

export function runClient() {
  connectToServer(DELETE_THIS_ACCESS_KEY);
}