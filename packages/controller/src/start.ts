import { runClient } from "./client";
import { runServer } from "./server";
import { MessageSender, BUFFER_DELIMITER, ACCESS_KEY } from "./utils";

async function start() {
  if (process.argv[2] === "client") {
    const { sender } = await runClient(undefined, true);
  } else {
    runServer();
  }
}

start();