import net from "net";
import { Console } from "console";
import EventEmitter from "events";
import { ClientOperation, ServerOperation } from "./types";
import util from "util";

export const BUFFER_DELIMITER = '\0\0\0';
export const defaultConsole = { ...console };

export function setGlobalConsole(newConsole: Console) {
  console = newConsole;
}

export function getDefaultConsole() {
  return defaultConsole;
}

export function delay(timeout: number): Promise<void> {
  return new Promise((res) => setTimeout(res, timeout));
}

export function sendServerOperation(
  receiver: net.Socket,
  delimiter: string,
  operation: ServerOperation,
) {
  receiver.write(`${JSON.stringify(operation)}${delimiter}`);
}

export function sendClientOperation(
  receiver: net.Socket,
  delimiter: string,
  operation: ClientOperation,
) {
  receiver.write(`${JSON.stringify(operation)}${delimiter}`);
}

export function nextEmit(emitter: EventEmitter, eventName: string) {
  return new Promise<void>((resolve) => {
    emitter.on(eventName, resolve);
  });
}

export function mergeUint8(arr1: Uint8Array, arr2: Uint8Array) {
  const mergedArray = new Uint8Array(arr1.length + arr2.length);
  mergedArray.set(arr1);
  mergedArray.set(arr2, arr1.length);
  return mergedArray;
}

export function sliceUint8(arr: Uint8Array, start?: number, end?: number) {
  start = Math.max(start || 0, 0);
  end = Math.min(end || arr.length, arr.length);

  const sliceLength = end - start;
  const sliced = new Uint8Array(sliceLength);
  for (let i = 0; i < sliceLength; i++) {
    sliced[i] = arr[start + i];
  }
  return sliced;
}

export class TCPMessageSender {
  receiver: net.Socket;
  delimiter: string;

  constructor(receiver: net.Socket, delimiter: string) {
    this.receiver = receiver;
    this.delimiter = delimiter;
  }

  sendServerOperation(operation: ServerOperation) {
    this.sendOperation(operation);
  }

  sendClientOperation(operation: ClientOperation) {
    this.sendOperation(operation);
  }

  private sendOperation(operation: any) {
    this.receiver.write(`${JSON.stringify(operation)}${this.delimiter}`);
  }
}

export class MessageBuffer {
  delimiter: Uint8Array;
  buffered: Uint8Array;
  encoder: TextEncoder;

  constructor(delimiter: string) {
    this.encoder = new TextEncoder();
    this.delimiter = this.encoder.encode(delimiter);
    this.buffered = new Uint8Array();
  }

  append(incomingData: string) {
    const incomingBuffer = this.encoder.encode(incomingData);
    this.buffered = mergeUint8(this.buffered, incomingBuffer);
  }

  capture() {
    const searchDelta = Math.max(this.buffered.length - this.delimiter.length + 1, this.buffered.length);
    for (let i = 0; i < searchDelta; i++) {
      const slice = sliceUint8(this.buffered, i, i + this.delimiter.length);
      const delimiterFound = slice.every((v, i) => v === this.delimiter[i]);
      if (delimiterFound) {
        const captured = sliceUint8(this.buffered, 0, i);
        this.buffered = sliceUint8(this.buffered, i + this.delimiter.length);
        return Buffer.from(captured).toString();
      }
    }
  }
}

export class ServerConsole extends Console {
  sender: TCPMessageSender;

  constructor(sender: TCPMessageSender) {
    super({ stdout: process.stdout });
    this.sender = sender;
  }

  private sendMessage(severity: number, message: string) {
    this.sender.sendServerOperation({
      opCode: 4,
      data: {
        timestamp: Date.now(),
        origin: "Playwright",
        severity,
        message,
      }
    });
  }

  override log(message?: any, ...optionalParams: any[]): void {
    this.sendMessage(1, util.format("%s", message, ...optionalParams));
    super.log(message, ...optionalParams);
  }

  override error(message?: any, ...optionalParams: any[]): void {
    this.sendMessage(3, util.format("%s", message, ...optionalParams));
    super.log(message, ...optionalParams);
  }
}