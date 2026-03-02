import { FBTypeModel, FBPort } from "../domain/fbtModel";
import { FBKind } from "../domain/FBKind";
import { getWebviewLogger } from "./logging";
import { calculateNodeDimensions } from "./layout/nodeLayout";
import { editorReducer, createInitialState } from "./store/reducer";
import type { EditorAction } from "./store/actions";
import type { EditorStore, EditorStoreState } from "./store/types";
import { logEditorAction } from "./store/middleware";
import { normalizeCoordinates } from "./utils/coordinateNormalization";
import { COORDINATE_CONFIG, ZOOM_CONFIG } from "./constants";

/**
 * Represents a block (FB instance) in the diagram
 */
export interface DiagramBlock {
  id: string;
  typeShort: string;
  typeLong: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  subAppInterfaceParams?: Array<{ name: string; kind: "event" | "data"; direction: "input" | "output" }>;
}

/** Extended DiagramBlock includes detection info from SYS parser */
export interface DiagramBlockWithKind extends DiagramBlock {
  fbKind?: FBKind;
  resolvedTypePath?: string;
}

/**
 * Represents a connection between two ports
 */
export interface DiagramConnection {
  fromBlock: string;
  fromPort: string;
  toBlock: string;
  toPort: string;
  type?: "event" | "data";  // Connection type from SYS file
}

/**
 * Represents the complete diagram model loaded from a file
 */
export interface DiagramSubAppNetwork {
  blocks: DiagramBlock[];
  subApps?: DiagramBlock[];
  connections?: DiagramConnection[];
}

export interface DiagramModel {
  applicationName: string;
  subAppNetwork: DiagramSubAppNetwork;
  mappings?: Array<{ fbInstance: string; device: string; resource?: string }>;
  devices?: Array<{ name: string; type?: string; color?: string; [key: string]: any }>;
}

export interface EditorPort extends FBPort {
  id: string;
  nodeId: string;
  x: number;
  y: number;
  value?: string;
}

export interface EditorNode {
  id: string;
  type: string;
  x: number;
  y: number;
  ports: EditorPort[];
  width: number;
  height: number;
  deviceColor?: string;  // Color from device mapping (R,G,B)
  fbKind?: FBKind;
  resolvedTypePath?: string;
}

export interface EditorConnection {
  id: string;
  fromPortId: string;
  toPortId: string;
  type?: "event" | "data";  // Connection type from diagram
}

export interface ViewState {
  zoom: number;        // 1.0 = 100%
  offsetX: number;     // Pan offset X
  offsetY: number;     // Pan offset Y
}

export class EditorState implements EditorStore {
  nodes: EditorNode[] = [];
  connections: EditorConnection[] = [];
  isDirty = false;
  isDragging = false;
  hoveredPortId?: string;
  pendingConnection?: {
    fromPortId: string;
    fromPortKind: 'event' | 'data';
    fromPortDirection: 'input' | 'output';
    fromPortDataType?: string;
    mouseX: number;
    mouseY: number;
  };
  fbTypes?: Map<string, FBTypeModel>;
  model?: any;  
  private logger = getWebviewLogger();
  private postMessageFn?: (msg: unknown) => void;

  // Normalization parameters for reverse transformation on save
  private normParams?: { minX: number; minY: number; scale: number; offsetX: number; offsetY: number };

  // Cache node dimensions by FB type to avoid recalculation
  private dimensionCache: Map<string, { width: number; height: number }> = new Map();

  view: ViewState = {
    zoom: 1.0,
    offsetX: 0,
    offsetY: 0
  };

  selection: {
    nodeId?: string;
    connectionId?: string;
  } = {};

  private storeState: EditorStoreState = createInitialState();
  private listeners = new Set<(state: EditorStoreState) => void>();

  constructor() {
    this.syncPublicStateFromStore();
  }

  /**
   * Set postMessage callback for communicating dirty state to extension host.
   */
  public setPostMessage(fn: (msg: unknown) => void): void {
    this.postMessageFn = fn;
  }

  /**
   * Get stored normalization parameters (for reverse transform on save).
   */
  public getNormParams(): { minX: number; minY: number; scale: number; offsetX: number; offsetY: number } | undefined {
    return this.normParams;
  }

  public getState(): EditorStoreState {
    return this.storeState;
  }

