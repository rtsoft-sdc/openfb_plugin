import { FBTypeModel, FBPort } from "../domain/fbtModel";
import { getWebviewLogger } from "./logging";
import { ZOOM_CONFIG, PADDING_CONFIG, DIAGRAM_CONFIG } from "./constants";
import { calculateNodeDimensions } from "./nodeLayout";

/**
 * Represents a block (FB instance) in the diagram
 */
export interface DiagramBlock {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
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
export interface DiagramModel {
  blocks: DiagramBlock[];
  connections: DiagramConnection[];
}

export interface EditorPort extends FBPort {
  id: string;
  nodeId: string;
  x: number;
  y: number;
}

export interface EditorNode {
  id: string;
  type: string;
  x: number;
  y: number;
  ports: EditorPort[];
  width: number;
  height: number;
}

export interface EditorConnection {
  id: string;
  fromPortId: string;
  toPortId: string;
  type?: "event" | "data";  // Connection type from diagram
}

export interface ViewState {
  zoom: number;        // 1.0 = 100%, min 0.1, max 5.0
  offsetX: number;     // Pan offset X (used in fitToView for centering)
  offsetY: number;     // Pan offset Y (used in fitToView for centering)
  minZoom: number;
  maxZoom: number;
}

export class EditorState {
  nodes: EditorNode[] = [];
  connections: EditorConnection[] = [];
  isDragging = false;
  fbTypes?: Map<string, FBTypeModel>;
  model?: any;  // Can have additional properties like parameters
  private logger = getWebviewLogger();

  // Cached diagram bounds to avoid recalculation
  private cachedBounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;

  // Cache node dimensions by FB type to avoid recalculation
  private dimensionCache: Map<string, { width: number; height: number }> = new Map();

  view: ViewState = {
    zoom: 1.0,
    offsetX: 0,
    offsetY: 0,
    minZoom: ZOOM_CONFIG.MIN,
    maxZoom: ZOOM_CONFIG.MAX
  };

  selection: {
    nodeId?: string;
    connectionId?: string;
  } = {};

  public loadFromDiagram(
    diagram: DiagramModel,
    fbTypes: Map<string, FBTypeModel>
  ) {
    // Store for later access (e.g., in sidepanel)
    this.fbTypes = fbTypes;
    this.model = diagram;
    
    // Clear caches when loading new diagram
    this.cachedBounds = null;
    this.dimensionCache.clear();

    // First pass: create nodes and cache dimensions by type, find bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const rawNodes = diagram.blocks.map((b: DiagramBlock) => {
      const fbType = fbTypes.get(b.type);
      const ports = fbType ? this.buildPorts(b.id, fbType) : [];
      
      // Use cached dimensions or calculate and cache them (optimization #4)
      let dimensions = this.dimensionCache.get(b.type);
      if (!dimensions) {
        dimensions = calculateNodeDimensions(ports);
        this.dimensionCache.set(b.type, dimensions);
      }
      const { width, height } = dimensions;
      
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x + width);
      minY = Math.min(minY, b.y);
      maxY = Math.max(maxY, b.y + height);
      
