export interface WorkflowTemplate {
  wrapper: string[];
  workflowInsert: number;
}

export interface WorkflowTemplateDisplacement {
  startRange: number;
  startLine: number;
}

/** Line numbers specifying the range of lines to execute, inclusive */
export interface ExecutionRange {
  start: number;
  end: number;
}

export interface Command {
  workflow: string;
  executionRange?: ExecutionRange;
}

export type ServerOperation = {
  opCode: 1;
  data: {
    sessionId: string;
  }
} | {
  opCode: 2;
  data: "finished";
}

export type ClientOperation = {
  opCode: 1;
  data: Command;
} | {
  opCode: 2;
  data: {
    sessionId: string;
  }
};