/**
 * Geometry helper functions for hit-testing and distance calculations.
 */

/**
 * Compute the minimum distance from point (px, py) to the line segment (ax, ay)-(bx, by).
 */
export function pointToSegmentDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    // Degenerate segment (single point)
    return Math.hypot(px - ax, py - ay);
  }
  // Parameter t of the closest point on the segment, clamped to [0, 1]
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = ax + t * dx;
  const closestY = ay + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}
