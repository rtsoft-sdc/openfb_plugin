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
   * Main render method - orchestrates the rendering pipeline
   *
   * Rendering order:
   * 1. Clear canvas
   * 2. Draw grid background
   * 3. Fit camera to nodes (if not dragging)
   * 4. Apply camera transformation
   * 5. Draw connections and nodes
   * 6. Draw overlay (stats and legend)
   *
   * @param state - Current editor state with nodes and connections
   */
  render(state: EditorState): void {
    this.logger.debug(`Rendering ${state.nodes.length} nodes`);
    this.logger.debug("Canvas size", this.canvas.width, "x", this.canvas.height);

    // Step 1: Clear canvas completely
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);

    // Step 2: Draw grid background
    drawGrid(this.ctx, this.canvas.width, this.canvas.height);

    // Step 3: Auto-fit camera to show all nodes (but not during drag operations)
    if (!state.isDragging) {
      fitCameraToNodes(
        this.camera,
        state.nodes,
        this.canvas.width,
        this.canvas.height
      );
    }

    // Step 4-5: Apply camera transformation and draw diagram content
    this.ctx.save();
    applyCamera(this.ctx, this.camera);

    drawConnections(this.ctx, state);
    drawNodes(this.ctx, state.nodes);

    this.ctx.restore();

    // Step 6: Draw overlay UI (stats and legend) - not affected by camera
    drawStatsAndLegend(this.ctx, state, this.canvas, {
      offsetX: this.camera.offsetX,
      offsetY: this.camera.offsetY,
      scale: this.camera.scale,
    });
  }
}
