import { EditorState } from "./editorState";
import { CanvasRenderer } from "./canvasRenderer";
import { NodeDragHandler } from "./handlers/nodeDragHandler";
import { ViewportController } from "./handlers/viewportController";
import { screenToWorld } from "./transformUtils";

/**
 * Manages canvas input events for the diagram editor
 * Routes mouse/keyboard events to appropriate handlers
 * Single Responsibility: Event routing and coordination
 */
export class CanvasInputManager {
  private nodeDragHandler: NodeDragHandler;
  private viewportController: ViewportController;

  constructor(
    private canvas: HTMLCanvasElement,
    private state: EditorState,
    private renderer: CanvasRenderer
  ) {
    this.nodeDragHandler = new NodeDragHandler(canvas, state, renderer, this.getMousePos);
    this.viewportController = new ViewportController(canvas, state, renderer);
    this.init();
  }

  private init() {
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("wheel", this.onMouseWheel, { passive: false });
    this.canvas.addEventListener("mousemove", this.onCanvasMouseMove);
    this.canvas.addEventListener("mouseup", this.onCanvasMouseUp);
    window.addEventListener("mousemove", this.onWindowMouseMove);
    window.addEventListener("mouseup", this.onWindowMouseUp);
  }

  /**
   * Get world coordinates from mouse event using screen-to-world transformation.
   * Passed to NodeDragHandler to calculate node positions during drag operations.
   */
  private getMousePos = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    return screenToWorld(this.canvas, this.renderer.camera, this.state.view.zoom, screenX, screenY);
  };

  private onMouseDown = (e: MouseEvent) => {
    // Middle mouse button (button 1) for panning
    if (e.button === 1) {
      e.preventDefault();
      this.viewportController.startPanning(e);
      return;
    }

    // Left mouse button for node dragging or panning
    if (e.button !== 0) return;

    // Try to start node drag first
    if (this.nodeDragHandler.tryStartDrag(e)) {
      return;
    }

    // Empty area was clicked - start panning
    this.viewportController.startPanning(e);
  };

  private onWindowMouseMove = (e: MouseEvent) => {
    this.nodeDragHandler.updateDragPosition(e);
  };

  private onCanvasMouseMove = (e: MouseEvent) => {
    this.viewportController.updatePan(e);
  };

  private onCanvasMouseUp = (e: MouseEvent) => {
    this.viewportController.stopPanning();
  };

  private onWindowMouseUp = () => {
    this.nodeDragHandler.stopDrag();
  };

  private onMouseWheel = (e: WheelEvent) => {
    e.preventDefault();

    // Ctrl+Wheel for zooming
    if (e.ctrlKey) {
      this.viewportController.handleZoom(e);
    } else {
      // Regular scroll wheel for panning (vertical)
      // Shift+Wheel for horizontal panning
      this.viewportController.handleScrollPan(e);
    }
  };
}