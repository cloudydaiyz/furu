import { BlockExecutionStatus, LineExecutionStatus } from "@cloudydaiyz/furu-api";
import { StateEffect, StateField, RangeSet, Compartment, EditorState } from "@codemirror/state";
import { GutterMarker, gutter } from "@codemirror/view";
import { EditorView } from "codemirror";

export function getCodeFromEditor(view: EditorView) {
  return view.state.doc.toString();
}

export const readOnly = new Compartment();
export const editable = new Compartment();

export function freezeEditor(view: EditorView, freeze: boolean) {
  view.dispatch({
    effects: [
      readOnly.reconfigure(EditorState.readOnly.of(freeze)),
      editable.reconfigure(EditorView.editable.of(!freeze)),
    ]
  });
}

export const pendingMarker = new class extends GutterMarker {
  toDOM() { return document.createTextNode("⚪️") }
}

export const successMarker = new class extends GutterMarker {
  toDOM() { return document.createTextNode("🟢") }
}

export const errorMarker = new class extends GutterMarker {
  toDOM() { return document.createTextNode("🔴") }
}

const statusToMarkerMap: Record<LineExecutionStatus, GutterMarker> = {
  pending: pendingMarker,
  success: successMarker,
  error: errorMarker,
}

type LineExecutionState = { pos: number, status: LineExecutionStatus }[];
type LineStatusEffect = { type: "clear" } | { type: "update", data: LineExecutionState };

function blockStatusToState(view: EditorView, status: BlockExecutionStatus): LineExecutionState {
  const state: LineExecutionState = [];
  for (const rawLineNumber in status) {
    const lineNumber = Number.parseInt(rawLineNumber);
    const lineStatus = status[rawLineNumber as `${number}`];
    const line = view.state.doc.line(lineNumber);
    state.push({ pos: line.from, status: lineStatus });
  }
  return state;
}

export const lineStatusEffect = StateEffect.define<LineStatusEffect>({
  map: (val, mapping) => {
    console.log('lineStatusEffect')
    if (val.type === "clear") return val;
    return {
      type: "update",
      data: val.data.map((line) => ({ pos: mapping.mapPos(line.pos), status: line.status })),
    }
  }
});

export const lineStatusState = StateField.define<RangeSet<GutterMarker>>({
  create() { return RangeSet.empty },
  update(set, transaction) {
    console.log('lineStatusState')
    set = set.map(transaction.changes);
    for (let e of transaction.effects) {
      if (e.is(lineStatusEffect)) {
        if (e.value.type === "clear") {
          set = RangeSet.empty;
        } else if (e.value.type === "update") {
          set = RangeSet.empty;
          set = set.update({
            add: e.value.data.map(
              ({ pos, status }) => statusToMarkerMap[status].range(pos)
            )
          });
        }
      }
    }
    return set;
  }
});

export function clearLineStatusGutter(view: EditorView) {
  view.dispatch({
    effects: lineStatusEffect.of({ type: "clear" })
  });
  console.log('clearLineStatusGutter')
}

export function updateLineStatusGutter(view: EditorView, blockStatus: BlockExecutionStatus) {
  const newState: LineExecutionState = blockStatusToState(view, blockStatus);
  view.dispatch({
    effects: lineStatusEffect.of({ type: "update", data: newState })
  });
  console.log('updateLineStatusGutter')
}

export const lineStatusGutter = [
  lineStatusState,
  gutter({
    class: "cm-line-status-gutter",
    markers: v => v.state.field(lineStatusState),
    initialSpacer: () => pendingMarker,
  }),
  EditorView.baseTheme({
    ".cm-line-status-gutter .cm-gutterElement": {
      color: "red",
      paddingLeft: "5px",
      cursor: "default"
    }
  })
];