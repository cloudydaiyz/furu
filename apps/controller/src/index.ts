import { runClient } from "./client";
import { runServer } from "./server";

if (process.argv[2] === "client") {
  runClient();
} else {
  runServer();
}