/**
 * Reducer function for editor state management
 * Pure function that takes current state and action, returns new state
 * No side effects - can be easily tested
 */

import { EditorStoreState } from "./types";
import { EditorAction } from "./actions";
import { ZOOM_CONFIG } from "../constants";
import { arePortTypesCompatible } from "./portTypeCompatibility";
import { validateParameterValue } from "./parameterValidator";
import { getWebviewLogger } from "../logging";

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
          model: action.model,
          isDirty: false
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
          isDirty: true,
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
      // Rendering transform: screenX = zoom * (worldX + camOX) + W/2 * (1-zoom)
      // To keep the world point under cursor fixed:
      //   newOff = oldOff + (mouseX - canvasCenterX) * (1/newZoom - 1/oldZoom)
      const dx = (action.centerX - action.canvasCenterX) * (1 / newZoom - 1 / oldZoom);
      const dy = (action.centerY - action.canvasCenterY) * (1 / newZoom - 1 / oldZoom);

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
     * Set hovered port for visual feedback
     */
    case "HOVER_PORT":
      // Skip update if same port is already hovered
      if (state.ui.hoveredPortId === action.portId) return state;
      return {
        ...state,
        ui: {
          ...state.ui,
          hoveredPortId: action.portId
        }
      };

    // ============ Connection Creation ============

    /**
     * Start dragging a new connection from a port
     */
    case "START_CONNECTION_DRAG":
      return {
        ...state,
        ui: {
          ...state.ui,
          pendingConnection: {
            fromPortId: action.fromPortId,
            fromPortKind: action.fromPortKind,
            fromPortDirection: action.fromPortDirection,
            fromPortDataType: action.fromPortDataType,
            mouseX: action.mouseX,
            mouseY: action.mouseY
          }
        }
      };

    /**
     * Update the rubber-band line endpoint during connection drag
     */
    case "UPDATE_CONNECTION_DRAG":
      if (!state.ui.pendingConnection) return state;
      return {
        ...state,
        ui: {
          ...state.ui,
          pendingConnection: {
            ...state.ui.pendingConnection,
            mouseX: action.mouseX,
            mouseY: action.mouseY
          }
        }
      };

    /**
     * Complete connection: validate and add new connection to diagram
     * Validation rules:
     * - Ports must be of the same kind (event↔event, data↔data)
     * - One port must be output, the other input
     * - No self-connections (same port)
     * - No duplicate connections
     */
    case "COMPLETE_CONNECTION_DRAG": {
      const pending = state.ui.pendingConnection;
      if (!pending) return state;

      const logger = getWebviewLogger();
      const fromId = pending.fromPortId;
      const toId = action.toPortId;

      // Self-connection check
      if (fromId === toId) {
        logger.warn(`Connection rejected: self-connection on port ${fromId}`);
        return { ...state, ui: { ...state.ui, pendingConnection: undefined } };
      }

      // Kind mismatch check (event↔data)
      if (pending.fromPortKind !== action.toPortKind) {
        logger.warn(`Connection rejected: kind mismatch (${pending.fromPortKind} → ${action.toPortKind}) between ${fromId} and ${toId}`);
        return { ...state, ui: { ...state.ui, pendingConnection: undefined } };
      }

      // Direction check: one must be output, other input
      if (pending.fromPortDirection === action.toPortDirection) {
        logger.warn(`Connection rejected: same direction (${pending.fromPortDirection}) between ${fromId} and ${toId}`);
        return { ...state, ui: { ...state.ui, pendingConnection: undefined } };
      }

      // Data type compatibility check (IEC 61499 widening rules + ANY hierarchy)
      if (pending.fromPortKind === 'data') {
        const srcType = pending.fromPortDirection === 'output'
          ? pending.fromPortDataType
          : action.toPortDataType;
        const dstType = pending.fromPortDirection === 'output'
          ? action.toPortDataType
          : pending.fromPortDataType;
        if (!arePortTypesCompatible(srcType, dstType)) {
          logger.warn(`Connection rejected: incompatible data types (source: ${srcType || 'undefined'} → target: ${dstType || 'undefined'}) between ${fromId} and ${toId}`);
          return { ...state, ui: { ...state.ui, pendingConnection: undefined } };
        }
      }

      // Determine source (output) and destination (input)
      const sourcePortId = pending.fromPortDirection === 'output' ? fromId : toId;
      const destPortId = pending.fromPortDirection === 'output' ? toId : fromId;

      // Duplicate check
      const duplicate = state.diagram.connections.some(
        c => c.fromPortId === sourcePortId && c.toPortId === destPortId
      );
      if (duplicate) {
        logger.warn(`Connection rejected: duplicate connection ${sourcePortId} → ${destPortId}`);
        return { ...state, ui: { ...state.ui, pendingConnection: undefined } };
      }

      // Build new EditorConnection
      const newConn = {
        id: `${sourcePortId}->${destPortId}`,
        fromPortId: sourcePortId,
        toPortId: destPortId,
        type: pending.fromPortKind as 'event' | 'data'
      };

      // Build model-level DiagramConnection
      const [srcBlock, srcPort] = sourcePortId.split(".");
      const [dstBlock, dstPort] = destPortId.split(".");
      const modelConn = {
        fromBlock: srcBlock,
        fromPort: srcPort,
        toBlock: dstBlock,
        toPort: dstPort,
        type: pending.fromPortKind as 'event' | 'data'
      };

      const currentModel = state.diagram.model;
      const updatedModel = currentModel
        ? {
            ...currentModel,
            subAppNetwork: {
              ...currentModel.subAppNetwork,
              connections: [...(currentModel.subAppNetwork.connections || []), modelConn],
            },
          }
        : currentModel;

      const srcDataType = pending.fromPortDirection === 'output'
        ? pending.fromPortDataType
        : action.toPortDataType;
      const dstDataType = pending.fromPortDirection === 'output'
        ? action.toPortDataType
        : pending.fromPortDataType;
      logger.info(`Connection created: ${sourcePortId} → ${destPortId} (kind=${pending.fromPortKind}, srcDataType=${srcDataType || 'N/A'}, dstDataType=${dstDataType || 'N/A'})`);

      return {
        ...state,
        diagram: {
          ...state.diagram,
          connections: [...state.diagram.connections, newConn],
          model: updatedModel,
          isDirty: true,
        },
        ui: {
          ...state.ui,
          pendingConnection: undefined
        }
      };
    }

    /**
     * Cancel connection drag
     */
    case "CANCEL_CONNECTION_DRAG":
      return {
        ...state,
        ui: {
          ...state.ui,
          pendingConnection: undefined
        }
      };

    // ============ Parameter Editing ============

    /**
     * Update a block parameter value in the source model.
     * Finds the block by nodeId, then updates or creates the parameter entry.
     */
    case "UPDATE_PARAMETER": {
      const logger = getWebviewLogger();
      const model = state.diagram.model;
      if (!model?.subAppNetwork?.blocks) {
        logger.warn(`UPDATE_PARAMETER: no model/blocks`);
        return state;
      }

      const blockIndex = model.subAppNetwork.blocks.findIndex(
        (b: any) => b.id === action.nodeId
      );
      if (blockIndex === -1) {
        logger.warn(`UPDATE_PARAMETER: block "${action.nodeId}" not found`);
        return state;
      }

      // Resolve port data type from FB type model for validation
      const block = model.subAppNetwork.blocks[blockIndex];
      let portDataType: string | undefined;
      if (state.diagram.fbTypes) {
        const fbType = state.diagram.fbTypes.get(block.typeShort || block.typeLong);
        if (fbType) {
          const port = fbType.ports.find(p => p.name === action.paramName);
          portDataType = port?.type;
        }
      }

      // Validate value against port data type (skip for empty values — clears param)
      if (action.value.trim() !== "") {
        const validation = validateParameterValue(action.value, portDataType);
        if (!validation.valid) {
          logger.warn(`UPDATE_PARAMETER rejected: ${action.nodeId}.${action.paramName} = "${action.value}" — ${validation.error}`);
          return state;
        }
      }

      const params: any[] = block.parameters ? [...block.parameters] : [];
      const paramIndex = params.findIndex((p: any) => p.name === action.paramName);

      if (paramIndex !== -1) {
        // Update existing parameter
        params[paramIndex] = { ...params[paramIndex], value: action.value };
      } else {
        // Create new parameter entry
        params.push({
          fbName: action.nodeId,
          name: action.paramName,
          value: action.value,
        });
      }

      const updatedBlocks = [...model.subAppNetwork.blocks];
      updatedBlocks[blockIndex] = { ...block, parameters: params };

      logger.info(`Parameter updated: ${action.nodeId}.${action.paramName} = ${action.value}`);

      return {
        ...state,
        diagram: {
          ...state.diagram,
          isDirty: true,
          model: {
            ...model,
            subAppNetwork: {
              ...model.subAppNetwork,
              blocks: updatedBlocks,
            },
          },
        },
      };
    }

    /**
     * Toggle OPC UA mapping attribute on a block parameter.
     * If the parameter doesn't exist yet, creates it with empty value.
     */
    case "TOGGLE_OPC_MAPPING": {
      const logger = getWebviewLogger();
      const model = state.diagram.model;
      if (!model?.subAppNetwork?.blocks) {
        logger.warn(`TOGGLE_OPC_MAPPING: no model/blocks`);
        return state;
      }

      const blockIndex = model.subAppNetwork.blocks.findIndex(
        (b: any) => b.id === action.nodeId
      );
      if (blockIndex === -1) {
        logger.warn(`TOGGLE_OPC_MAPPING: block "${action.nodeId}" not found`);
        return state;
      }

      const block = model.subAppNetwork.blocks[blockIndex];
      const params: any[] = block.parameters ? [...block.parameters] : [];
      let paramIndex = params.findIndex((p: any) => p.name === action.paramName);

      if (paramIndex === -1) {
        // Create parameter entry if it doesn't exist
        params.push({
          fbName: action.nodeId,
          name: action.paramName,
          value: "",
          attributes: [],
        });
        paramIndex = params.length - 1;
      }

      const param = { ...params[paramIndex] };
      const attrs: any[] = param.attributes ? [...param.attributes] : [];

      if (action.enabled) {
        // Add or update OpcMapping attribute
        const existingIdx = attrs.findIndex((a: any) => a.name === "OpcMapping");
        if (existingIdx !== -1) {
          attrs[existingIdx] = { ...attrs[existingIdx], value: "true" };
        } else {
          attrs.push({ name: "OpcMapping", value: "true" });
        }
      } else {
        // Set OpcMapping to false
        const existingIdx = attrs.findIndex((a: any) => a.name === "OpcMapping");
        if (existingIdx !== -1) {
          attrs[existingIdx] = { ...attrs[existingIdx], value: "false" };
        } else {
          attrs.push({ name: "OpcMapping", value: "false" });
        }
      }

      param.attributes = attrs;
      params[paramIndex] = param;

      const updatedBlocks = [...model.subAppNetwork.blocks];
      updatedBlocks[blockIndex] = { ...block, parameters: params };

      logger.info(`OPC mapping ${action.enabled ? 'enabled' : 'disabled'}: ${action.nodeId}.${action.paramName}`);

      return {
        ...state,
        diagram: {
          ...state.diagram,
          isDirty: true,
          model: {
            ...model,
            subAppNetwork: {
              ...model.subAppNetwork,
              blocks: updatedBlocks,
            },
          },
        },
      };
    }

    // ============ Node Deletion ============

    /**
     * Delete a node (FB block) from the diagram.
     * Removes: node from diagram.nodes, related connections from diagram.connections,
     * block from model.subAppNetwork.blocks, connections from model.subAppNetwork.connections,
     * related mappings from model.mappings. Clears selection. Sets isDirty.
     */
    case "DELETE_NODE": {
      const logger = getWebviewLogger();
      const nodeId = action.nodeId;

      // Remove node from diagram
      const filteredNodes = state.diagram.nodes.filter(n => n.id !== nodeId);
      if (filteredNodes.length === state.diagram.nodes.length) {
        logger.warn(`DELETE_NODE: node "${nodeId}" not found`);
        return state;
      }

      // Remove connections that reference this node (portId format: "blockId.portName")
      const prefix = nodeId + ".";
      const filteredConnections = state.diagram.connections.filter(
        c => !c.fromPortId.startsWith(prefix) && !c.toPortId.startsWith(prefix)
      );

      // Update model
      const model = state.diagram.model;
      let updatedModel = model;
      if (model) {
        const subNet = model.subAppNetwork;

        // Remove block from model
        const updatedBlocks = subNet.blocks
          ? subNet.blocks.filter((b: any) => b.id !== nodeId)
          : [];

        // Remove model connections referencing this block
        const updatedModelConns = subNet.connections
          ? subNet.connections.filter(
              (c: any) => c.fromBlock !== nodeId && c.toBlock !== nodeId
            )
          : [];

        // Remove mappings referencing this block (fbInstance ends with ".nodeId")
        const suffix = "." + nodeId;
        const updatedMappings = model.mappings
          ? model.mappings.filter(
              (m: any) => !m.fbInstance.endsWith(suffix) && m.fbInstance !== nodeId
            )
          : [];

        updatedModel = {
          ...model,
          mappings: updatedMappings,
          subAppNetwork: {
            ...subNet,
            blocks: updatedBlocks,
            connections: updatedModelConns,
          },
        };
      }

      logger.info(`Node deleted: ${nodeId}`);

      return {
        ...state,
        diagram: {
          ...state.diagram,
          nodes: filteredNodes,
          connections: filteredConnections,
          model: updatedModel,
          isDirty: true,
        },
        ui: {
          ...state.ui,
          selection: {},
          pendingConnection: undefined,
        },
      };
    }

    // ============ Connection Selection & Deletion ============

    /**
     * Select a connection (or clear connection selection)
     */
    case "SELECT_CONNECTION":
      return {
        ...state,
        ui: {
          ...state.ui,
          selection: {
            nodeId: undefined,
            connectionId: action.connectionId,
          },
        },
      };

    /**
     * Delete a connection from the diagram.
     * Removes from diagram.connections and model.subAppNetwork.connections.
     */
    case "DELETE_CONNECTION": {
      const logger = getWebviewLogger();
      const connId = action.connectionId;

      const conn = state.diagram.connections.find(c => c.id === connId);
      if (!conn) {
        logger.warn(`DELETE_CONNECTION: connection "${connId}" not found`);
        return state;
      }

      // Remove from diagram connections
      const remainingConns = state.diagram.connections.filter(c => c.id !== connId);

      // Remove from model connections
      const [fromBlock, fromPort] = conn.fromPortId.split(".");
      const [toBlock, toPort] = conn.toPortId.split(".");

      const model = state.diagram.model;
      let updatedModel = model;
      if (model?.subAppNetwork?.connections) {
        const updatedModelConns = model.subAppNetwork.connections.filter(
          (c: any) =>
            !(c.fromBlock === fromBlock && c.fromPort === fromPort &&
              c.toBlock === toBlock && c.toPort === toPort)
        );
        updatedModel = {
          ...model,
          subAppNetwork: {
            ...model.subAppNetwork,
            connections: updatedModelConns,
          },
        };
      }

      logger.info(`Connection deleted: ${connId}`);

      return {
        ...state,
        diagram: {
          ...state.diagram,
          connections: remainingConns,
          model: updatedModel,
          isDirty: true,
        },
        ui: {
          ...state.ui,
          selection: {},
        },
      };
    }

    /**
     * Reset isDirty flag after successful save.
     */
    case "RESET_DIRTY": {
      return {
        ...state,
        diagram: {
          ...state.diagram,
          isDirty: false,
        },
      };
    }

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
      model: undefined,
      isDirty: false,
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
