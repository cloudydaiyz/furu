import { getSampleCommand, runClient } from "./client";
import { runServer } from "./server";
import { ACCESS_KEY } from "./utils";

async function start() {
  if (process.argv[2] === "client") {
    const { sender } = await runClient(ACCESS_KEY, true);
    const commandOperation = await getSampleCommand();
    sender.sendClientOperation(commandOperation);
  } else {
    runServer();
  }
}

start();