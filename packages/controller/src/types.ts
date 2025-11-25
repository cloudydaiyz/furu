import net from "net";
import { MessageSender } from "./utils";

export interface WorkflowTemplate {
  wrapper: string[];
  workflowInsert: number;
}

export interface WorkflowTemplateDisplacement {
  startRange: number;
  startLine: number;
}

export type LineExecutionStatus = "pending" | "success" | "error";

export type BlockExecutionStatus = {
  [line: `${number}`]: LineExecutionStatus;
}

export type ExecutionStatus = "running" | "stopped" | "success" | "error";

export type ServerOperation = {
  opCode: 1;
  data: "authenticated";
} | {
  opCode: 2;
  data: {
    error: "auth-error" | "auth-invalid"
  }
} | {
  opCode: 3;
  data: {
    lines: BlockExecutionStatus,
    status: ExecutionStatus;
  }
} | {
  opCode: 4;
  data: {
    timestamp: number;
    origin: string;
    severity: number;
    message: string;
  }
}

export type ClientOperation = {
  opCode: 1;
  data: {
    accessKey: string;
  }
} | {
  opCode: 2;
  data: {
    workflow: string;
    range?: {
      start?: number;
      end?: number;
    };
  };
} | {
  opCode: 3;
  data: "stop";
};

export type SocketConnection = {
  socket: net.Socket,
  sender: MessageSender,
}