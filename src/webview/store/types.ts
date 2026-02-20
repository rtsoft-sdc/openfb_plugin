/**
 * Store type definitions
 * Defines the structure of the editor state and store interface
 */

import { EditorNode, EditorConnection, ViewState } from "../editorState";
import { FBTypeModel } from "../../domain/fbtModel";
import { EditorAction } from "./actions";

/**
 * Editor store interface
 * Public API for accessing and modifying editor state
 */
export interface EditorStore {
  /**
   * Get current editor state
   * @returns Current state snapshot
   */
  getState(): EditorStoreState;

  /**
   * Subscribe to state changes
    * The listener runs after each successful dispatch() state update
   * @param listener Callback function that receives updated state
    * @returns stopListening function - call it to remove this listener
   */
  subscribe(listener: (state: EditorStoreState) => void): () => void;

  /**
   * Dispatch an action to modify state
   * Action is processed through the reducer to produce new state
   * All subscribers are notified after state change
   * @param action Action to dispatch
   */
  dispatch(action: EditorAction): void;
}

/**
 * Complete editor state snapshot
 * Single source of truth for all UI and diagram state
 */
export interface EditorStoreState {
  /**
   * Diagram data and metadata
   */
  diagram: {
    /** Array of nodes (function blocks) in the diagram */
    nodes: EditorNode[];

    /** Array of connections between nodes */
    connections: EditorConnection[];

    /** Map of FB type definitions by typeShort name */
    fbTypes?: Map<string, FBTypeModel>;

    /** Full diagram model from extension (contains mappings, devices, etc) */
    model?: any;
  };

  /**
   * UI state - user interaction and view state
   */
  ui: {
    /** Currently selected node/connection */
    selection: {
      nodeId?: string;
      connectionId?: string;
    };

    /** Whether a node is currently being dragged */
    isDragging: boolean;

    /** ID of currently hovered port (for visual feedback) */
    hoveredPortId?: string;

    /** Viewport state (zoom level and pan offset) */
    viewport: ViewState;

    /** Toolbar height in pixels (used for layout calculations) */
    toolbarHeight: number;
  };
}
