/**
 * Grid rendering module
 * Handles drawing background grid and clearing canvas
 */

import * as C from "./constants";

/**
 * Draw grid background on canvas
 * Creates a dashed grid pattern at regular intervals
 *
 * @param ctx - Canvas 2D rendering context
 * @param canvasWidth - Width of the canvas in pixels
 * @param canvasHeight - Height of the canvas in pixels
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.strokeStyle = C.GRID_COLOR;
  ctx.lineWidth = C.GRID_LINE_WIDTH;
  ctx.setLineDash(C.GRID_DASH);

  // Draw vertical lines
  for (let x = 0; x < canvasWidth; x += C.GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = 0; y < canvasHeight; y += C.GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  // Reset to solid lines for subsequent drawing
  ctx.setLineDash([]);
}

/**
 * Clear entire canvas to transparent background
 * Removes all previously drawn content
 *
 * @param ctx - Canvas 2D rendering context
 * @param canvasWidth - Width of the canvas in pixels
 * @param canvasHeight - Height of the canvas in pixels
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}
