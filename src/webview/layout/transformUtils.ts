import { Camera } from "../rendering/types";

/**
 * Convert screen (canvas) coordinates to world coordinates using the same
 * transformation used across renderer and input handlers.
 *
 * @param dpr - Device pixel ratio (default 1). When the canvas buffer is
 *              sized at cssWidth*dpr, pass this so the center is computed
 *              from logical (CSS) dimensions.
 */
export function screenToWorld(
  canvas: HTMLCanvasElement,
  camera: Camera,
  viewZoom: number,
  screenX: number,
  screenY: number,
  dpr = 1,
): { x: number; y: number } {
  const centerX = canvas.width / dpr / 2;
  const centerY = canvas.height / dpr / 2;
  const scale = camera.scale;

  const worldX = (screenX - centerX * (1 - viewZoom) - viewZoom * camera.offsetX) / (viewZoom * scale);
  const worldY = (screenY - centerY * (1 - viewZoom) - viewZoom * camera.offsetY) / (viewZoom * scale);

  return { x: worldX, y: worldY };
}
