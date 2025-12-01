import { sendSampleCommand as sendSampleCommand, runClient } from "./client";
import { runServer } from "./server";
import { DEFAULT_ACCESS_KEY } from "./utils";

const title = "todo-mvc";

async function start() {
  if (process.argv[2] === "client") {
    // Run client test command
    const { sender } = await runClient({
      accessKey: DEFAULT_ACCESS_KEY,
      launchServer: true,
    });

    await sendSampleCommand(sender, title);
    setTimeout(() => {
      sender.sendClientOperation({
        opCode: 3,
        data: "stop",
      });
    }, 1000);
  } else if (process.argv[2] === "server" || !process.argv[2]) {
    runServer();
  } else {
    throw new Error(`Invalid cmd line argument ${process.argv[2]}`)
  }
}

start();