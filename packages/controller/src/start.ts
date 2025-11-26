import { runClient } from "./client";
import { runServer } from "./server";
import { ACCESS_KEY } from "./utils";

async function start() {
  if (process.argv[2] === "client") {
    await runClient(ACCESS_KEY, true);
  } else {
    runServer();
  }
}

start();