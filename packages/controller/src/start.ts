import assert from "assert";
import { sendSampleCommand as sendSampleCommand, runClient } from "./client";
import { runServer } from "./server";

const title = "todo-mvc";

async function start() {
  if (process.argv[2] === "client") {
    // Run client test command
    const CONTROLLER_ACCESS_KEY = process.env.FURU_CONTROLLER_ACCESS_KEY;
    assert(CONTROLLER_ACCESS_KEY);

    const { sender } = await runClient({
      accessKey: CONTROLLER_ACCESS_KEY,
      launchLocalServer: true,
    });

    await sendSampleCommand(sender, title);
    setTimeout(() => {
      sender.sendClientOperation({
        opCode: 3,
        data: "stop",
      });
    }, 1000);
  } else if (process.argv[2] === "server" || !process.argv[2]) {
    const CONTROLLER_ACCESS_KEY = process.env.FURU_CONTROLLER_ACCESS_KEY;
    assert(CONTROLLER_ACCESS_KEY);

    runServer({ accessKey: CONTROLLER_ACCESS_KEY });
  } else {
    throw new Error(`Invalid cmd line argument ${process.argv[2]}`)
  }
}

start();