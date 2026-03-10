/**
 * Connection-related reducer cases:
 * START_CONNECTION_DRAG, UPDATE_CONNECTION_DRAG, COMPLETE_CONNECTION_DRAG,
 * CANCEL_CONNECTION_DRAG, SELECT_CONNECTION, DELETE_CONNECTION
 */

import { EditorStoreState } from "../types";
import { EditorAction } from "../actions";
import { arePortTypesCompatible } from "../../../shared/portTypeCompatibility";
import { getWebviewLogger } from "../../logging";

export function reduceConnectionAction(
  state: EditorStoreState,
  action: EditorAction,
): EditorStoreState | undefined {
  switch (action.type) {
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
            mouseY: action.mouseY,
          },
        },
      };

    case "UPDATE_CONNECTION_DRAG":
      if (!state.ui.pendingConnection) return state;
      return {
        ...state,
        ui: {
          ...state.ui,
          pendingConnection: {
            ...state.ui.pendingConnection,
            mouseX: action.mouseX,
            mouseY: action.mouseY,
          },
        },
      };

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

      // Kind mismatch check
      if (pending.fromPortKind !== action.toPortKind) {
        logger.warn(
          `Connection rejected: kind mismatch (${pending.fromPortKind} → ${action.toPortKind}) between ${fromId} and ${toId}`,
        );
        return { ...state, ui: { ...state.ui, pendingConnection: undefined } };
      }

      // Direction check
      if (pending.fromPortDirection === action.toPortDirection) {
        logger.warn(
          `Connection rejected: same direction (${pending.fromPortDirection}) between ${fromId} and ${toId}`,
        );
        return { ...state, ui: { ...state.ui, pendingConnection: undefined } };
      }

      // Data type compatibility check
      if (pending.fromPortKind === "data") {
        const srcType =
          pending.fromPortDirection === "output"
            ? pending.fromPortDataType
            : action.toPortDataType;
        const dstType =
          pending.fromPortDirection === "output"
            ? action.toPortDataType
            : pending.fromPortDataType;
        if (!arePortTypesCompatible(srcType, dstType)) {
          logger.warn(
            `Connection rejected: incompatible data types (source: ${srcType || "undefined"} → target: ${dstType || "undefined"}) between ${fromId} and ${toId}`,
          );
          return {
            ...state,
            ui: { ...state.ui, pendingConnection: undefined },
          };
        }
      }

      // Determine source (output) and destination (input)
      const sourcePortId =
        pending.fromPortDirection === "output" ? fromId : toId;
      const destPortId =
        pending.fromPortDirection === "output" ? toId : fromId;

      // Duplicate check
      const duplicate = state.diagram.connections.some(
        (c) => c.fromPortId === sourcePortId && c.toPortId === destPortId,
      );
      if (duplicate) {
        logger.warn(
          `Connection rejected: duplicate connection ${sourcePortId} → ${destPortId}`,
        );
        return { ...state, ui: { ...state.ui, pendingConnection: undefined } };
      }

      // Build new EditorConnection
      const newConn = {
        id: `${sourcePortId}->${destPortId}`,
        fromPortId: sourcePortId,
        toPortId: destPortId,
        type: pending.fromPortKind as "event" | "data",
      };

      // Build model-level DiagramConnection
      const [srcBlock, srcPort] = sourcePortId.split(".");
      const [dstBlock, dstPort] = destPortId.split(".");
      const modelConn = {
        fromBlock: srcBlock,
        fromPort: srcPort,
        toBlock: dstBlock,
        toPort: dstPort,
        type: pending.fromPortKind as "event" | "data",
      };

      const currentModel = state.diagram.model;
      const updatedModel = currentModel
        ? {
            ...currentModel,
            subAppNetwork: {
              ...currentModel.subAppNetwork,
              connections: [
                ...(currentModel.subAppNetwork.connections || []),
                modelConn,
              ],
            },
          }
        : currentModel;

      const srcDataType =
        pending.fromPortDirection === "output"
          ? pending.fromPortDataType
          : action.toPortDataType;
      const dstDataType =
        pending.fromPortDirection === "output"
          ? action.toPortDataType
          : pending.fromPortDataType;
      logger.info(
        `Connection created: ${sourcePortId} → ${destPortId} (kind=${pending.fromPortKind}, srcDataType=${srcDataType || "N/A"}, dstDataType=${dstDataType || "N/A"})`,
      );

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
          pendingConnection: undefined,
        },
      };
    }

    case "CANCEL_CONNECTION_DRAG":
      return {
        ...state,
        ui: { ...state.ui, pendingConnection: undefined },
      };

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

    case "DELETE_CONNECTION": {
      const logger = getWebviewLogger();
      const connId = action.connectionId;

      const conn = state.diagram.connections.find((c) => c.id === connId);
      if (!conn) {
        logger.warn(`DELETE_CONNECTION: connection "${connId}" not found`);
        return state;
      }

      const remainingConns = state.diagram.connections.filter(
        (c) => c.id !== connId,
      );

      const [fromBlock, fromPort] = conn.fromPortId.split(".");
      const [toBlock, toPort] = conn.toPortId.split(".");

      const model = state.diagram.model;
      let updatedModel = model;
      if (model?.subAppNetwork?.connections) {
        const updatedModelConns = model.subAppNetwork.connections.filter(
          (c) =>
            !(
              c.fromBlock === fromBlock &&
              c.fromPort === fromPort &&
              c.toBlock === toBlock &&
              c.toPort === toPort
            ),
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

    default:
      return undefined;
  }
}
