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

/** Messages sent from the client via Websocket */
export type ApiClientOperation = {
  opCode: 1,
  data: {
    accessKey: string,
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

/** Messages sent from the server via Websocket */
export type ApiServerOperation = {
  opCode: 1,
  data: "authenticated"
} | {
  opCode: 2,
  data: {
    error: "auth-error" | "auth-invalid" | "unauthenticated"
  }
} | {
  opCode: 3,
  data: "controller-available" | "controller-unavailable",
} | {
  opCode: 4;
  data: {
    lines: BlockExecutionStatus,
    status: ExecutionStatus;
  }
} | {
  opCode: 5;
  data: {
    timestamp: number;
    origin: string;
    severity: number;
    message: string;
  }
} | {
  opCode: 6;
  data: SelectedElementOptions;
} | {
  opCode: 7;
  data: "context-reset";
}