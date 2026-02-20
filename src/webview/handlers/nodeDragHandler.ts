import { EditorState, EditorNode } from "../editorState";
import { CanvasRenderer } from "../rendering/canvasRenderer";
import { PADDING_CONFIG, PAN_CONFIG } from "../constants";

/**
 * Manages the dragging and movement of diagram nodes
 * Single Responsibility: Node manipulation
 */
export class NodeDragHandler {
  private draggingNodeId?: string;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private state: EditorState,
    private renderer: CanvasRenderer,
    private getMousePos: (e: MouseEvent) => { x: number; y: number }
  ) {}

  /**
   * Check if node is being dragged
   */
  isDragging(): boolean {
    return !!this.draggingNodeId;
  }

  /**
   * Start node drag operation if a node is at the click position
   * Returns true if a node was found and drag started
   */
  tryStartDrag(e: MouseEvent): boolean {
    const pos = this.getMousePos(e);

    // Find the node at clicked position using actual node dimensions
    const node = this.state.nodes.find(n =>
      pos.x >= n.x &&
      pos.x <= n.x + n.width &&
      pos.y >= n.y &&
      pos.y <= n.y + n.height
    );

    if (node) {
      this.draggingNodeId = node.id;
      this.state.dispatch({ type: "START_DRAG", nodeId: node.id });

      // Calculate and store offset between mouse position and node top-left corner
      this.dragOffsetX = pos.x - node.x;
      this.dragOffsetY = pos.y - node.y;

      return true;
    }

    return false;
  }

  /**
   * Update dragged node position
   */
  updateDragPosition(e: MouseEvent): void {
    if (!this.draggingNodeId) return;

    const pos = this.getMousePos(e);

    // Move node so that the same point stays under the cursor
    const newX = pos.x - this.dragOffsetX;
    const newY = pos.y - this.dragOffsetY;

    this.state.dispatch({
      type: "MOVE_NODE",
      nodeId: this.draggingNodeId,
      x: newX,
      y: newY
    });

    // Auto-scroll camera if node goes out of view
    const node = this.state.nodes.find(n => n.id === this.draggingNodeId);
    if (node) {
      this.autoScrollCameraToNode(node);
    }

    this.renderer.render(this.state);
  }

  /**
   * End dragging operation
   */
  stopDrag(): void {
    if (this.draggingNodeId) {
      this.state.dispatch({ type: "STOP_DRAG" });
    }
    this.draggingNodeId = undefined;
  }

  /**
   * Auto-scroll camera to keep dragged node visible in viewport
   */
  private autoScrollCameraToNode = (node: EditorNode) => {
    const camera = this.renderer.camera;
    const padding = PADDING_CONFIG.AUTO_SCROLL_PADDING;

    // Convert node world coordinates to canvas coordinates
    const nodeScreenX = node.x * camera.scale + camera.offsetX;
    const nodeScreenY = node.y * camera.scale + camera.offsetY;
    const nodeScreenWidth = node.width * camera.scale;
    const nodeScreenHeight = node.height * camera.scale;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    let offsetDeltaX = 0;
    let offsetDeltaY = 0;

    // Check if node is out of bounds horizontally
    if (nodeScreenX - padding < 0) {
      offsetDeltaX = -(nodeScreenX - padding);
    } else if (nodeScreenX + nodeScreenWidth + padding > canvasWidth) {
      offsetDeltaX = canvasWidth - (nodeScreenX + nodeScreenWidth + padding);
    }

    // Check if node is out of bounds vertically
    if (nodeScreenY - padding < 0) {
      offsetDeltaY = -(nodeScreenY - padding);
    } else if (nodeScreenY + nodeScreenHeight + padding > canvasHeight) {
      offsetDeltaY = canvasHeight - (nodeScreenY + nodeScreenHeight + padding);
    }

    // Apply smooth camera movement
    if (offsetDeltaX !== 0 || offsetDeltaY !== 0) {
      const appliedDeltaX = offsetDeltaX * PAN_CONFIG.AUTO_SCROLL_SPEED;
      const appliedDeltaY = offsetDeltaY * PAN_CONFIG.AUTO_SCROLL_SPEED;

      camera.offsetX += appliedDeltaX;
      camera.offsetY += appliedDeltaY;
      this.state.dispatch({ type: "PAN", dx: appliedDeltaX, dy: appliedDeltaY });
    }
  };
}
