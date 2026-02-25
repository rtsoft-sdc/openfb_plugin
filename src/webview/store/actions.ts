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
  | AddNodeAction
  | DeleteNodeAction

  // Connection operations
  | SelectConnectionAction
  | DeleteConnectionAction

  // Port hover
  | HoverPortAction

  // Connection creation
  | StartConnectionDragAction
  | UpdateConnectionDragAction
  | CompleteConnectionDragAction
  | CancelConnectionDragAction

  // Parameter editing
  | UpdateParameterAction
  | ToggleOpcMappingAction

  // Dirty state
  | ResetDirtyAction

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
 * Add a new node (FB block) to the diagram
 * The node must be fully constructed before dispatching
 * (ports, dimensions, coordinates already resolved)
 */
export interface AddNodeAction {
  type: 'ADD_NODE';
  node: EditorNode;
}

/**
 * Delete a node (FB block) from the diagram
 * Removes: node, its connections (diagram + model), block from model, related mappings
 */
export interface DeleteNodeAction {
  type: 'DELETE_NODE';
  nodeId: string;
}

/**
 * Select a connection in the diagram
 * If connectionId is undefined, clears connection selection
 */
export interface SelectConnectionAction {
  type: 'SELECT_CONNECTION';
  connectionId?: string;
}

/**
 * Delete a connection from the diagram
 * Removes from both diagram.connections and model.subAppNetwork.connections
 */
export interface DeleteConnectionAction {
  type: 'DELETE_CONNECTION';
  connectionId: string;
}

/**
 * Set the currently hovered port (or clear hover)
 */
export interface HoverPortAction {
  type: 'HOVER_PORT';
  portId?: string;
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
  canvasCenterX: number;
  canvasCenterY: number;
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

// ============ Connection Creation Actions ============

/**
 * Start dragging a new connection from a port
 */
export interface StartConnectionDragAction {
  type: 'START_CONNECTION_DRAG';
  fromPortId: string;
  fromPortKind: 'event' | 'data';
  fromPortDirection: 'input' | 'output';
  fromPortDataType?: string;
  mouseX: number;
  mouseY: number;
}

/**
 * Update the mouse position during connection drag
 */
export interface UpdateConnectionDragAction {
  type: 'UPDATE_CONNECTION_DRAG';
  mouseX: number;
  mouseY: number;
}

/**
 * Complete connection drag - connect to target port
 */
export interface CompleteConnectionDragAction {
  type: 'COMPLETE_CONNECTION_DRAG';
  toPortId: string;
  toPortKind: 'event' | 'data';
  toPortDirection: 'input' | 'output';
  toPortDataType?: string;
}

/**
 * Cancel connection drag (dropped on empty area or invalid target)
 */
export interface CancelConnectionDragAction {
  type: 'CANCEL_CONNECTION_DRAG';
}

// ============ Parameter Editing Actions ============

/**
 * Update the value of a block parameter (initial value / literal assignment).
 * The value must pass IEC 61131-3 type validation before dispatch.
 */
export interface UpdateParameterAction {
  type: 'UPDATE_PARAMETER';
  nodeId: string;
  paramName: string;
  value: string;
}

/**
 * Toggle OPC UA mapping attribute on a block parameter.
 * Adds or removes the Attribute Name="OpcMapping" Value="true" entry.
 */
export interface ToggleOpcMappingAction {
  type: 'TOGGLE_OPC_MAPPING';
  nodeId: string;
  paramName: string;
  enabled: boolean;
}

/**
 * Reset isDirty flag after successful save.
 */
export interface ResetDirtyAction {
  type: 'RESET_DIRTY';
}
