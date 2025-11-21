import net from "net";
import { ClientOperation, ServerOperation } from "./types";

export function delay(timeout: number): Promise<void> {
  return new Promise((res) => setTimeout(res, timeout));
}

export function sendOperation(
  receiver: net.Socket,
  operation: ClientOperation | ServerOperation
) {
  receiver.write(JSON.stringify(operation));
}