      return {
        id: b.id,
        type: b.type,
        x: b.x,
        y: b.y,
        ports: ports,
        width: width,
        height: height
      };
    });

    // Normalize and scale coordinates
    this.nodes = this.normalizeAndScaleCoordinates(rawNodes, minX, maxX, minY, maxY);

    // Store normalized bounds for later use (optimization #2)
    this.cachedBounds = {
      minX: Math.min(...this.nodes.map(n => n.x)),
      maxX: Math.max(...this.nodes.map(n => n.x + n.width)),
      minY: Math.min(...this.nodes.map(n => n.y)),
      maxY: Math.max(...this.nodes.map(n => n.y + n.height))
    };

    this.logger.info("Total nodes created", this.nodes.length);

    // Load connections
    this.logger.debug("Input diagram connections count", diagram.connections.length);
    if (diagram.connections.length > 0) {
      this.logger.debug("Input diagram connections", diagram.connections);
    }

    this.connections = diagram.connections.map((c: DiagramConnection) => {
      const editorConn = {
        id: `${c.fromBlock}.${c.fromPort}->${c.toBlock}.${c.toPort}`,
        fromPortId: `${c.fromBlock}.${c.fromPort}`,
        toPortId: `${c.toBlock}.${c.toPort}`,
        type: c.type  // Preserve connection type from diagram
      };
      this.logger.debug(`Created EditorConnection: ${editorConn.id} (type=${editorConn.type})`);
      return editorConn;
    });

    this.logger.info("Total connections created", this.connections.length);
    if (this.connections.length > 0) {
      this.logger.debug("All EditorConnections", this.connections);
    }
  }

  private buildPorts(
    nodeId: string,
    fbType: FBTypeModel
  ): EditorPort[] {
    return fbType.ports.map((p, index) => ({
      ...p,
      id: `${nodeId}.${p.name}`,
      nodeId,
      x: 0,
      y: 0
    }));
  }

  /**
   * Normalize and scale node coordinates based on diagram bounds
   * Applies scaling if diagram is very large (>SIZE_THRESHOLD units)
   * and shifts all coordinates so minimum is at padding distance
   */
  private normalizeAndScaleCoordinates(
    rawNodes: EditorNode[],
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ): EditorNode[] {
    const diagramWidth = maxX - minX;
    const diagramHeight = maxY - minY;
    const maxDiagramSize = Math.max(diagramWidth, diagramHeight);
    
    // If diagram is very large, scale it down
    // This handles cases where coordinates are in units of 1 but span thousands
    let scale = 1;
    if (maxDiagramSize > DIAGRAM_CONFIG.SIZE_THRESHOLD) {
      scale = DIAGRAM_CONFIG.NORMALIZED_SIZE / maxDiagramSize;
    }

    // Normalize coordinates: shift so minimum is at padding distance, and apply scaling
    const padding = PADDING_CONFIG.LAYOUT_PADDING;
    const offsetX = (minX * scale) - padding;
    const offsetY = (minY * scale) - padding;

    return rawNodes.map((node: EditorNode) => ({
      ...node,
      x: (node.x * scale) - offsetX,
      y: (node.y * scale) - offsetY
      // Keep width and height unchanged - don't scale element sizes
    }));
  }

  private calculateBoundingBox(nodes: EditorNode[]): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + node.width);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + node.height);
    }
    
    return { minX, maxX, minY, maxY };
  }

  public moveNode(id: string, x: number, y: number) {
    const node = this.nodes.find(n => n.id === id);
    if (!node) return;

    node.x = x;
    node.y = y;
  }

  public selectNode(id?: string) {
    this.selection.nodeId = id;
  }

  /**
   * Calculate and set zoom level to fit all nodes in view with padding
   * All nodes should be completely visible
   */
  public fitToView(canvasWidth: number, canvasHeight: number, toolbarHeight: number = 0) {
    if (this.nodes.length === 0) {
      this.view.zoom = 1.0;
      return;
    }

    // Use cached bounds from loadFromDiagram instead of recalculating (optimization #2)
    let bounds = this.cachedBounds;
    if (!bounds) {
      // Fallback if bounds weren't cached (shouldn't happen in normal flow)
      bounds = this.calculateBoundingBox(this.nodes);
    }
    const { minX, maxX, minY, maxY } = bounds;

    const realDiagramWidth = maxX - minX;
    const realDiagramHeight = maxY - minY;
    
    const padding = PADDING_CONFIG.LAYOUT_PADDING;

    const availableWidth = canvasWidth - 2 * padding;
    const availableHeight = canvasHeight - toolbarHeight - 2 * padding;

    if (availableWidth <= 0 || availableHeight <= 0) {
      this.view.zoom = 1.0;
      return;
    }

    // Guard against degenerate diagrams (zero or very small dimensions)
    if (realDiagramWidth <= 0 || realDiagramHeight <= 0) {
      this.view.zoom = 1.0;
      this.view.offsetX = (canvasWidth - 100) / 2; // Default size 100x100
      this.view.offsetY = (canvasHeight - 100) / 2;
      this.logger.warn("Diagram has zero or negative dimensions, using fallback zoom");
      return;
    }

    // Check if diagram fits on screen at zoom 1.0
    const fitsAtZoom1 = (realDiagramWidth <= availableWidth && realDiagramHeight <= availableHeight);

    // Calculate zoom to fit diagram in available space
    const zoomX = availableWidth / realDiagramWidth;
    const zoomY = availableHeight / realDiagramHeight;
    // Use a tighter margin when there are multiple elements that do NOT fit
    const useMargin = (!fitsAtZoom1 && this.nodes.length > 1) ? ZOOM_CONFIG.MULTI_FIT_MARGIN : ZOOM_CONFIG.FIT_ZOOM_MARGIN;
    let fitZoom = Math.min(zoomX, zoomY) * useMargin;

    // If diagram fits at zoom 1.0, cap zoom so elements are not drawn huge
    if (fitsAtZoom1) {
      fitZoom = Math.min(fitZoom, ZOOM_CONFIG.FITS_MAX_ZOOM);
    }

    // Ensure nodes don't become too small visually: compute minimum zoom that keeps largest node readable
    let minZoomForNodeSize = this.view.minZoom;
    if (this.nodes.length > 0) {
      const maxNodeWidth = Math.max(...this.nodes.map(n => n.width));
      const maxNodeHeight = Math.max(...this.nodes.map(n => n.height));
      const minWidthZoom = ZOOM_CONFIG.NODE_MIN_RENDERED_WIDTH / Math.max(1, maxNodeWidth);
      const minHeightZoom = ZOOM_CONFIG.NODE_MIN_RENDERED_HEIGHT / Math.max(1, maxNodeHeight);
      minZoomForNodeSize = Math.max(minWidthZoom, minHeightZoom, minZoomForNodeSize);
    }

    // Clamp to zoom limits, but also respect minZoomForNodeSize
    this.view.zoom = Math.max(this.view.minZoom, Math.max(minZoomForNodeSize, Math.min(this.view.maxZoom, fitZoom)));

    // Center diagram
    const scaledWidth = realDiagramWidth * this.view.zoom;
    const scaledHeight = realDiagramHeight * this.view.zoom;
    this.view.offsetX = (canvasWidth - scaledWidth) / 2 - minX * this.view.zoom;
    this.view.offsetY = (canvasHeight - scaledHeight) / 2 - minY * this.view.zoom;

    this.logger.debug("Fitted to view", {
      zoom: this.view.zoom,
      diagramSize: `${realDiagramWidth}x${realDiagramHeight}`,
      fitsAtZoom1,
      offset: `(${this.view.offsetX}, ${this.view.offsetY})`
    });
  }

  /**
   * Update zoom level with clamping
   */
  public updateZoom(newZoom: number) {
    this.view.zoom = Math.max(this.view.minZoom, Math.min(this.view.maxZoom, newZoom));
  }
}

