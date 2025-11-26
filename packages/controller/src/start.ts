import { getSampleCommand, runClient } from "./client";
import { runServer } from "./server";
import { ACCESS_KEY } from "./utils";

async function start() {
  if (process.argv[2] === "client") {
    const { sender } = await runClient(ACCESS_KEY, true);
    // const commandOperation = await getSampleCommand();
    // sender.sendClientOperation(commandOperation);
  } else if (process.argv[2] === "server" || !process.argv[2]) {
    runServer();
  } else if (process.argv[2] === "executor") {

  } else {
    throw new Error(`Invalid cmd line argument ${process.argv[2]}`)
  }
}

start();