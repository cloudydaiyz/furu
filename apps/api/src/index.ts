import assert from 'assert';
import { Server } from "socket.io";
import { runClient as runControllerClient, TCPMessageSender, type ClientOperation } from '@cloudydaiyz/furu-controller';
import { type ApiClientOperation, type ApiServerOperation } from '@cloudydaiyz/furu-api';

const API_PORT = 4000;

async function launchApi() {
  const WEB_HOST = process.env.FURU_WEB_HOST;
  const API_ACCESS_KEY = process.env.FURU_API_ACCESS_KEY;
  const CONTROLLER_HOST = process.env.FURU_CONTROLLER_HOST;
  const CONTROLLER_ACCESS_KEY = process.env.FURU_CONTROLLER_ACCESS_KEY;

  assert(API_ACCESS_KEY && CONTROLLER_HOST && CONTROLLER_ACCESS_KEY);

  const io = new Server({
    cors: {
      origin: [
        `http://${WEB_HOST}:3000`,
        `https://${WEB_HOST}:3000`,
        `http://${WEB_HOST}:8080`,
        `https://${WEB_HOST}:8080`,
      ],
    }
  });
  console.log('CONTROLLER_ACCESS_KEY', CONTROLLER_ACCESS_KEY);

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
      if (clientKey === API_ACCESS_KEY) {
        return true;
      }
      return false;
    }

    const launchController = async () => {
      const { sender } = await runControllerClient({
        host: CONTROLLER_HOST,
        accessKey: CONTROLLER_ACCESS_KEY,
        onServerOperation: async (operation) => {
          console.log('controller server operation', operation);
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

  io.listen(API_PORT);
  console.log(`Example app listening on port ${API_PORT}`)
}

launchApi();