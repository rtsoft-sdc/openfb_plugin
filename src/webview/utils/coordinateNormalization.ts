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
 * Normalize coordinates of blocks to fit within target dimensions
 * Preserves aspect ratio and centers the diagram
 * 
 * @param blocks - Array of blocks with x, y, width, height
 * @returns Map of original coordinates to normalized coordinates
 */
export function normalizeCoordinates(
  blocks: Block[]
): Map<string, NormalizedCoordinates> {
  const result = new Map<string, NormalizedCoordinates>();
  
  if (blocks.length === 0) {
    return result;
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
    
    result.set(key, { x: normalizedX, y: normalizedY });
  }

  return result;
}
