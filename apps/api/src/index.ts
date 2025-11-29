import 'dotenv/config'

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { runServer, runClient, sendSampleCommand, TCPMessageSender, type ClientOperation } from '@cloudydaiyz/furu-controller';
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
    let controllerSender: TCPMessageSender;

    const sendApiServerOperation = (operation: ApiServerOperation) =>
      socket.emit("operation", operation);

    const sendControllerClientOperation = (operation: ClientOperation) =>
      controllerSender.sendClientOperation(operation);

    const verifyClientAccessKey = async (clientKey: string) => {
      if (clientKey === apiAccessKey) {
        return true;
      }
      return false;
    }

    const launchController = async () => {
      runServer({ accessKey: controllerAccessKey });
      const { sender } = await runClient({
        accessKey: controllerAccessKey,
        onServerOperation: async (operation) => {
          switch (operation.opCode) {
            case 1:
              break;
            case 2:
              break;
            case 3:
              sendApiServerOperation({
                opCode: 4,
                data: operation.data,
              });
              break;
            case 4:
              sendApiServerOperation({
                opCode: 5,
                data: operation.data,
              });
              break;
            case 5:
              sendApiServerOperation({
                opCode: 6,
                data: operation.data,
              });
              break;
            case 6:
              sendApiServerOperation({
                opCode: 7,
                data: operation.data,
              });
              break;
            default:
              break;
          }
        }
      });
      controllerSender = sender;
    }

    socket.on("operation", async (operation: ApiClientOperation) => {
      console.log("operation", operation);

      if (operation.opCode !== 1 && !authenticated) {
        sendApiServerOperation({
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
                sendApiServerOperation({
                  opCode: 2,
                  data: {
                    error: "auth-invalid",
                  }
                });
                return;
              }
            } catch (error) {
              console.error(error);
              sendApiServerOperation({
                opCode: 2,
                data: {
                  error: "auth-error"
                }
              });
              return;
            }
          }

          sendApiServerOperation({
            opCode: 1,
            data: "authenticated",
          });

          if (!controllerLaunched) {
            await launchController();
            controllerLaunched = true;
          }

          sendApiServerOperation({
            opCode: 3,
            data: "controller-available",
          });

          break;
        case 2:
        case 3:
        case 4:
        case 5:
          sendControllerClientOperation(operation);
          break;
        default:
          break;
      }
    });

    socket.emit("foo", "Welcome!");
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });

  httpServer.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  });
}

launchApi();