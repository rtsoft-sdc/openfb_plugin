/**
 * Camera module
 * Manages viewport transformations, zoom, and pan
 */

import { Camera } from "./types";

/**
 * Create a new camera with default values
 * Initial state: no zoom, no pan
 *
 * @returns New Camera object ready for use
 */
export function createCamera(): Camera {
  return {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };
}

/**
 * Apply camera transformations to canvas context
 * Translates and scales the canvas according to camera state
 *
 * @param ctx - Canvas 2D rendering context
 * @param camera - Camera state with scale and offset
 */
export function applyCamera(
  ctx: CanvasRenderingContext2D,
  camera: Camera
): void {
  ctx.translate(camera.offsetX, camera.offsetY);
  ctx.scale(camera.scale, camera.scale);
}