  public subscribe(listener: (state: EditorStoreState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public dispatch(action: EditorAction): void {
    // Central state pipeline: dispatch -> reducer -> sync public fields -> notify subscribers
    logEditorAction(action);
    this.storeState = editorReducer(this.storeState, action);
    this.syncPublicStateFromStore();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.storeState);
    }
  }

  private syncPublicStateFromStore(): void {
    const prevDirty = this.isDirty;
    this.nodes = this.storeState.diagram.nodes;
    this.connections = this.storeState.diagram.connections;
    this.isDirty = this.storeState.diagram.isDirty;
    this.fbTypes = this.storeState.diagram.fbTypes;
    this.model = this.storeState.diagram.model;
    this.isDragging = this.storeState.ui.isDragging;
    this.hoveredPortId = this.storeState.ui.hoveredPortId;
    this.pendingConnection = this.storeState.ui.pendingConnection;
    this.selection = { ...this.storeState.ui.selection };
    this.view = { ...this.storeState.ui.viewport };

    // Notify extension host when dirty state changes
    if (this.isDirty !== prevDirty && this.postMessageFn) {
      this.postMessageFn({ type: "dirty-state-changed", isDirty: this.isDirty });
    }
  }

  public loadFromDiagram(
    diagram: DiagramModel,
    fbTypes: Map<string, FBTypeModel>
  ) {
    // Build editor-friendly graph structures, then commit with a single atomic action.
    // Clear caches when loading new diagram
    this.dimensionCache.clear();

    // First pass: create nodes and cache dimensions by type
    const diagramBlocks: DiagramBlock[] = [
      ...(diagram.subAppNetwork.blocks || []),
      ...((diagram.subAppNetwork as any).subApps || []),
    ];

    const rawNodes = diagramBlocks.map((b: any) => {
      const subAppParams = (b as any).subAppInterfaceParams as Array<{ name: string; kind: "event" | "data"; direction: "input" | "output" }> | undefined;
      const paramMap = new Map<string, string>();
      const params = (b as any).parameters as Array<{ name: string; value: string }> | undefined;
      if (params) {
        for (const param of params) {
          if (param?.name !== undefined) {
            paramMap.set(param.name, param.value ?? "");
          }
        }
      }
      const fbType = fbTypes.get(b.typeShort);
      const ports = subAppParams
        ? this.buildPortsFromSubApp(b.id, subAppParams, paramMap)
        : (fbType ? this.buildPorts(b.id, fbType, paramMap) : []);
      const inferredKind = subAppParams ? "SUBAPP" : (b as any).fbKind;
      
      // Use cached dimensions or calculate and cache them (optimization #4)
      let dimensions = this.dimensionCache.get(b.typeShort);
      if (!dimensions) {
        dimensions = calculateNodeDimensions(ports);
        this.dimensionCache.set(b.typeShort, dimensions);
      }
      const { width, height } = dimensions;
      
      // Find device color if this block is mapped to a device
      let deviceColor: string | undefined;
      const blockMapping = diagram.mappings?.find((m: any) => m.fbInstance === b.id);
      if (blockMapping && diagram.devices) {
        const device = diagram.devices.find((d: any) => d.name === blockMapping.device);
        if (device && (device as any).color) {
          deviceColor = (device as any).color;
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
        resolvedTypePath: (b as any).resolvedTypePath,
        subAppInterfaceParams: (b as any).subAppInterfaceParams,
      };
    });

    // Scale and shift coordinates (adaptive multiplier based on block count)
    this.logger.info("Normalizing coordinates for", rawNodes.length, "nodes");
    const { coords: coordinateMap, params: normParams, boundsWidth, boundsHeight } = normalizeCoordinates(
      rawNodes.map(n => ({ x: n.x, y: n.y, width: n.width, height: n.height }))
    );
    this.normParams = normParams;
    this.logger.debug("Normalization params:", JSON.stringify(normParams));

    // Apply normalized coordinates to nodes
    let normalizedCount = 0;
    for (const node of rawNodes) {
      const key = `${node.x},${node.y}`;
      const normalized = coordinateMap.get(key);
      if (normalized) {
        this.logger.debug(`Node ${node.id}: (${node.x}, ${node.y}) → (${normalized.x.toFixed(1)}, ${normalized.y.toFixed(1)})`);
        node.x = normalized.x;
        node.y = normalized.y;
        normalizedCount++;
      }
    }
    this.logger.info("Normalized", normalizedCount, "node coordinates");

    // Auto-fit: compute zoom to fit entire diagram in viewport
    const totalWidth = boundsWidth + 2 * COORDINATE_CONFIG.PADDING;
    const totalHeight = boundsHeight + 2 * COORDINATE_CONFIG.PADDING;
    const initialZoom = Math.max(
      ZOOM_CONFIG.MIN,
      Math.min(
        1.0,
        COORDINATE_CONFIG.TARGET_WIDTH / totalWidth,
        COORDINATE_CONFIG.TARGET_HEIGHT / totalHeight
      )
    );
    this.logger.info(`Auto-fit zoom: ${initialZoom.toFixed(3)} (diagram: ${boundsWidth.toFixed(0)}×${boundsHeight.toFixed(0)})`);


    const mappedConnections = (diagram.subAppNetwork.connections || []).map((c: DiagramConnection) => {
      const editorConn = {
        id: `${c.fromBlock}.${c.fromPort}->${c.toBlock}.${c.toPort}`,
        fromPortId: `${c.fromBlock}.${c.fromPort}`,
        toPortId: `${c.toBlock}.${c.toPort}`,
        type: c.type
      };
      this.logger.debug(`Created EditorConnection: ${editorConn.id} (type=${editorConn.type})`);
      return editorConn;
    });

    this.dispatch({
      type: "SET_GRAPH_DATA",
      model: diagram,
      fbTypes,
      nodes: rawNodes,
      connections: mappedConnections,
      initialZoom
    });

    this.logger.info("Total nodes created", this.nodes.length);
    this.logger.info("Total connections created", this.connections.length);
  }

  private buildPorts(
    nodeId: string,
    fbType: FBTypeModel,
    paramMap?: Map<string, string>
  ): EditorPort[] {
    return fbType.ports.map((p) => ({
      ...p,
      value: p.kind === "data" ? paramMap?.get(p.name) : undefined,
      id: `${nodeId}.${p.name}`,
      nodeId,
      x: 0,
      y: 0
    }));
  }

  private buildPortsFromSubApp(
    nodeId: string,
    params: Array<{ name: string; kind: "event" | "data"; direction: "input" | "output" }>,
    paramMap?: Map<string, string>
  ): EditorPort[] {
    return params.map((p) => ({
      name: p.name,
      kind: p.kind,
      direction: p.direction,
      value: p.kind === "data" ? paramMap?.get(p.name) : undefined,
      id: `${nodeId}.${p.name}`,
      nodeId,
      x: 0,
      y: 0
    }));
  }

  public moveNode(id: string, x: number, y: number) {
    this.dispatch({ type: "MOVE_NODE", nodeId: id, x, y });
  }

  public selectNode(id?: string) {
    this.dispatch({ type: "SELECT_NODE", nodeId: id });
  }

  /**
   * Generate a unique node ID like "E_SWITCH_3" by finding the highest
   * existing suffix number for this type among all current nodes.
   */
  private generateNodeId(blockType: string): string {
    const prefix = `${blockType}_`;
    let maxNum = 0;
    for (const node of this.nodes) {
      if (node.id.startsWith(prefix)) {
        const suffix = node.id.slice(prefix.length);
        const num = parseInt(suffix, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    return `${prefix}${maxNum + 1}`;
  }

  /**
   * Add a new FB block to the diagram by type name and world coordinates.
   * Builds ports from FBTypeModel, calculates dimensions, generates unique ID,
   * and dispatches ADD_NODE to the store.
   */
  public addNode(blockType: string, worldX: number, worldY: number): void {
    const fbType = this.fbTypes?.get(blockType);
    if (!fbType) {
      this.logger.warn(`Cannot add node: FB type "${blockType}" not found in loaded types`);
      return;
    }

    const id = this.generateNodeId(blockType);
    const ports = this.buildPorts(id, fbType);

    // Use cached dimensions or calculate and cache them
    let dimensions = this.dimensionCache.get(blockType);
    if (!dimensions) {
      dimensions = calculateNodeDimensions(ports);
      this.dimensionCache.set(blockType, dimensions);
    }

    this.dispatch({
      type: "ADD_NODE",
      node: {
        id,
        type: blockType,
        x: worldX,
        y: worldY,
        ports,
        width: dimensions.width,
        height: dimensions.height,
      },
    });

    this.logger.info(`Added node "${id}" (type=${blockType}) at (${worldX.toFixed(1)}, ${worldY.toFixed(1)})`);
  }
}

