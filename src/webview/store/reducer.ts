/**
 * Main reducer — thin dispatcher to domain-specific sub-reducers.
 * Only SET_GRAPH_DATA and RESET_DIRTY are handled inline (trivial cases).
 */

import { EditorStoreState } from "./types";
import { EditorAction } from "./actions";
import { reduceNodeAction } from "./reducers/nodeReducer";
import { reduceViewportAction } from "./reducers/viewportReducer";
import { reduceConnectionAction } from "./reducers/connectionReducer";
import { reduceParameterAction } from "./reducers/parameterReducer";

/**
 * Main reducer function
 * Processes an action and produces new state
 * Implementation note: Always returns a new state object (no mutations)
 */
export function editorReducer(
  state: EditorStoreState,
  action: EditorAction,
): EditorStoreState {
  switch (action.type) {
    // ── Inline: trivial cases ──────────────────────────────────

    case "SET_GRAPH_DATA":
      return {
        ...state,
        diagram: {
          nodes: action.nodes,
          connections: action.connections,
          fbTypes: action.fbTypes,
          model: action.model,
          isDirty: false,
        },
        ui: {
          ...state.ui,
          selection: {},
          isDragging: false,
          viewport: {
            ...state.ui.viewport,
            zoom: action.initialZoom ?? state.ui.viewport.zoom,
          },
        },
      };

    case "RESET_DIRTY":
      return {
        ...state,
        diagram: { ...state.diagram, isDirty: false },
      };

    // ── Node operations ────────────────────────────────────────

    case "SELECT_NODE":
    case "START_DRAG":
    case "MOVE_NODE":
    case "STOP_DRAG":
    case "ADD_NODE":
    case "DELETE_NODE":
      return reduceNodeAction(state, action) ?? state;

    // ── Viewport operations ────────────────────────────────────

    case "ZOOM":
    case "PAN":
    case "HOVER_PORT":
      return reduceViewportAction(state, action) ?? state;

    // ── Connection operations ──────────────────────────────────

    case "START_CONNECTION_DRAG":
    case "UPDATE_CONNECTION_DRAG":
    case "COMPLETE_CONNECTION_DRAG":
    case "CANCEL_CONNECTION_DRAG":
    case "SELECT_CONNECTION":
    case "DELETE_CONNECTION":
      return reduceConnectionAction(state, action) ?? state;

    // ── Parameter editing ──────────────────────────────────────

    case "UPDATE_PARAMETER":
    case "TOGGLE_OPC_MAPPING":
      return reduceParameterAction(state, action) ?? state;

    // ── Unknown action ─────────────────────────────────────────

    default:
      return state;
  }
}

/**
 * Create initial editor state
 * Used when creating a new store instance
 */
export function createInitialState(): EditorStoreState {
  return {
    diagram: {
      nodes: [],
      connections: [],
      fbTypes: undefined,
      model: undefined,
      isDirty: false,
    },
    ui: {
      selection: {},
      isDragging: false,
      viewport: {
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
      },
      toolbarHeight: 0,
    },
  };
}
