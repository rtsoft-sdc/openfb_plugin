/**
 * Reducer function for editor state management
 * Pure function that takes current state and action, returns new state
 * No side effects - can be easily tested
 */

import { EditorStoreState } from "./types";
import { EditorAction } from "./actions";
import { ZOOM_CONFIG } from "../constants";

/**
 * Main reducer function
 * Processes an action and produces new state
 * Implementation note: Always returns a new state object (no mutations)
 *
 * @param state Current state
 * @param action Action to process
 * @returns New state after applying action
 */
export function editorReducer(
  state: EditorStoreState,
  action: EditorAction
): EditorStoreState {
  // Reducer is the only place that derives next state from current state + action.
  switch (action.type) {
    /**
     * Set fully prepared graph data in one atomic update
     */
    case "SET_GRAPH_DATA":
      return {
        ...state,
        diagram: {
          nodes: action.nodes,
          connections: action.connections,
          fbTypes: action.fbTypes,
          model: action.model
        },
        ui: {
          ...state.ui,
          selection: {},
          isDragging: false
        }
      };

    /**
     * Select a node (or clear selection if nodeId is undefined)
     */
    case "SELECT_NODE":
      return {
        ...state,
        ui: {
          ...state.ui,
          selection: {
            nodeId: action.nodeId,
            connectionId: undefined
          }
        }
      };

    /**
     * Start dragging a node
     * Mark as dragging and select the node
     */
    case "START_DRAG":
      return {
        ...state,
        ui: {
          ...state.ui,
          isDragging: true,
          selection: {
            nodeId: action.nodeId,
            connectionId: undefined
          }
        }
      };

    /**
     * Move a node to new position
     * Creates mutation-free node update
     */
    case "MOVE_NODE": {
      const nodes = state.diagram.nodes.map(n =>
        n.id === action.nodeId
          ? { ...n, x: action.x, y: action.y }
          : n
      );
      return {
        ...state,
        diagram: {
          ...state.diagram,
          nodes
        }
      };
    }

    /**
     * Stop dragging
     * Clear drag flag (keep selection)
     */
    case "STOP_DRAG":
      return {
        ...state,
        ui: {
          ...state.ui,
          isDragging: false
        }
      };

    /**
     * Add a new node to the diagram
     * Appends the fully constructed node to editor nodes AND to the source model
     * so that both stay in sync (important for save/export and right panel info)
     */
    case "ADD_NODE": {
      // Build a DiagramBlock entry for the source model
      const newBlock = {
        id: action.node.id,
        typeShort: action.node.type,
        typeLong: action.node.type,
        x: action.node.x,
        y: action.node.y,
        width: action.node.width,
        height: action.node.height,
      };

      // Immutably append to model.subAppNetwork.blocks (if model exists)
      const currentModel = state.diagram.model;
      const updatedModel = currentModel
        ? {
            ...currentModel,
            subAppNetwork: {
              ...currentModel.subAppNetwork,
              blocks: [...(currentModel.subAppNetwork.blocks || []), newBlock],
            },
          }
        : currentModel;

      return {
        ...state,
        diagram: {
          ...state.diagram,
          nodes: [...state.diagram.nodes, action.node],
          model: updatedModel,
        },
        ui: {
          ...state.ui,
          selection: {
            nodeId: action.node.id,
            connectionId: undefined
          }
        }
      };
    }

    /**
     * Zoom in or out centered on a specific point
     * Updates zoom level and adjusts pan offset so the point under cursor stays in place
     * Clamps zoom to MIN/MAX range
     */
    case "ZOOM": {
      const oldZoom = state.ui.viewport.zoom;
      const oldOffsetX = state.ui.viewport.offsetX;
      const oldOffsetY = state.ui.viewport.offsetY;

      // Calculate new zoom level and clamp to valid range
      const newZoom = Math.max(
        ZOOM_CONFIG.MIN,
        Math.min(ZOOM_CONFIG.MAX, oldZoom * action.factor)
      );

      // If zoom didn't change (already at limit), return unchanged state
      if (newZoom === oldZoom) {
        return state;
      }

      // Calculate offset adjustment to keep centerX/centerY point stable
      // The point at (centerX, centerY) in screen space should map to the same world point
      const dx = action.centerX * (1 - newZoom / oldZoom);
      const dy = action.centerY * (1 - newZoom / oldZoom);

      return {
        ...state,
        ui: {
          ...state.ui,
          viewport: {
            ...state.ui.viewport,
            zoom: newZoom,
            offsetX: oldOffsetX + dx,
            offsetY: oldOffsetY + dy
          }
        }
      };
    }

    /**
     * Pan the viewport
     * Add delta to offsets
     */
    case "PAN":
      return {
        ...state,
        ui: {
          ...state.ui,
          viewport: {
            ...state.ui.viewport,
            offsetX: state.ui.viewport.offsetX + action.dx,
            offsetY: state.ui.viewport.offsetY + action.dy
          }
        }
      };

    /**
     * Unknown action - return state unchanged
     * TypeScript ensures this should never happen with proper types
     */
    default: {
      return state;
    }
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
      model: undefined
    },
    ui: {
      selection: {},
      isDragging: false,
      viewport: {
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0
      },
      toolbarHeight: 0
    }
  };
}
