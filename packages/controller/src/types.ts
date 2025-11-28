import net from "net";
import { TCPMessageSender } from "./utils";

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

export type ExecutionRange = {
  start?: number;
  end?: number;
};

export type SelectedElementOptions = {
  locators: string[],
  ariaSnapshot: string,
}

/** Messages sent from the server via TCP */
export type ServerOperation = {
  opCode: 1;
  data: "authenticated";
} | {
  opCode: 2;
  data: {
    error: "auth-error" | "auth-invalid" | "unauthenticated"
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
} | {
  opCode: 5;
  data: SelectedElementOptions;
} | {
  opCode: 6;
  data: "context-reset";
}

/** Messages sent from the client via TCP */
export type ClientOperation = {
  opCode: 1;
  data: {
    accessKey: string;
  }
} | {
  opCode: 2;
  data: {
    workflow: string;
    range?: ExecutionRange;
    resetContext?: boolean;
  };
} | {
  opCode: 3;
  data: "stop";
} | {
  opCode: 4;
  data: {
    inspect: boolean;
  }
} | {
  opCode: 5;
  data: "reset-context";
};

export type SocketConnection = {
  socket: net.Socket,
  sender: TCPMessageSender,
}