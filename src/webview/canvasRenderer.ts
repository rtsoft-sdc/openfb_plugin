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

import { EditorState } from "./editorState";
import { getWebviewLogger } from "./logging";

// Import rendering modules
import {
  createCamera,
  applyCamera,
  fitCameraToNodes,
} from "./rendering/camera";
import { Camera } from "./rendering/types";
import { clearCanvas, drawGrid } from "./rendering/grid";
import { drawConnections } from "./rendering/connectionRenderer";
import { drawNodes } from "./rendering/nodeRenderer";
import { drawStatsAndLegend } from "./rendering/legendRenderer";

/**
 * Main canvas renderer class
 * Manages the rendering pipeline and canvas state
 */
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private logger = getWebviewLogger();

  /** Camera state for viewport transformations */
  camera: Camera;
  private isFirstRender = true;
  private toolbarHeight = 0;

  /**
   * Initialize renderer with canvas element
   *
   * @param canvas - HTML canvas element to render on
   * @throws Error if canvas 2D context cannot be obtained
   */
  constructor(private canvas: HTMLCanvasElement) {
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
   * Set toolbar height for fitToView calculations
   */
  setToolbarHeight(height: number) {
    this.toolbarHeight = height;
  }

  /**
   * Fit camera to nodes - centers and zooms to show all nodes
   */
  fitCameraToNodes(
    nodes: Array<{ x: number; y: number; width: number; height: number }>,
    canvasWidth: number,
    canvasHeight: number,
    toolbarHeight: number = 0
  ): void {
    const effectiveHeight = canvasHeight - toolbarHeight;
    fitCameraToNodes(this.camera, nodes, canvasWidth, effectiveHeight);
    this.logger.debug("Camera fitted to nodes", {
      scale: this.camera.scale,
      offsetX: this.camera.offsetX,
      offsetY: this.camera.offsetY
    });
  }

  /**
   * Main render method - orchestrates the rendering pipeline
   *
   * Rendering order:
   * 1. Clear canvas
   * 2. Draw grid background
   * 3. Fit to view on first render
   * 4. Apply camera and zoom transformations
   * 5. Draw connections and nodes
   * 6. Draw overlay (stats and legend)
   *
   * @param state - Current editor state with nodes and connections
   */
  render(state: EditorState): void {
    this.logger.debug(`Rendering ${state.nodes.length} nodes`);
    this.logger.debug("Canvas size", this.canvas.width, "x", this.canvas.height);

    // 1: Clear canvas completely
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);

    // 2: Draw grid background
    drawGrid(this.ctx, this.canvas.width, this.canvas.height);

    // 3: Auto-fit to view on first render
    if (this.isFirstRender && state.nodes.length > 0) {
      state.fitToView(this.canvas.width, this.canvas.height, this.toolbarHeight);
      this.isFirstRender = false;
    }

    // 4-5: Apply camera and zoom transformations
    this.ctx.save();
    
    // Apply zoom from editor state
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(state.view.zoom, state.view.zoom);
    this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
    
    // Apply camera transformation for compatibility with existing system
    applyCamera(this.ctx, this.camera);

    drawConnections(this.ctx, state);
    drawNodes(this.ctx, state.nodes);

    this.ctx.restore();

    // 6: Draw overlay UI (stats and legend) - not affected by zoom
    drawStatsAndLegend(this.ctx, state, this.canvas, {
      offsetX: this.camera.offsetX,
      offsetY: this.camera.offsetY,
      scale: this.camera.scale * state.view.zoom,
    });
  }
}
