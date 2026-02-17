import { EditorState } from "../editorState";
import { CanvasRenderer } from "../canvasRenderer";
import { ZOOM_CONFIG, PAN_CONFIG } from "../constants";
import { screenToWorld, worldToScreen } from "../transformUtils";

/**
 * Manages camera viewport transformations: panning and zooming
 * Single Responsibility: Viewport/Camera manipulation
 */
export class ViewportController {
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private panStartOffsetX = 0;
  private panStartOffsetY = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private state: EditorState,
    private renderer: CanvasRenderer
  ) {}

  /**
   * Check if panning is active
   */
  isPanningActive(): boolean {
    return this.isPanning;
  }

  /**
   * Start panning operation
   */
  startPanning(e: MouseEvent): void {
    this.isPanning = true;
    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
    this.panStartOffsetX = this.renderer.camera.offsetX;
    this.panStartOffsetY = this.renderer.camera.offsetY;
  }

  /**
   * Update pan position based on mouse movement
   */
  updatePan(e: MouseEvent): void {
    if (!this.isPanning) return;

    const deltaX = e.clientX - this.panStartX;
    const deltaY = e.clientY - this.panStartY;

    this.renderer.camera.offsetX = this.panStartOffsetX + deltaX;
    this.renderer.camera.offsetY = this.panStartOffsetY + deltaY;

    this.renderer.render(this.state);
  }

  /**
   * End panning operation
   */
  stopPanning(): void {
    this.isPanning = false;
  }

  /**
   * Handle zooming via Ctrl+Wheel
   */
  handleZoom(e: WheelEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseScreenX = e.clientX - rect.left;
    const mouseScreenY = e.clientY - rect.top;

    const camera = this.renderer.camera;
    const oldZoom = this.state.view.zoom;

    // Get "world" coordinates at current zoom before change
    const worldMouse = screenToWorld(this.canvas, camera, oldZoom, mouseScreenX, mouseScreenY);

    // Calculate zoom delta
    const zoomFactor = e.deltaY > 0 ? ZOOM_CONFIG.OUT_FACTOR : ZOOM_CONFIG.IN_FACTOR;
    const newZoom = oldZoom * zoomFactor;

    // Update zoom with clamping
    this.state.updateZoom(newZoom);

    // Recalculate camera offset so world position stays under cursor
    const screenAtNewZoom = worldToScreen(this.canvas, camera, this.state.view.zoom, worldMouse.x, worldMouse.y);
    
    camera.offsetX -= mouseScreenX - screenAtNewZoom.x;
    camera.offsetY -= mouseScreenY - screenAtNewZoom.y;

    this.renderer.render(this.state);
  }

  /**
   * Handle panning via scroll wheel (without Ctrl)
   * Vertical by default, horizontal with Shift modifier
   */
  handleScrollPan(e: WheelEvent): void {
    const panDirection = e.shiftKey ? 'offsetX' : 'offsetY';
    const panDelta = e.deltaY > 0 ? PAN_CONFIG.WHEEL_SPEED : -PAN_CONFIG.WHEEL_SPEED;
    this.renderer.camera[panDirection as keyof typeof this.renderer.camera] -= panDelta;

    this.renderer.render(this.state);
  }
}
