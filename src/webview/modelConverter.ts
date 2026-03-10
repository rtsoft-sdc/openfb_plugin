/**
 * Converts a SysModel diagram to editor-friendly graph structures (nodes + connections).
 */

import { FBTypeModel, FBPort } from "../shared/models/fbtModel";
import { FBKind } from "../shared/models/FBKind";
import type { SysModel, SysBlock, SysSubApp } from "../shared/models/sysModel";
import { calculateNodeDimensions } from "./layout/nodeLayout";
import { normalizeCoordinates } from "./utils/coordinateNormalization";
import { COORDINATE_CONFIG, ZOOM_CONFIG } from "./constants";
import { getDefaultLiteralForIecType } from "../shared/iecDefaultValues";
import type { EditorPort, EditorNode, EditorConnection } from "./editorState";

export function buildPorts(
  nodeId: string,
  fbType: FBTypeModel,
  paramMap?: Map<string, string>,
): EditorPort[] {
  const resolveValue = (p: FBPort): { value?: string; isDefaultValue: boolean } => {
    if (p.kind !== "data") {
      return { value: undefined, isDefaultValue: false };
    }

    const explicitValue = paramMap?.get(p.name);
    if (explicitValue !== undefined && explicitValue.trim() !== "") {
      return { value: explicitValue, isDefaultValue: false };
    }

    if (p.direction !== "input") {
      return { value: undefined, isDefaultValue: false };
    }

    const defaultValue = getDefaultLiteralForIecType(p.type);
    return { value: defaultValue, isDefaultValue: defaultValue !== undefined };
  };

  return fbType.ports.map((p) => {
    const resolved = resolveValue(p);
    return {
      ...p,
      value: resolved.value,
      isDefaultValue: resolved.isDefaultValue,
      id: `${nodeId}.${p.name}`,
      nodeId,
      x: 0,
      y: 0,
    };
  });
}

export function buildPortsFromSubApp(
  nodeId: string,
  params: Array<{ name: string; kind: "event" | "data"; direction: "input" | "output" }>,
  paramMap?: Map<string, string>,
): EditorPort[] {
  return params.map((p) => ({
    name: p.name,
    kind: p.kind,
    direction: p.direction,
    value: p.kind === "data" ? paramMap?.get(p.name) : undefined,
    isDefaultValue: false,
    id: `${nodeId}.${p.name}`,
    nodeId,
    x: 0,
    y: 0,
  }));
}

export interface ConvertedGraph {
  nodes: EditorNode[];
  connections: EditorConnection[];
  normParams: { minX: number; minY: number; scale: number; offsetX: number; offsetY: number };
  initialZoom: number;
}

/**
 * Convert a SysModel diagram to editor-friendly nodes and connections.
 */
export function convertDiagramToEditorGraph(
  diagram: SysModel,
  fbTypes: Map<string, FBTypeModel>,
  dimensionCache: Map<string, { width: number; height: number }>,
  logger: { info: (message: string, ...args: unknown[]) => void; debug: (message: string, ...args: unknown[]) => void },
): ConvertedGraph {
  // First pass: create nodes and cache dimensions by type
  const diagramBlocks: (SysBlock | SysSubApp)[] = [
    ...(diagram.subAppNetwork.blocks || []),
    ...(diagram.subAppNetwork.subApps || []),
  ];

  const rawNodes = diagramBlocks.map((b) => {
    const subAppParams = "subAppInterfaceParams" in b ? b.subAppInterfaceParams : undefined;
    const paramMap = new Map<string, string>();
    const params = b.parameters;
    if (params) {
      for (const param of params) {
        if (param?.name !== undefined) {
          paramMap.set(param.name, param.value ?? "");
        }
      }
    }
    const fbType = fbTypes.get(b.typeShort);
    const ports = subAppParams
      ? buildPortsFromSubApp(b.id, subAppParams, paramMap)
      : (fbType ? buildPorts(b.id, fbType, paramMap) : []);
    const inferredKind: FBKind | undefined = subAppParams ? FBKind.SUBAPP : ("fbKind" in b ? b.fbKind : undefined);

    // Use cached dimensions or calculate and cache them
    let dimensions = dimensionCache.get(b.typeShort);
    if (!dimensions) {
      dimensions = calculateNodeDimensions(ports);
      dimensionCache.set(b.typeShort, dimensions);
    }
    const { width, height } = dimensions;

    // Find device color if this block is mapped to a device
    let deviceColor: string | undefined;
    const blockMapping = diagram.mappings?.find((m) => m.fbInstance === b.id);
    if (blockMapping && diagram.devices) {
      const device = diagram.devices.find((d) => d.name === blockMapping.device);
      if (device?.color) {
        deviceColor = device.color;
      }
    }

    return {
      id: b.id,
      type: b.typeShort,
      x: b.x,
      y: b.y,
      ports: ports,
      width: width,
      height: height,
      deviceColor: deviceColor,
      fbKind: inferredKind,
      resolvedTypePath: "resolvedTypePath" in b ? (b as SysBlock).resolvedTypePath : undefined,
      subAppInterfaceParams: subAppParams,
    };
  });

  // Scale and shift coordinates (adaptive multiplier based on block count)
  logger.info("Normalizing coordinates for", rawNodes.length, "nodes");
  const { coords: coordinateMap, params: normParams, boundsWidth, boundsHeight } = normalizeCoordinates(
    rawNodes.map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height })),
  );
  logger.debug("Normalization params:", JSON.stringify(normParams));

  // Apply normalized coordinates to nodes
  let normalizedCount = 0;
  for (const node of rawNodes) {
    const key = `${node.x},${node.y}`;
    const normalized = coordinateMap.get(key);
    if (normalized) {
      logger.debug(`Node ${node.id}: (${node.x}, ${node.y}) → (${normalized.x.toFixed(1)}, ${normalized.y.toFixed(1)})`);
      node.x = normalized.x;
      node.y = normalized.y;
      normalizedCount++;
    }
  }
  logger.info("Normalized", normalizedCount, "node coordinates");

  // Auto-fit: compute zoom to fit entire diagram in viewport
  const totalWidth = boundsWidth + 2 * COORDINATE_CONFIG.PADDING;
  const totalHeight = boundsHeight + 2 * COORDINATE_CONFIG.PADDING;
  const initialZoom = Math.max(
    ZOOM_CONFIG.MIN,
    Math.min(
      1.0,
      COORDINATE_CONFIG.TARGET_WIDTH / totalWidth,
      COORDINATE_CONFIG.TARGET_HEIGHT / totalHeight,
    ),
  );
  logger.info(`Auto-fit zoom: ${initialZoom.toFixed(3)} (diagram: ${boundsWidth.toFixed(0)}×${boundsHeight.toFixed(0)})`);

  const mappedConnections = (diagram.subAppNetwork.connections || []).map((c) => {
    const editorConn = {
      id: `${c.fromBlock}.${c.fromPort}->${c.toBlock}.${c.toPort}`,
      fromPortId: `${c.fromBlock}.${c.fromPort}`,
      toPortId: `${c.toBlock}.${c.toPort}`,
      type: c.type,
    };
    logger.debug(`Created EditorConnection: ${editorConn.id} (type=${editorConn.type})`);
    return editorConn;
  });

  return {
    nodes: rawNodes,
    connections: mappedConnections,
    normParams,
    initialZoom,
  };
}
