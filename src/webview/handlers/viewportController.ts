import { EditorState } from "../editorState";
import { CanvasRenderer } from "../rendering/canvasRenderer";
import { ZOOM_CONFIG } from "../constants";

/**
 * Manages camera viewport transformations: panning and zooming
 * Single Responsibility: Viewport/Camera manipulation
 */
export class ViewportController {
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;

  constructor(
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
  }

  /**
   * Update pan position based on mouse movement
   */
  updatePan(e: MouseEvent): void {
    if (!this.isPanning) return;

    const deltaX = e.clientX - this.panStartX;
    const deltaY = e.clientY - this.panStartY;

    this.state.dispatch({ type: "PAN", dx: deltaX, dy: deltaY });
    this.renderer.camera.offsetX = this.state.view.offsetX;
    this.renderer.camera.offsetY = this.state.view.offsetY;

    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
  }

  /**
   * End panning operation
   */
  stopPanning(): void {
    this.isPanning = false;
  }

  /**
   * Handle zoom with wheel event
   * Zooms in/out centered on the mouse position
   * 
   * @param delta - Wheel delta (negative = zoom in, positive = zoom out)
   * @param screenX - Mouse X position in screen coordinates (relative to canvas)
   * @param screenY - Mouse Y position in screen coordinates (relative to canvas)
   */
  handleZoom(delta: number, screenX: number, screenY: number): void {
    // Calculate zoom factor based on wheel delta
    // Negative delta = scroll up = zoom in (factor > 1)
    // Positive delta = scroll down = zoom out (factor < 1)
    const zoomFactor = delta > 0 
      ? 1 - ZOOM_CONFIG.STEP 
      : 1 + ZOOM_CONFIG.STEP;

    // Dispatch ZOOM action
    // Reducer will handle clamping and offset adjustment
    this.state.dispatch({
      type: "ZOOM",
      factor: zoomFactor,
      centerX: screenX,
      centerY: screenY,
      canvasCenterX: this.renderer.canvas.width / 2,
      canvasCenterY: this.renderer.canvas.height / 2
    });

    // Sync camera with updated state so next pan doesn't jump
    this.renderer.camera.offsetX = this.state.view.offsetX;
    this.renderer.camera.offsetY = this.state.view.offsetY;
  }
}
