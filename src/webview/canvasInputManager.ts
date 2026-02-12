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

    // Left mouse button for node dragging, node selection, or panning
    if (e.button !== 0) return;

    // Get world coordinates to check for node selection
    const worldPos = this.getMousePos(e);
    
    // Try to find and select a node at click position
    const clickedNode = this.findNodeAtPoint(worldPos.x, worldPos.y);
    if (clickedNode) {
      // Node was clicked - select it
      this.state.selectNode(clickedNode.id);
      this.renderer.render(this.state);
      return;
    }

    // Try to start node drag (if a node is already selected, might drag it)
    if (this.nodeDragHandler.tryStartDrag(e)) {
      return;
    }

    // Empty area was clicked - deselect any node and start panning
    this.state.selectNode(undefined);
    this.renderer.render(this.state);
    this.viewportController.startPanning(e);
  };

  /**
   * Find the node at the given world coordinates
   * Returns the topmost node if multiple nodes overlap
   * @param worldX - World coordinate X
   * @param worldY - World coordinate Y
   * @returns The node at the point, or undefined if no node
   */
  private findNodeAtPoint(worldX: number, worldY: number) {
    for (const node of this.state.nodes) {
      // Check if point is inside node bounding box
      if (
        worldX >= node.x &&
        worldX <= node.x + node.width &&
        worldY >= node.y &&
        worldY <= node.y + node.height
      ) {
        return node;
      }
    }
    return undefined;
  }

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