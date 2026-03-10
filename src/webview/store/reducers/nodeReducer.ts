/**
 * Node-related reducer cases:
 * SELECT_NODE, START_DRAG, MOVE_NODE, STOP_DRAG, ADD_NODE, DELETE_NODE
 */

import { EditorStoreState } from "../types";
import { EditorAction } from "../actions";
import { getWebviewLogger } from "../../logging";

export function reduceNodeAction(
  state: EditorStoreState,
  action: EditorAction,
): EditorStoreState | undefined {
  switch (action.type) {
    case "SELECT_NODE":
      return {
        ...state,
        ui: {
          ...state.ui,
          selection: {
            nodeId: action.nodeId,
            connectionId: undefined,
          },
        },
      };

    case "START_DRAG":
      return {
        ...state,
        ui: {
          ...state.ui,
          isDragging: true,
          selection: {
            nodeId: action.nodeId,
            connectionId: undefined,
          },
        },
      };

    case "MOVE_NODE": {
      const nodes = state.diagram.nodes.map((n) =>
        n.id === action.nodeId ? { ...n, x: action.x, y: action.y } : n,
      );
      return {
        ...state,
        diagram: { ...state.diagram, nodes },
      };
    }

    case "STOP_DRAG":
      return {
        ...state,
        ui: { ...state.ui, isDragging: false },
      };

    case "ADD_NODE": {
      const newBlock = {
        id: action.node.id,
        typeShort: action.node.type,
        typeLong: action.node.type,
        fbKind: action.node.fbKind,
        x: action.node.x,
        y: action.node.y,
        width: action.node.width,
        height: action.node.height,
      };

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
          selection: { nodeId: action.node.id, connectionId: undefined },
        },
      };
    }

    case "DELETE_NODE": {
      const logger = getWebviewLogger();
      const nodeId = action.nodeId;

      const filteredNodes = state.diagram.nodes.filter((n) => n.id !== nodeId);
      if (filteredNodes.length === state.diagram.nodes.length) {
        logger.warn(`DELETE_NODE: node "${nodeId}" not found`);
        return state;
      }

      const prefix = nodeId + ".";
      const filteredConnections = state.diagram.connections.filter(
        (c) => !c.fromPortId.startsWith(prefix) && !c.toPortId.startsWith(prefix),
      );

      const model = state.diagram.model;
      let updatedModel = model;
      if (model) {
        const subNet = model.subAppNetwork;
        const updatedBlocks = subNet.blocks
          ? subNet.blocks.filter((b) => b.id !== nodeId)
          : [];
        const updatedModelConns = subNet.connections
          ? subNet.connections.filter(
              (c) => c.fromBlock !== nodeId && c.toBlock !== nodeId,
            )
          : [];
        const suffix = "." + nodeId;
        const updatedMappings = model.mappings
          ? model.mappings.filter(
              (m) => !m.fbInstance.endsWith(suffix) && m.fbInstance !== nodeId,
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

    default:
      return undefined;
  }
}
