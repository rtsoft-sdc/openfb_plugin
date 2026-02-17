/**
 * Action types for the editor store
 * Defines all possible user interactions and state changes
 */

import type { DiagramModel, EditorNode, EditorConnection } from "../editorState";
import type { FBTypeModel } from "../../domain/fbtModel";

/**
 * Union type of all possible action types
 * This ensures type safety when dispatching actions
 */
export type EditorAction =
  // Diagram loading
  | SetGraphDataAction

  // Node operations
  | SelectNodeAction
  | StartDragAction
  | MoveNodeAction
  | StopDragAction

  // Viewport operations (pan/zoom)
  | ZoomAction
  | PanAction;

// ============ Action Interfaces ============

/**
 * Set prepared graph data (already mapped to editor-friendly structures)
 * Used as a single atomic state update during diagram loading
 */
export interface SetGraphDataAction {
  type: 'SET_GRAPH_DATA';
  model: DiagramModel;
  fbTypes: Map<string, FBTypeModel>;
  nodes: EditorNode[];
  connections: EditorConnection[];
}

/**
 * Select a node in the diagram
 * If nodeId is undefined, clears selection
 */
export interface SelectNodeAction {
  type: 'SELECT_NODE';
  nodeId?: string;
}

/**
 * Start dragging a node
 * Marks the node as being dragged
 */
export interface StartDragAction {
  type: 'START_DRAG';
  nodeId: string;
}

/**
 * Move a node to a new position
 * Used during drag operations
 */
export interface MoveNodeAction {
  type: 'MOVE_NODE';
  nodeId: string;
  x: number;
  y: number;
}

/**
 * Stop dragging current node
 * Clears drag state
 */
export interface StopDragAction {
  type: 'STOP_DRAG';
}

/**
 * Zoom in or out from the diagram
 * factor > 1 = zoom in, factor < 1 = zoom out
 * Will be clamped to min/max zoom levels (to be defined in new zoom logic)
 */
export interface ZoomAction {
  type: 'ZOOM';
  factor: number;
  centerX: number;
  centerY: number;
}

/**
 * Pan the camera by a delta amount
 * Moves the viewport without changing zoom
 */
export interface PanAction {
  type: 'PAN';
  dx: number;
  dy: number;
}
