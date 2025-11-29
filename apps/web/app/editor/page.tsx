"use client";

import { CodeEditor } from "@/client/components/CodeEditor";
import { clearLineStatusGutter, freezeEditor, getCodeFromEditor, updateLineStatusGutter } from "@/client/components/gutter";
import { useOperations } from "@/client/hooks/useOperations";
import { cn, getSelectedElementCommand, getSelectedActionLabel } from "@/lib/util";
import { todoMvc } from "@/lib/workflows/todo-mvc";
import { BlockExecutionStatus, ExecutionRange, ExecutionStatus, FullExecutionStatus, LogEntry, SELECTED_ELEMENT_ACTIONS, SelectedElementAction, SelectedElementOptions } from "@cloudydaiyz/furu-api";
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

interface EditorConsoleProps {
  ref: React.RefObject<HTMLDivElement | null>,
  logEntries: LogEntry[],
}

function EditorConsole({ ref, logEntries }: EditorConsoleProps) {
  return (
    <div
      ref={ref}
      className="w-full h-full py-4 bg-stone-400 flex gap-4 overflow-y-scroll"
      style={{
        fontFamily: "monospace",
      }}
    >
      <table className="w-full h-fit">
        <tbody className="flex flex-col w-full h-fit">
          {
            logEntries.map((entry, i) => (
              <tr
                key={`${entry.timestamp} ${i}`}
                className={
                  cn(
                    "flex w-full h-fit px-8 hover:bg-black/10",
                    entry.severity === 2 && "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/15",
                    entry.severity === 3 && "bg-red-500/10 hover:bg-red-500/20",
                  )
                }
              >
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
  )
}

type EditorTab = "logs" | "elements";

export default function WorkflowEditor() {
  const editorRef = useRef<EditorView | null>(null);
  const consoleRef = useRef<HTMLDivElement | null>(null);
  const selectActionRef = useRef<HTMLSelectElement | null>(null);
  const selectLocatorRef = useRef<HTMLSelectElement | null>(null);
  const copyBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastCopiedRef = useRef(0);

  const [tab, setTab] = useState<EditorTab>("logs");

  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('stopped');
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  const [inspecting, setInspecting] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElementOptions | null>(null);
  const [selectedAction, setSelectedAction] = useState<SelectedElementAction | null>(null);
  const [selectedLocator, setSelectedLocator] = useState<string | null>(null);
  const [selectedElementCommand, setSelectedElementCommand] = useState<string | null>(null);

  const selectTab = (tab: EditorTab) => {
    if (tab === "logs") {
      if (inspecting) {
        sendClientOperation({
          opCode: 4,
          data: { inspect: false }
        });
        setInspecting(false);
        setSelectedAction(null);
        setSelectedLocator(null);
        setSelectedElement(null);
      }
      setTab("logs");
    } else if (tab === "elements") {
      sendClientOperation({
        opCode: 4,
        data: { inspect: true }
      });
      setInspecting(true);
      setTab("elements");
    }
  }

  const {
    isConnected,
    isAuthenticated,
    sendClientOperation,
  } = useOperations({
    onConnect: () => {
      setExecutionStatus("stopped");
      selectTab("logs");
    },
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
      } else if (operation.opCode === 6) {
        setSelectedAction(null);
        setSelectedLocator(null);
        setSelectedElement(operation.data);
      }
    },
    onDisconnect: () => {
      if (editorRef.current) {
        clearLineStatusGutter(editorRef.current);
      }
      setLogEntries([]);
      setExecutionStatus("stopped");
      setInspecting(false);
      setSelectedAction(null);
      setSelectedLocator(null);
      setSelectedElement(null);
      selectTab("logs");
    }
  });

  useEffect(() => {
    const uiConsole = consoleRef.current;
    if (uiConsole) {
      uiConsole.scrollTop = uiConsole.scrollHeight - uiConsole.clientHeight;
    }
  }, [logEntries]);

  useEffect(() => {
    if (selectActionRef.current && !selectedAction) {
      selectActionRef.current.value = "null";
    }
    if (selectLocatorRef.current && !selectedLocator) {
      selectLocatorRef.current.value = "null";
    }

    if (selectedElement && selectedAction && selectedLocator) {
      const command = getSelectedElementCommand(
        selectedAction,
        selectedLocator,
        selectedElement.ariaSnapshot,
      );
      setSelectedElementCommand(command);
    } else {
      setSelectedElementCommand(null);
    }
  }, [selectedElement, selectedAction, selectedLocator])

  console.log("elementOptions selectedAction selectedLocator", selectedElement, selectedAction, selectedLocator);
  console.log("selectedElementCommand", selectedElementCommand);

  return (
    <div className="flex min-w-5xl h-screen bg-zinc-50 font-sans">
      <div className="h-dvh basis-1/2 w-1/2 flex flex-col">
        <div className="w-full grow overflow-hidden">
          <CodeEditor
            editorRef={editorRef}
            content={todoMvc}
            isCurrentVersion={true}
            currentVersionIndex={0}
          />
        </div>
        <div className="flex flex-row-reverse w-full h-fit p-2 bg-stone-500 justify-start items-start">
          <button
            type="button"
            className="h-fit w-40 bg-stone-700 px-4 py-2 rounded-md hover:bg-stone-800"
            onClick={() => {
              const view = editorRef.current;
              if (view) {
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
                selectTab("logs");
              }
            }}
          >
            {executionStatus === "running" ? "Stop" : "Play"}
          </button>
        </div>
      </div>
      <div className="h-screen w-1/2 flex flex-col">
        <div className="w-full h-[60%] bg-stone-200"></div>
        <div className="w-full h-[40%] bg-stone-400 flex flex-col">
          <div className="px-4 flex bg-stone-500">
            <button
              type="button"
              className={cn("h-fit px-4 py-2", tab === "logs" ? "font-bold bg-stone-400" : "hover:bg-black/5")}
              onClick={() => selectTab("logs")}
            >
              Logs
            </button>
            <button
              type="button"
              className={cn("h-fit px-4 py-2", tab === "elements" ? "font-bold bg-stone-400" : "hover:bg-black/5")}
              onClick={() => selectTab("elements")}
            >
              Elements
            </button>
          </div>
          {
            tab === "logs" ? (
              <EditorConsole
                ref={consoleRef}
                logEntries={logEntries}
              />
            ) : tab === "elements" ? (
              <div
                className="w-full h-full py-4 px-8 bg-stone-400 flex flex-col"
              >
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <h4 className="font-semibold">
                      {selectedElement ? "Element selected" : "No element selected"}
                    </h4>
                    <button
                      type="button"
                      className={cn("w-fit h-fit px-2 py-1 rounded-md bg-stone-700 hover:bg-stone-800", !selectedElement && "invisible")}
                      onClick={() => setSelectedElement(null)}
                    >
                      Deselect
                    </button>
                  </div>
                  {
                    selectedElement ? (
                      <>
                        <div className="flex items-center gap-4 mb-2">
                          <label htmlFor="action-select" className="w-16">Action</label>
                          <select
                            ref={selectActionRef}
                            id="action-select"
                            name="action-select"
                            className="bg-black/20 rounded-md py-1 px-2 w-40"
                            onInput={(e) => {
                              const value = e.currentTarget.value;
                              setSelectedAction(value === "null" ? null : value as SelectedElementAction);
                            }}
                          >
                            <option value="null">
                              Select an action
                            </option>
                            {
                              SELECTED_ELEMENT_ACTIONS.map((action) => (
                                <option key={action} value={action}>
                                  {getSelectedActionLabel(action)}
                                </option>
                              ))
                            }
                          </select>
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                          <label htmlFor="locator-select" className="w-16">Locator</label>
                          <select
                            ref={selectLocatorRef}
                            id="locator-select"
                            name="locator-select"
                            className="bg-black/20 rounded-md py-1 px-2 w-100"
                            onInput={(e) => {
                              const value = e.currentTarget.value;
                              setSelectedLocator(value === "null" ? null : value);
                            }}
                          >
                            <option value="null">
                              Select a locator
                            </option>
                            {
                              selectedElement.locators.map((locator) => (
                                <option key={locator} value={locator}>
                                  {locator}
                                </option>
                              ))
                            }
                          </select>
                        </div>
                        <div className="flex gap-2 px-4 py-2 bg-black/25 mb-4">
                          <input
                            key={`${selectedAction}${selectedLocator}`}
                            type="text"
                            id="command"
                            value={selectedElementCommand ?? "No command selected."}
                            className="grow"
                            readOnly
                          />
                          <button
                            ref={copyBtnRef}
                            type="button"
                            className="w-fit px-2 py-1 rounded-md bg-white text-stone-700 hover:bg-stone-200"
                            onClick={async () => {
                              if (selectedElementCommand) {
                                await navigator.clipboard.writeText(selectedElementCommand);
                                const newLastCopied = Date.now();
                                lastCopiedRef.current = newLastCopied;

                                const btn = copyBtnRef.current;
                                if (!btn) return;
                                btn.innerText = "Copied!";
                                btn.dataset.copied = "true";

                                setTimeout(() => {
                                  if (
                                    copyBtnRef.current
                                    && lastCopiedRef.current === newLastCopied
                                  ) {
                                    copyBtnRef.current.innerText = "Copy";
                                  }
                                }, 2000);
                              }
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </>
                    ) : (
                      <p>
                        Select an element from your website or app, then choose an action and which selector you want to use.
                      </p>
                    )
                  }
                </>
              </div>
            ) : undefined
          }
        </div>
      </div>
    </div>
  );
}