/**
 * Parameter-related reducer cases:
 * UPDATE_PARAMETER, TOGGLE_OPC_MAPPING
 */

import { EditorStoreState } from "../types";
import { EditorAction } from "../actions";
import { validateParameterValue } from "../../../shared/parameterValidator";
import { getWebviewLogger } from "../../logging";
import { getLanguage } from "../../i18nService";

export function reduceParameterAction(
  state: EditorStoreState,
  action: EditorAction,
): EditorStoreState | undefined {
  switch (action.type) {
    case "UPDATE_PARAMETER": {
      const logger = getWebviewLogger();
      const model = state.diagram.model;
      if (!model?.subAppNetwork?.blocks) {
        logger.warn(`UPDATE_PARAMETER: no model/blocks`);
        return state;
      }

      const blockIndex = model.subAppNetwork.blocks.findIndex(
        (b) => b.id === action.nodeId,
      );
      if (blockIndex === -1) {
        logger.warn(`UPDATE_PARAMETER: block "${action.nodeId}" not found`);
        return state;
      }

      // Resolve port data type from FB type model for validation
      const block = model.subAppNetwork.blocks[blockIndex];
      let portDataType: string | undefined;
      if (state.diagram.fbTypes) {
        const fbType = state.diagram.fbTypes.get(
          block.typeShort || block.typeLong,
        );
        if (fbType) {
          const port = fbType.ports.find(
            (p) => p.name === action.paramName,
          );
          portDataType = port?.type;
        }
      }

      // Validate value against port data type (skip for empty values — clears param)
      if (action.value.trim() !== "") {
        const validation = validateParameterValue(action.value, portDataType, getLanguage());
        if (!validation.valid) {
          logger.warn(
            `UPDATE_PARAMETER rejected: ${action.nodeId}.${action.paramName} = "${action.value}" — ${validation.error}`,
          );
          return state;
        }
      }

      const params = block.parameters ? [...block.parameters] : [] as Array<{ fbName: string; name: string; value: string; attributes?: Array<{ name: string; value: string }> }>;
      const paramIndex = params.findIndex(
        (p) => p.name === action.paramName,
      );

      if (paramIndex !== -1) {
        params[paramIndex] = { ...params[paramIndex], value: action.value };
      } else {
        params.push({
          fbName: action.nodeId,
          name: action.paramName,
          value: action.value,
        });
      }

      const updatedBlocks = [...model.subAppNetwork.blocks];
      updatedBlocks[blockIndex] = { ...block, parameters: params };

      const updatedNodes = state.diagram.nodes.map((n) => {
        if (n.id !== action.nodeId) return n;
        return {
          ...n,
          ports: n.ports.map((p) =>
            p.name === action.paramName
              ? { ...p, value: action.value, isDefaultValue: false }
              : p,
          ),
        };
      });

      logger.info(
        `Parameter updated: ${action.nodeId}.${action.paramName} = ${action.value}`,
      );

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
          nodes: updatedNodes,
        },
      };
    }

    case "TOGGLE_OPC_MAPPING": {
      const logger = getWebviewLogger();
      const model = state.diagram.model;
      if (!model?.subAppNetwork?.blocks) {
        logger.warn(`TOGGLE_OPC_MAPPING: no model/blocks`);
        return state;
      }

      const blockIndex = model.subAppNetwork.blocks.findIndex(
        (b) => b.id === action.nodeId,
      );
      if (blockIndex === -1) {
        logger.warn(
          `TOGGLE_OPC_MAPPING: block "${action.nodeId}" not found`,
        );
        return state;
      }

      const block = model.subAppNetwork.blocks[blockIndex];
      const params = block.parameters ? [...block.parameters] : [] as Array<{ fbName: string; name: string; value: string; attributes?: Array<{ name: string; value: string }> }>;
      let paramIndex = params.findIndex(
        (p) => p.name === action.paramName,
      );

      if (paramIndex === -1) {
        params.push({
          fbName: action.nodeId,
          name: action.paramName,
          value: "",
          attributes: [],
        });
        paramIndex = params.length - 1;
      }

      const param = { ...params[paramIndex] };
      const attrs = param.attributes ? [...param.attributes] : [] as Array<{ name: string; value: string }>;

      if (action.enabled) {
        const existingIdx = attrs.findIndex(
          (a) => a.name === "OpcMapping",
        );
        if (existingIdx !== -1) {
          attrs[existingIdx] = { ...attrs[existingIdx], value: "true" };
        } else {
          attrs.push({ name: "OpcMapping", value: "true" });
        }
      } else {
        const existingIdx = attrs.findIndex(
          (a) => a.name === "OpcMapping",
        );
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

      logger.info(
        `OPC mapping ${action.enabled ? "enabled" : "disabled"}: ${action.nodeId}.${action.paramName}`,
      );

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

    default:
      return undefined;
  }
}
