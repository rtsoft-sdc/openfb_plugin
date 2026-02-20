import { EditorState } from "../editorState";
import { CanvasRenderer } from "../rendering/canvasRenderer";
import { NodeDragHandler } from "../handlers/nodeDragHandler";
import { ViewportController } from "../handlers/viewportController";
import { screenToWorld } from "../layout/transformUtils";

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
    this.viewportController = new ViewportController(state, renderer);
    this.init();
  }

  private init() {
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("mousemove", this.onCanvasMouseMove);
    this.canvas.addEventListener("mouseup", this.onCanvasMouseUp);
    this.canvas.addEventListener("wheel", this.onWheel);
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
    
    // Try to find and start dragging a node at click position
    const clickedNode = this.findNodeAtPoint(worldPos.x, worldPos.y);
    if (clickedNode) {
      // Input layer dispatches interaction actions; state updates are handled by reducer.
      // Try to start drag first (so click-and-drag works)
      if (this.nodeDragHandler.tryStartDrag(e)) {
        this.renderer.render(this.state);
        return;
      }

      // If drag didn't start, select the node
      this.state.dispatch({ type: "SELECT_NODE", nodeId: clickedNode.id });
      this.renderer.render(this.state);
      return;
    }

    // Empty area was clicked - deselect any node and start panning
    this.state.dispatch({ type: "SELECT_NODE", nodeId: undefined });
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

  private onCanvasMouseUp = () => {
    this.viewportController.stopPanning();
  };

  private onWindowMouseUp = () => {
    this.nodeDragHandler.stopDrag();
    this.viewportController.stopPanning();
  };

  private onWheel = (e: WheelEvent) => {
    // Prevent default scroll behavior
    e.preventDefault();

    // Get mouse position relative to canvas
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Handle zoom with wheel
    this.viewportController.handleZoom(e.deltaY, screenX, screenY);
  };
}