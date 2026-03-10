/**
 * Coordinate normalization utilities
 * Scales and shifts diagram coordinates so blocks have proportional spacing.
 * The scale factor adapts to the number of blocks:
 *   - Small diagrams (≤16 blocks): world ≈ 1× viewport → zoom ~100%
 *   - Large diagrams (600+ blocks): world ≈ 2-3× viewport → zoom ~50%
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
  /** Scaled width of the diagram bounding box in world pixels */
  boundsWidth: number;
  /** Scaled height of the diagram bounding box in world pixels */
  boundsHeight: number;
}

/**
 * Normalize block coordinates: scale down large XML coordinate spaces
 * and shift so the diagram starts at (padding, padding).
 *
 * The world-space multiplier adapts to block count:
 *   M = max(1.0, log2(N) / 4)
 *   - ≤16 blocks → M=1.0, fits 1× viewport, zoom ≈ 100%
 *   - 600 blocks → M≈2.3, fits ~2.3× viewport, zoom ≈ 50%
 *
 * Small diagrams stay at full zoom; large diagrams get an overview.
 *
 * @param blocks - Array of blocks with x, y, width, height
 * @returns Scaled/shifted coordinates, normalization params, and world-space bounding box
 */
export function normalizeCoordinates(
  blocks: Block[]
): NormalizeResult {
  const coords = new Map<string, NormalizedCoordinates>();
  const defaultParams: NormalizationParams = { minX: 0, minY: 0, scale: 1, offsetX: 0, offsetY: 0 };

  if (blocks.length === 0) {
    return { coords, params: defaultParams, boundsWidth: 0, boundsHeight: 0 };
  }

  // 1. Find bounding box of all blocks (including their sizes)
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
  const padding = COORDINATE_CONFIG.PADDING;

  // 2. Compute adaptive multiplier based on block count
  //    ≤11 blocks: M=1.0 (diagram fills viewport at ~100%)
  //    29 blocks: M≈1.39 (zoom ~72%)
  //    600 blocks: M≈2.64 (overview at ~45%)
  const M = Math.max(1.0, Math.log2(blocks.length) / 3.5);

  const desiredWidth = COORDINATE_CONFIG.TARGET_WIDTH * M - 2 * padding;
  const desiredHeight = COORDINATE_CONFIG.TARGET_HEIGHT * M - 2 * padding;

  const scale = Math.min(
    desiredWidth / boundsWidth,
    desiredHeight / boundsHeight,
    1.0   // Never enlarge — small diagrams stay 1:1
  );

  // 3. Scaled bounding box dimensions (world pixels)
  const scaledBoundsWidth = boundsWidth * scale;
  const scaledBoundsHeight = boundsHeight * scale;

  // 4. Transform coordinates: shift to (padding, padding) with scale
  for (const block of blocks) {
    const key = `${block.x},${block.y}`;
    coords.set(key, {
      x: (block.x - minX) * scale + padding,
      y: (block.y - minY) * scale + padding,
    });
  }

  return {
    coords,
    params: { minX, minY, scale, offsetX: padding, offsetY: padding },
    boundsWidth: scaledBoundsWidth,
    boundsHeight: scaledBoundsHeight,
  };
}