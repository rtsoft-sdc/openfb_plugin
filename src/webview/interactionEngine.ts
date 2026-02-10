import { EditorState } from "./editorState";
import { CanvasRenderer } from "./canvasRenderer";
import { getWebviewLogger } from "./logging";

export class InteractionEngine {
  private draggingNodeId?: string;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private logger = getWebviewLogger();

  constructor(
    private canvas: HTMLCanvasElement,
    private state: EditorState,
    private renderer: CanvasRenderer
  ) {
    this.init();
  }

  private init() {
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  private getMousePos = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();

    return {
      x: (e.clientX - rect.left - this.renderer.camera.offsetX) / this.renderer.camera.scale,
      y: (e.clientY - rect.top - this.renderer.camera.offsetY) / this.renderer.camera.scale
    };
  };

  private onMouseDown = (e: MouseEvent) => {
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
      this.state.isDragging = true;
      this.state.selectNode(node.id);
      
      // Calculate and store offset between mouse position and node top-left corner
      this.dragOffsetX = pos.x - node.x;
      this.dragOffsetY = pos.y - node.y;
      
      this.logger.debug(`Started dragging node "${node.id}" at (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}), offset=(${this.dragOffsetX.toFixed(0)}, ${this.dragOffsetY.toFixed(0)})`);
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.draggingNodeId) return;

    const pos = this.getMousePos(e);
    
    // Move node so that the same point stays under the cursor
    const newX = pos.x - this.dragOffsetX;
    const newY = pos.y - this.dragOffsetY;

    this.state.moveNode(this.draggingNodeId, newX, newY);
    this.renderer.render(this.state);
  };

  private onMouseUp = () => {
    if (this.draggingNodeId) {
      this.logger.debug(`Stopped dragging node "${this.draggingNodeId}"`);
      this.state.isDragging = false;
    }
    this.draggingNodeId = undefined;
  };
}