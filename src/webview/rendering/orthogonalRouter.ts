/**
 * Orthogonal (Manhattan) connection router
 */

import { Waypoint } from "./types";
import { ROUTING_STUB_LENGTH, ROUTING_PADDING } from "./constants";

/**
 * Minimal port info needed for routing
 */
export interface RoutablePort {
  x: number;
  y: number;
}

/**
 * Axis-aligned rectangle used as an obstacle for routing
 */
export interface ObstacleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a vertical segment (constant X, from minY to maxY)
 * intersects an obstacle rectangle (with padding).
 */
function verticalSegmentHitsRect(
  segX: number,
  segMinY: number,
  segMaxY: number,
  rect: ObstacleRect,
  pad: number
): boolean {
  const rLeft = rect.x - pad;
  const rRight = rect.x + rect.width + pad;
  const rTop = rect.y - pad;
  const rBottom = rect.y + rect.height + pad;

  // X must be inside rect's horizontal range
  if (segX < rLeft || segX > rRight) return false;
  // Y ranges must overlap
  if (segMaxY < rTop || segMinY > rBottom) return false;
  return true;
}

/**
 * Check whether a horizontal segment (constant Y, from minX to maxX)
 * intersects an obstacle rectangle (with padding).
 */
function horizontalSegmentHitsRect(
  segY: number,
  segMinX: number,
  segMaxX: number,
  rect: ObstacleRect,
  pad: number
): boolean {
  const rLeft = rect.x - pad;
  const rRight = rect.x + rect.width + pad;
  const rTop = rect.y - pad;
  const rBottom = rect.y + rect.height + pad;

  if (segY < rTop || segY > rBottom) return false;
  if (segMaxX < rLeft || segMinX > rRight) return false;
  return true;
}

/**
 * Find an X position for the vertical channel that doesn't collide with any
 * obstacle in the given Y range. Starts from `idealX` and shifts outward.
 */
function findClearVerticalX(
  idealX: number,
  minY: number,
  maxY: number,
  obstacles: ObstacleRect[],
  pad: number
): number {
  const yLo = Math.min(minY, maxY);
  const yHi = Math.max(minY, maxY);

  // If idealX is fine, use it
  if (!obstacles.some((r) => verticalSegmentHitsRect(idealX, yLo, yHi, r, pad))) {
    return idealX;
  }

  // Try shifting right, then left, in increasing increments
  const step = pad + 5;
  for (let offset = step; offset < 2000; offset += step) {
    const rightX = idealX + offset;
    if (!obstacles.some((r) => verticalSegmentHitsRect(rightX, yLo, yHi, r, pad))) {
      return rightX;
    }
    const leftX = idealX - offset;
    if (!obstacles.some((r) => verticalSegmentHitsRect(leftX, yLo, yHi, r, pad))) {
      return leftX;
    }
  }

  // Fallback — shouldn't happen in practice
  return idealX;
}

/**
 * Find a Y position for a horizontal detour segment that doesn't collide
 * with any obstacle in the given X range. Starts from `idealY` and shifts.
 */
function findClearHorizontalY(
  idealY: number,
  minX: number,
  maxX: number,
  obstacles: ObstacleRect[],
  pad: number
): number {
  const xLo = Math.min(minX, maxX);
  const xHi = Math.max(minX, maxX);

  if (!obstacles.some((r) => horizontalSegmentHitsRect(idealY, xLo, xHi, r, pad))) {
    return idealY;
  }

  const step = pad + 5;
  for (let offset = step; offset < 2000; offset += step) {
    const belowY = idealY + offset;
    if (!obstacles.some((r) => horizontalSegmentHitsRect(belowY, xLo, xHi, r, pad))) {
      return belowY;
    }
    const aboveY = idealY - offset;
    if (!obstacles.some((r) => horizontalSegmentHitsRect(aboveY, xLo, xHi, r, pad))) {
      return aboveY;
    }
  }

  return idealY;
}

// ---------------------------------------------------------------------------
// Main routing function
// ---------------------------------------------------------------------------

/**
 * Compute an orthogonal (right-angle) route between two ports,
 * avoiding obstacle rectangles (node bounding boxes).
 *
 * @param from      - Source port (output, exits to the right)
 * @param to        - Target port (input, enters from the left)
 * @param obstacles - Array of node bounding boxes to avoid
 * @returns Array of waypoints forming an H/V polyline
 */
export function computeOrthogonalRoute(
  from: RoutablePort,
  to: RoutablePort,
  obstacles: ObstacleRect[] = []
): Waypoint[] {
  const stub = ROUTING_STUB_LENGTH;
  const pad = ROUTING_PADDING;

  const fromStubX = from.x + stub;
  const toStubX = to.x - stub;

  // --- Same Y: straight horizontal line ---
  if (from.y === to.y) {
    return [
      { x: from.x, y: from.y },
      { x: to.x, y: to.y },
    ];
  }

  // --- Normal case: enough horizontal space for a mid-channel ---
  if (fromStubX < toStubX) {
    const idealMidX = (fromStubX + toStubX) / 2;
    const midX = findClearVerticalX(idealMidX, from.y, to.y, obstacles, pad);
    return [
      { x: from.x, y: from.y },
      { x: midX, y: from.y },
      { x: midX, y: to.y },
      { x: to.x, y: to.y },
    ];
  }

  // --- Reverse / tight case ---
  // Route: right stub → vertical detour → horizontal pass → vertical align → left stub
  const detourX = from.x + stub;
  const entryX = to.x - stub;

  // Ideal detour Y is midpoint; find clear horizontal channel
  const idealDetourY = (from.y + to.y) / 2;
  const detourY = findClearHorizontalY(
    idealDetourY,
    Math.min(detourX, entryX),
    Math.max(detourX, entryX),
    obstacles,
    pad
  );

  // Also make sure vertical segments are clear
  const clearDetourX = findClearVerticalX(detourX, from.y, detourY, obstacles, pad);
  const clearEntryX = findClearVerticalX(entryX, detourY, to.y, obstacles, pad);

  return [
    { x: from.x, y: from.y },
    { x: clearDetourX, y: from.y },
    { x: clearDetourX, y: detourY },
    { x: clearEntryX, y: detourY },
    { x: clearEntryX, y: to.y },
    { x: to.x, y: to.y },
  ];
}

/**
 * Draw a polyline through waypoints on a canvas context.
 * Optionally rounds corners with the given radius via arcTo.
 *
 * @param ctx     - Canvas 2D rendering context (path must already be begun)
 * @param points  - Ordered waypoints
 * @param radius  - Corner rounding radius (0 = sharp corners)
 */
export function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: Waypoint[],
  radius: number
): void {
  if (points.length < 2) return;

  ctx.moveTo(points[0].x, points[0].y);

  if (radius <= 0 || points.length === 2) {
    // Sharp corners or straight line
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    return;
  }

  // Rounded corners: for each interior point use arcTo
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Clamp radius so it doesn't exceed half the segment length
    const segALen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const segBLen = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(radius, segALen / 2, segBLen / 2);

    ctx.arcTo(curr.x, curr.y, next.x, next.y, r);
  }

  // Final point
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}
