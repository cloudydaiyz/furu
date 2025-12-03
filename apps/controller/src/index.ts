import { runServer } from "@cloudydaiyz/furu-controller";
import assert from "assert";

async function launchController() {
  const CONTROLLER_ACCESS_KEY = process.env.FURU_CONTROLLER_ACCESS_KEY;
  assert(CONTROLLER_ACCESS_KEY);

  runServer({
    accessKey: CONTROLLER_ACCESS_KEY,
    onClientOperation: async (op) => {
      console.log("process.env");
      console.log(process.env);
    }
  });
}

launchController();