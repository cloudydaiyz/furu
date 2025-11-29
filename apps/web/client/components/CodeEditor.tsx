'use client';

import { EditorView } from '@codemirror/view';
import { EditorState, Transaction } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from 'codemirror';
import React, { memo, RefObject, useEffect, useRef } from 'react';
import "./CodeEditor.css";
import { editable, readOnly, lineStatusGutter } from './gutter';

type EditorProps = {
  editorRef: RefObject<EditorView | null>,
  content: string;
  onSaveContent?: (updatedContent: string, debounce: boolean) => void;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
};

function PureCodeEditor({ editorRef, content, onSaveContent }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const startState = EditorState.create({
        doc: content,
        extensions: [
          basicSetup,
          javascript(),
          oneDark,
        ],
      });

      const fixedSizeTheme = EditorView.theme({
        ".cm-scroller": {
          overflow: "auto"
        }
      });

      editorRef.current = new EditorView({
        state: startState,
        parent: containerRef.current,
        extensions: [
          fixedSizeTheme,
        ],
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const transaction = update.transactions.find(
            (tr) => !tr.annotation(Transaction.remote),
          );

          if (transaction) {
            const newContent = update.state.doc.toString();
            onSaveContent?.(newContent, true);
          }
        }
      });

      const currentSelection = editorRef.current.state.selection;

      const newState = EditorState.create({
        doc: editorRef.current.state.doc,
        extensions: [
          lineStatusGutter,
          basicSetup,
          javascript(),
          oneDark,
          updateListener,
          readOnly.of(EditorState.readOnly.of(false)),
          editable.of(EditorView.editable.of(true)),
        ],
        selection: currentSelection,
      });

      editorRef.current.setState(newState);
    }
  }, [onSaveContent]);

  useEffect(() => {
    if (editorRef.current && content) {
      const currentContent = editorRef.current.state.doc.toString();
      if (currentContent !== content) {
        const transaction = editorRef.current.state.update({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
          annotations: [Transaction.remote.of(true)],
        });

        editorRef.current.dispatch(transaction);
      }
    }
  }, [content]);

  return (
    <div
      className="relative not-prose w-full h-full text-sm"
      ref={containerRef}
    />
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex)
    return false;
  if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false;
  if (prevProps.content !== nextProps.content) return false;

  return true;
}

export const CodeEditor = memo(PureCodeEditor, areEqual);