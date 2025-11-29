"use client";

import { CodeEditor } from "@/client/components/CodeEditor";
import { clearLineStatusGutter, freezeEditor, getCodeFromEditor, updateLineStatusGutter } from "@/client/components/gutter";
import { todoMvc } from "@/lib/workflows/todo-mvc";
import { EditorView } from "@codemirror/view";
import { useRef, useState } from "react";

export default function EditorPage() {
  const editorRef = useRef<EditorView | null>(null);
  const [frozen, setFrozen] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-50 font-sans">
      <div className="h-screen w-3/5 flex flex-col">
        <div className="w-full h-[70%]">
          <CodeEditor
            editorRef={editorRef}
            content={todoMvc}
            onSaveContent={function (updatedContent: string, debounce: boolean): void {
              // console.log("onSaveContent updatedContent debounce\n", updatedContent, '\n', debounce);
            }}
            isCurrentVersion={true}
            currentVersionIndex={0}
          />
        </div>
        <div className="w-full grow p-8 bg-stone-500 flex gap-4">
          <button
            type="button"
            className="h-fit bg-stone-700 px-4 py-2 rounded-md"
            onClick={() => {
              console.log("Woah");
              if (editorRef.current) {
                clearLineStatusGutter(editorRef.current);
              }
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="h-fit bg-stone-700 px-4 py-2 rounded-md"
            onClick={() => {
              console.log("Woah");
              if (editorRef.current) {
                updateLineStatusGutter(editorRef.current, {
                  '1': 'success',
                  '2': 'pending',
                  '3': 'error',
                });
              }
            }}
          >
            Add
          </button>
          <button
            type="button"
            className="h-fit bg-stone-700 px-4 py-2 rounded-md"
            onClick={() => {
              console.log("Woah");
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
              console.log("Woah");
              if (editorRef.current) {
                freezeEditor(editorRef.current, !frozen);
                setFrozen(!frozen);
              }
            }}
          >
            {frozen ? "Unfreeze" : "Freeze"}
          </button>
        </div>
      </div>
    </div>
  );
}