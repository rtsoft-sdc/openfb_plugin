import { Camera } from "./rendering/types";

/**
 * Convert screen (canvas) coordinates to world coordinates using the same
 * transformation used across renderer and input handlers.
 */
export function screenToWorld(
  canvas: HTMLCanvasElement,
  camera: Camera,
  viewZoom: number,
  screenX: number,
  screenY: number
): { x: number; y: number } {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const scale = camera.scale;

  const worldX = (screenX - centerX * (1 - viewZoom) - viewZoom * camera.offsetX) / (viewZoom * scale);
  const worldY = (screenY - centerY * (1 - viewZoom) - viewZoom * camera.offsetY) / (viewZoom * scale);

  return { x: worldX, y: worldY };
}

/**
 * Convert world coordinates to screen (canvas) coordinates.
 * Inverse of screenToWorld for convenience.
 */
export function worldToScreen(
  canvas: HTMLCanvasElement,
  camera: Camera,
  viewZoom: number,
  worldX: number,
  worldY: number
): { x: number; y: number } {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const scale = camera.scale;

  const screenX = centerX * (1 - viewZoom) + viewZoom * camera.offsetX + viewZoom * scale * worldX;
  const screenY = centerY * (1 - viewZoom) + viewZoom * camera.offsetY + viewZoom * scale * worldY;

  return { x: screenX, y: screenY };
}
