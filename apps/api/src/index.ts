import 'dotenv/config'

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { runServer, runClient, sendSampleCommand } from '@cloudydaiyz/furu-controller';
import { DEFAULT_ACCESS_KEY, type ApiClientOperation, type ApiServerOperation } from '@cloudydaiyz/furu-api';

const port = 4000;
const controllerAccessKey = DEFAULT_ACCESS_KEY;
const apiAccessKey = DEFAULT_ACCESS_KEY;

const title = "todo-mvc";
// const title = "hacker-news-sorted";
// const title = "hacker-news-cwv";
// const title = "hacker-news-accessibility";
// const title = "crawl-y-combinator";

async function launchApi() {
  const app = express();
  app.use(cors());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000"
    }
  });

  app.get('/', async (req, res) => {
    const { sender } = await runClient({ accessKey: controllerAccessKey });
    await sendSampleCommand(sender, title);
    res.send('Operation sent');
  });

  io.on("connection", (socket) => {
    console.log("New connection!");

    let authenticated = false;
    let controllerLaunched = false;

    const sendServerOperation = (operation: ApiServerOperation) =>
      socket.send("operation", operation);

    const verifyClientAccessKey = async (clientKey: string) => {
      if (clientKey === apiAccessKey) {
        return true;
      }
      return false;
    }

    const launchController = async () => {
      runServer({ accessKey: controllerAccessKey });
      await runClient({ accessKey: controllerAccessKey });
    }

    socket.on("operation", async (operation: ApiClientOperation) => {
      if (operation.opCode !== 1 && !authenticated) {
        sendServerOperation({
          opCode: 2,
          data: {
            error: "unauthenticated"
          }
        });
        return;
      }

      switch (operation.opCode) {
        case 1:
          if (!authenticated) {
            const clientKey = operation.data.accessKey;
            try {
              if (await verifyClientAccessKey(clientKey)) {
                authenticated = true;
              } else {
                sendServerOperation({
                  opCode: 2,
                  data: {
                    error: "auth-invalid",
                  }
                });
                return;
              }
            } catch (error) {
              console.error(error);
              sendServerOperation({
                opCode: 2,
                data: {
                  error: "auth-error"
                }
              });
              return;
            }
          }

          sendServerOperation({
            opCode: 1,
            data: "authenticated",
          });

          if (!controllerLaunched) {
            await launchController();
            controllerLaunched = true;
          }

          sendServerOperation({
            opCode: 3,
            data: "controller-available",
          });

          break;
        default:
          break;
      }
    });
    socket.emit("foo", "Welcome!");
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
    setTimeout(() => socket.disconnect(), 3000);
  });

  httpServer.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  });
}

launchApi();