/**
 * Coordinate normalization utilities
 * Scales diagram coordinates to fit target dimensions
 */

import { COORDINATE_CONFIG } from "../constants";

export interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedCoordinates {
  x: number;
  y: number;
}

/**
 * Parameters used during normalization — needed for reverse transform on save.
 */
export interface NormalizationParams {
  minX: number;
  minY: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface NormalizeResult {
  coords: Map<string, NormalizedCoordinates>;
  params: NormalizationParams;
}

/**
 * Normalize coordinates of blocks to fit within target dimensions
 * Preserves aspect ratio and centers the diagram
 * 
 * @param blocks - Array of blocks with x, y, width, height
 * @returns Map of original coordinates to normalized coordinates
 */
export function normalizeCoordinates(
  blocks: Block[]
): NormalizeResult {
  const coords = new Map<string, NormalizedCoordinates>();
  const defaultParams: NormalizationParams = { minX: 0, minY: 0, scale: 1, offsetX: 0, offsetY: 0 };
  
  if (blocks.length === 0) {
    return { coords, params: defaultParams };
  }

  // 1. Find bounding box of all blocks
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const block of blocks) {
    minX = Math.min(minX, block.x);
    minY = Math.min(minY, block.y);
    maxX = Math.max(maxX, block.x + block.width);
    maxY = Math.max(maxY, block.y + block.height);
  }

  const boundsWidth = maxX - minX;
  const boundsHeight = maxY - minY;

  // 2. Calculate scale to fit in target dimensions with padding
  const targetWidth = COORDINATE_CONFIG.TARGET_WIDTH - 2 * COORDINATE_CONFIG.PADDING;
  const targetHeight = COORDINATE_CONFIG.TARGET_HEIGHT - 2 * COORDINATE_CONFIG.PADDING;

  const scaleX = targetWidth / boundsWidth;
  const scaleY = targetHeight / boundsHeight;
  
  // Use minimum scale to preserve aspect ratio and fit both dimensions
  const scale = Math.min(scaleX, scaleY);

  // 3. Calculate scaled diagram dimensions
  const scaledWidth = boundsWidth * scale;
  const scaledHeight = boundsHeight * scale;

  // 4. Calculate offset to center the diagram in target space
  const offsetX = COORDINATE_CONFIG.PADDING + (targetWidth - scaledWidth) / 2;
  const offsetY = COORDINATE_CONFIG.PADDING + (targetHeight - scaledHeight) / 2;

  // 5. Transform all block coordinates
  for (const block of blocks) {
    const key = `${block.x},${block.y}`;
    const normalizedX = (block.x - minX) * scale + offsetX;
    const normalizedY = (block.y - minY) * scale + offsetY;
    
    coords.set(key, { x: normalizedX, y: normalizedY });
  }

  return { coords, params: { minX, minY, scale, offsetX, offsetY } };
}

/**
 * Reverse-transform normalized screen coordinates back to original XML scale.
 */
export function denormalizeCoordinates(
  x: number,
  y: number,
  params: NormalizationParams,
): { x: number; y: number } {
  return {
    x: Math.round((x - params.offsetX) / params.scale + params.minX),
    y: Math.round((y - params.offsetY) / params.scale + params.minY),
  };
}
