/**
 * Connection rendering module
 * Handles drawing connections/links between ports
 */

import * as C from "./constants";
import { EditorState } from "../editorState";
import { getWebviewLogger } from "../logging";
import { computeOrthogonalRoute, drawPolyline } from "./orthogonalRouter";

/**
 * Draw all connections between nodes
 * Event connections are dashed green lines
 * Data connections are solid blue lines
 *
 * @param ctx - Canvas 2D rendering context
 * @param state - Editor state containing connections and nodes
 */
export function drawConnections(
  ctx: CanvasRenderingContext2D,
  state: EditorState
): void {
  const logger = getWebviewLogger();
  
  logger.debug(`Drawing ${state.connections.length} connections`);
  
  let drawnCount = 0;
  let skippedCount = 0;
  
  for (const c of state.connections) {
    // Find source and target ports
    const fromPort = state.nodes
      .flatMap((n) => n.ports)
      .find((p) => p.id === c.fromPortId);

    const toPort = state.nodes
      .flatMap((n) => n.ports)
      .find((p) => p.id === c.toPortId);

    // Skip if ports not found (disconnected reference)
    if (!fromPort || !toPort) {
      logger.debug(`Connection ${c.id}: port not found (fromPort=${!!fromPort}, toPort=${!!toPort})`);
      skippedCount++;
      continue;
    }

    drawnCount++;

    // Determine visual style based on connection type (from diagram) or port kind (fallback)
    const isEventConnection = c.type === "event" || (c.type === undefined && fromPort.kind === "event");

    ctx.beginPath();
    ctx.strokeStyle = isEventConnection
      ? C.EVENT_CONNECTION_COLOR
      : C.DATA_CONNECTION_COLOR;
    ctx.lineWidth = isEventConnection
      ? C.EVENT_CONNECTION_WIDTH
      : C.DATA_CONNECTION_WIDTH;

    // Event connections are dashed, data connections are solid
    if (isEventConnection) {
      ctx.setLineDash(C.EVENT_CONNECTION_DASH);
    } else {
      ctx.setLineDash(C.DATA_CONNECTION_DASH);
    }

    // Build obstacle list from all nodes (excluding the two connected nodes)
    const fromNodeId = c.fromPortId.split(".")[0];
    const toNodeId = c.toPortId.split(".")[0];
    const obstacles = state.nodes
      .filter((n) => n.id !== fromNodeId && n.id !== toNodeId)
      .map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height }));

    // Draw orthogonal route from source to target, avoiding obstacles
    const waypoints = computeOrthogonalRoute(fromPort, toPort, obstacles);
    drawPolyline(ctx, waypoints, C.ROUTING_CORNER_RADIUS);
    ctx.stroke();

    // Reset line dash for next draw
    ctx.setLineDash([]);
  }
  
  logger.debug(`Connections rendered: ${drawnCount} drawn, ${skippedCount} skipped`);
}
