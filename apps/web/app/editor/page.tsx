"use client";

import { CodeEditor } from "@/client/components/CodeEditor";
import { clearLineStatusGutter, freezeEditor, getCodeFromEditor, updateLineStatusGutter } from "@/client/components/gutter";
import { useOperations } from "@/client/hooks/useOperations";
import { todoMvc } from "@/lib/workflows/todo-mvc";
import { BlockExecutionStatus, ExecutionRange, ExecutionStatus, FullExecutionStatus, LogEntry } from "@cloudydaiyz/furu-api";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef, useState } from "react";

const dfmt = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  fractionalSecondDigits: 3,
  hour12: false,
});

const MAX_LOG_ENTRIES = 20;

export default function EditorPage() {
  const editorRef = useRef<EditorView | null>(null);
  const consoleRef = useRef<HTMLDivElement | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('stopped');

  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const {
    isConnected,
    isAuthenticated,
    sendClientOperation,
  } = useOperations({
    onServerOperation: (operation) => {
      if (operation.opCode === 4) {
        if (editorRef.current) {
          updateLineStatusGutter(editorRef.current, operation.data.lines);
        }
        setExecutionStatus(operation.data.status);
      } else if (operation.opCode === 5) {
        setLogEntries((prevEntries) => {
          const prevEntriesToDisplay = prevEntries.length === MAX_LOG_ENTRIES
            ? prevEntries.slice(1)
            : prevEntries;
          return [...prevEntriesToDisplay, operation.data]
        });
      }
    }
  });

  useEffect(() => {
    const uiConsole = consoleRef.current;
    if (uiConsole) {
      uiConsole.scrollTop = uiConsole.scrollHeight - uiConsole.clientHeight;
    }
  }, [logEntries])

  return (
    <div className="flex min-w-5xl h-screen bg-zinc-50 font-sans">
      <div className="h-screen basis-1/2 w-1/2 flex flex-col">
        <div className="w-full h-[70%]">
          <CodeEditor
            editorRef={editorRef}
            content={todoMvc}
            isCurrentVersion={true}
            currentVersionIndex={0}
          />
        </div>
        <div className="w-full h-[30%] p-8 bg-stone-500 justify-start items-start">
          <span className="flex flex-wrap gap-x-4 gap-y-2">
            <button
              type="button"
              className="h-fit bg-stone-700 px-4 py-2 rounded-md"
              onClick={() => {
                const view = editorRef.current;
                if (view) {
                  if (inspecting) {
                    sendClientOperation({
                      opCode: 4,
                      data: { inspect: false }
                    });
                    setInspecting(false);
                  }

                  if (executionStatus === "running") {
                    sendClientOperation({
                      opCode: 3,
                      data: "stop",
                    });
                  }

                  console.log("view.state.selection", view.state.selection, view.state.selection.ranges.length);
                  let range: ExecutionRange | undefined = undefined;
                  const selection = view.state.selection;
                  for (const selRange of selection.ranges) {
                    if (selRange.to - selRange.from > 0) {
                      const start = view.state.doc.lineAt(selRange.from).number;
                      const end = view.state.doc.lineAt(selRange.to).number;
                      range = { start, end };
                      break;
                    }
                  }

                  const workflow = getCodeFromEditor(view);
                  sendClientOperation({
                    opCode: 2,
                    data: { workflow, range, resetContext: true }
                  });
                }
              }}
            >
              {executionStatus === "running" ? "Stop" : "Play"}
            </button>
            <button
              type="button"
              className="h-fit bg-stone-700 px-4 py-2 rounded-md"
              onClick={() => {
                if (editorRef.current) {
                  sendClientOperation({
                    opCode: 4,
                    data: { inspect: !inspecting }
                  });
                  setInspecting(!inspecting);
                }
              }}
            >
              {inspecting ? "Stop inspecting" : "Inspect"}
            </button>
            <button
              type="button"
              className="h-fit bg-stone-700 px-4 py-2 rounded-md"
              onClick={() => {
                if (editorRef.current) {
                  clearLineStatusGutter(editorRef.current);
                }
              }}
            >
              Clear gutter
            </button>
            <button
              type="button"
              className="h-fit bg-stone-700 px-4 py-2 rounded-md"
              onClick={() => {
                if (editorRef.current) {
                  updateLineStatusGutter(editorRef.current, {
                    '1': 'success',
                    '2': 'pending',
                    '3': 'error',
                  });
                }
              }}
            >
              Add gutter
            </button>
            <button
              type="button"
              className="h-fit bg-stone-700 px-4 py-2 rounded-md"
              onClick={() => {
                if (editorRef.current) {
                  console.log(getCodeFromEditor(editorRef.current));
                }
              }}
            >
              Get lines
            </button>
            <button
              type="button"
              className="h-fit bg-stone-700 px-4 py-2 rounded-md"
              onClick={() => {
                if (editorRef.current) {
                  freezeEditor(editorRef.current, !frozen);
                  setFrozen(!frozen);
                }
              }}
            >
              {frozen ? "Unfreeze" : "Freeze"}
            </button>
          </span>
        </div>
      </div>
      <div className="h-screen w-1/2 flex flex-col">
        <div className="w-full h-[60%] bg-stone-200"></div>
        <div
          ref={consoleRef}
          className="w-full h-[40%] py-8 bg-stone-400 flex gap-4 overflow-y-scroll"
          style={{
            fontFamily: "monospace",
          }}
        >
          <table className="w-full h-fit">
            <tbody className="flex flex-col w-full h-fit">
              {
                logEntries.map((entry, i) => (
                  <tr key={`${entry.timestamp} ${i}`} className="flex w-full h-fit px-8 hover:bg-black/5">
                    <td className="w-fit whitespace-nowrap pr-4">
                      {dfmt.format(entry.timestamp)}
                    </td>
                    <td className="grow h-fit">
                      {`[${entry.origin}]`}: {entry.message}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}