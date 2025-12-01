import net from "net";
import { WorkflowExecutor } from "./executor";
import { ClientOperation } from "./types";
import { BUFFER_DELIMITER, MessageBuffer, TCPMessageSender } from "./utils";

export const CONTROLLER_PORT = 8124;

export interface ControllerServerOptions {
  accessKey: string,
  onClientOperation?: (op: ClientOperation) => Promise<void>,
}

export function runServer({
  accessKey,
  onClientOperation,
}: ControllerServerOptions) {
  const operationServer = net.createServer(async (connection) => {
    console.log(`client connected`, connection.address());

    const sender = new TCPMessageSender(connection, BUFFER_DELIMITER);
    const buffer = new MessageBuffer(BUFFER_DELIMITER);

    let service: WorkflowExecutor | undefined = undefined;
    let authenticated = false;

    connection.on("data", async (data) => {
      try {
        buffer.append(data.toString());
        let captured = buffer.capture();

        while (captured) {
          const operation = JSON.parse(captured) as ClientOperation;
          console.log(operation);

          if (operation.opCode !== 1 && !authenticated) {
            sender.sendServerOperation({
              opCode: 2,
              data: {
                error: "unauthenticated"
              }
            });
          } else {
            switch (operation.opCode) {
              case 1:
                if (operation.data.accessKey === accessKey) {
                  try {
                    service = await WorkflowExecutor.create(sender);
                    authenticated = true;

                    sender.sendServerOperation({
                      opCode: 1,
                      data: "authenticated"
                    });
                  } catch (error) {
                    console.log(error);
                    sender.sendServerOperation({
                      opCode: 2,
                      data: {
                        error: "auth-error"
                      }
                    });
                  }
                } else {
                  sender.sendServerOperation({
                    opCode: 2,
                    data: {
                      error: "auth-invalid"
                    }
                  });
                }
                break;
              case 2:
                service?.executeWorkflow(
                  operation.data.workflow,
                  operation.data.range,
                  operation.data.resetContext
                );
                break;
              case 3:
                service?.abort("Workflow aborted");
                break;
              case 4:
                service?.setInspecting(operation.data.inspect);
                break;
              case 5:
                service?.resetContext();
                break;
              default:
                break;
            }
          }

          await onClientOperation?.(operation);
          captured = buffer.capture();
        }
      } catch (err) {
        console.error("Error occurred on 'data':");
        console.error(err);
      }
    });

    connection.on('close', async () => {
      service?.close();
      console.log('client disconnected');
    });

    setTimeout(() => {
      if (!authenticated) {
        connection.end();
      }
    }, 10000);
  });

  operationServer.on('error', (err) => {
    throw err;
  });

  operationServer.listen(CONTROLLER_PORT, () => {
    console.log('server bound');
  });

  process.send?.("ready");
  return operationServer;
}