/**
 * Camera module
 * Manages viewport transformations, zoom, and pan
 */

import * as C from "./constants";
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

/**
 * Calculate camera parameters to fit all nodes in view
 * Centers nodes on canvas with appropriate zoom level
 * Does not zoom in, only zooms out to fit
 *
 * @param camera - Camera object to update (modified in place)
 * @param nodes - Array of nodes with x, y, width, height properties
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 */
export function fitCameraToNodes(
  camera: Camera,
  nodes: Array<{ x: number; y: number; width: number; height: number }>,
  canvasWidth: number,
  canvasHeight: number
): void {
  // Handle empty diagram
  if (nodes.length === 0) {
    camera.scale = 1;
    camera.offsetX = 0;
    camera.offsetY = 0;
    return;
  }

  // Calculate bounding box of all nodes
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  const boundsWidth = maxX - minX;
  const boundsHeight = maxY - minY;

  // Calculate available space with padding
  const availableWidth = canvasWidth - 2 * C.CAMERA_FIT_PADDING;
  const availableHeight = canvasHeight - 2 * C.CAMERA_FIT_PADDING;

  // Calculate zoom level to fit all nodes
  const scaleX = availableWidth / boundsWidth;
  const scaleY = availableHeight / boundsHeight;
  
  // Apply zoom reduction factor (0.8) to avoid filling entire screen
  const fitScale = Math.min(scaleX, scaleY) * 0.8;
  camera.scale = Math.min(fitScale, C.CAMERA_MAX_ZOOM);

  // Calculate pan offset to center the diagram
  const scaledWidth = boundsWidth * camera.scale;
  const scaledHeight = boundsHeight * camera.scale;

  camera.offsetX =
    C.CAMERA_FIT_PADDING +
    (availableWidth - scaledWidth) / 2 -
    minX * camera.scale;
  camera.offsetY =
    C.CAMERA_FIT_PADDING +
    (availableHeight - scaledHeight) / 2 -
    minY * camera.scale;
}
