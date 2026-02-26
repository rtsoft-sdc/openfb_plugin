/**
 * Canvas Renderer
 * Orchestrates rendering of the diagram onto the canvas
 *
 * This class delegates specific rendering tasks to specialized modules:
 * - Grid and background: rendering/grid.ts
 * - Nodes and ports: rendering/nodeRenderer.ts, rendering/portRenderer.ts
 * - Connections: rendering/connectionRenderer.ts
 * - Legend and stats: rendering/legendRenderer.ts
 * - Camera transformations: rendering/camera.ts
 */

import { EditorState } from "../editorState";
import { getWebviewLogger } from "../logging";

// Import rendering modules
import {
  createCamera,
  applyCamera,
} from "./camera";
import { Camera } from "./types";
import { clearCanvas, drawGrid } from "./grid";
import { drawConnections } from "./connectionRenderer";
import { drawNodes } from "./nodeRenderer";
import { drawStatsAndLegend } from "./legendRenderer";
import { layoutPorts } from "./portRenderer";

/**
 * Main canvas renderer class
 * Manages the rendering pipeline and canvas state
 */
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private logger = getWebviewLogger();

  /** Camera state for viewport transformations */
  camera: Camera;

  /**
   * Initialize renderer with canvas element
   *
   * @param canvas - HTML canvas element to render on
   * @throws Error if canvas 2D context cannot be obtained
   */
  constructor(public readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      this.logger.error("Failed to get 2D context from canvas");
      throw new Error("No canvas context");
    }

    this.camera = createCamera();
    this.logger.info("CanvasRenderer initialized successfully");
    this.ctx = ctx;
  }



  /**
   * Main render method - orchestrates the rendering pipeline
   *
   * @param state - Current editor state with nodes and connections
   */
  render(state: EditorState): void {
    this.logger.debug(`Rendering ${state.nodes.length} nodes`);
    this.logger.debug("Canvas size", this.canvas.width, "x", this.canvas.height);

    // Clear canvas completely
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);

    // Draw grid background
    drawGrid(this.ctx, this.canvas.width, this.canvas.height);

    // Apply camera and zoom transformations
    this.ctx.save();
    
    // Apply zoom from editor state
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(state.view.zoom, state.view.zoom);
    this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
    
    // Apply camera transformation for compatibility with existing system
    applyCamera(this.ctx, this.camera);

    // Layout ports BEFORE drawing connections
    // This ensures port coordinates are computed before connections try to use them
    //for (const node of state.nodes) {
      //layoutPorts(node);
    //}

    // Draw connections (now port positions are available)
    drawConnections(this.ctx, state, state.selection.connectionId);
    
    // Draw nodes
    drawNodes(this.ctx, state.nodes, state.selection.nodeId, state.hoveredPortId);

    this.ctx.restore();

    // Draw overlay UI (stats and legend) - not affected by zoom
    drawStatsAndLegend(this.ctx, state, this.canvas, {
      offsetX: this.camera.offsetX,
      offsetY: this.camera.offsetY,
      scale: this.camera.scale * state.view.zoom,
    });
  }
}
