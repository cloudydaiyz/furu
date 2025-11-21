import net from "net";
import path from "path";
import fs from "fs/promises";
import { Command, ClientOperation, ServerOperation } from "./types";
import { CONSOLE_SERVER_PORT, OPERATION_SERVER_PORT } from "./server";
import { sendOperation } from "./utils";

async function getSampleCommand() {
  // const title = "todo-mvc";
  // const title = "hacker-news-sorted";
  const title = "hacker-news-cwv";
  const sourcePath = path.join("examples", "workflows", `${title}.mjs`);
  const workflow = await fs.readFile(sourcePath, "utf-8");
  const clientOperation: ClientOperation = {
    opCode: 1,
    data: {
      workflow,
      // executionRange: { start: 1, end: 5 }
    }
  };
  return clientOperation;
}

export function runClient() {


  let sessionId: string | undefined = undefined;

  const operationClient = net.createConnection(
    { port: OPERATION_SERVER_PORT },
    async () => {
      console.log('connected to server!');

      operationClient.on('data', async (rawData) => {
        const data = rawData.toString();
        const operation = JSON.parse(data.toString()) as ServerOperation;
        console.log(operation);

        if (operation.opCode === 1) {
          sessionId = operation.data.sessionId;
          confirmConsoleSession();

          const commandOperation = await getSampleCommand();
          sendOperation(operationClient, commandOperation);
        } else if (operation.opCode === 2) {
          operationClient.end();
          consoleClient.end();
        }
      });

      operationClient.on('end', () => {
        console.log('disconnected from server');
      });
    }
  );

  const consoleClient = net.createConnection(
    { port: CONSOLE_SERVER_PORT },
    async () => {
      console.log('connected to server!');

      consoleClient.on('data', (rawData) => {
        const data = rawData.toString();
        process.stdout.write(data);
      });

      consoleClient.on('end', () => {
        console.log();
        console.log('disconnected from server');
      });
    }
  );

  function confirmConsoleSession() {
    if (!sessionId) return;

    const operation: ClientOperation = {
      opCode: 2,
      data: { sessionId }
    };
    sendOperation(consoleClient, operation);
  }
}