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
import {
  EMPTY_NODES_COLOR,
  EMPTY_NODES_FONT,
  EMPTY_NODES_X,
  EMPTY_NODES_Y,
} from "./constants";
import { tr } from "../i18nService";

/**
 * Main canvas renderer class
 * Manages the rendering pipeline and canvas state
 */
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private logger = getWebviewLogger();
  private _dpr = 1;

  /** Camera state for viewport transformations */
  camera: Camera;

  /** Device pixel ratio for HiDPI rendering */
  get dpr(): number {
    return this._dpr;
  }

  /** Logical (CSS) width of the canvas */
  get logicalWidth(): number {
    return this.canvas.width / this._dpr;
  }

  /** Logical (CSS) height of the canvas */
  get logicalHeight(): number {
    return this.canvas.height / this._dpr;
  }

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
   * Update the canvas buffer size for HiDPI and store the DPR.
   * Called by the layout module on resize.
   */
  applyDpr(cssWidth: number, cssHeight: number): void {
    const dpr = window.devicePixelRatio || 1;
    this._dpr = dpr;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
  }



  /**
   * Main render method - orchestrates the rendering pipeline
   *
   * @param state - Current editor state with nodes and connections
   */
  render(state: EditorState): void {
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    this.logger.debug(`Rendering ${state.nodes.length} nodes`);
    this.logger.debug("Canvas size", w, "x", h, `(dpr=${this._dpr})`);

    // Clear canvas buffer at full resolution (before DPR scale)
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);

    // Apply DPR scale so all subsequent drawing uses logical (CSS) coordinates
    this.ctx.save();
    this.ctx.scale(this._dpr, this._dpr);

    // Draw grid background
    drawGrid(this.ctx, w, h);

    // Apply camera and zoom transformations
    this.ctx.save();
    
    // Apply zoom from editor state
    this.ctx.translate(w / 2, h / 2);
    this.ctx.scale(state.view.zoom, state.view.zoom);
    this.ctx.translate(-w / 2, -h / 2);
    
    // Apply camera transformation for compatibility with existing system
    applyCamera(this.ctx, this.camera);

    // Draw connections (now port positions are available)
    drawConnections(this.ctx, state, state.selection.connectionId);
    
    // Draw nodes
    drawNodes(this.ctx, state.nodes, state.selection.nodeId, state.hoveredPortId);

    this.ctx.restore();

    // Show empty diagram message in screen space (outside transform)
    if (state.nodes.length === 0) {
      this.ctx.fillStyle = EMPTY_NODES_COLOR;
      this.ctx.font = EMPTY_NODES_FONT;
      this.ctx.fillText(tr("canvas.emptyDiagram"), EMPTY_NODES_X, EMPTY_NODES_Y);
    }

    // Draw overlay UI (stats and legend) - not affected by zoom
    drawStatsAndLegend(this.ctx, state, w, {
      offsetX: this.camera.offsetX,
      offsetY: this.camera.offsetY,
      scale: this.camera.scale * state.view.zoom,
    });

    this.ctx.restore(); // pop DPR scale
  }
}
