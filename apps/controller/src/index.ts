import { runServer } from "@cloudydaiyz/furu-controller";
import assert from "assert";

const CONTROLLER_PORT = +process.env.FURU_CONTROLLER_PORT!;
const CONTROLLER_ACCESS_KEY = process.env.FURU_CONTROLLER_ACCESS_KEY!;

assert(CONTROLLER_PORT && CONTROLLER_ACCESS_KEY);

runServer({
  port: CONTROLLER_PORT,
  accessKey: CONTROLLER_ACCESS_KEY,
});