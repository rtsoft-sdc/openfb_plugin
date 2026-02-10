/**
 * Connection rendering module
 * Handles drawing connections/links between ports
 */

import * as C from "./constants";
import { EditorState } from "../editorState";

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
      continue;
    }

    // Determine visual style based on port kind
    const isEventConnection = fromPort.kind === "event";

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

    // Draw line from source to target
    ctx.moveTo(fromPort.x, fromPort.y);
    ctx.lineTo(toPort.x, toPort.y);
    ctx.stroke();

    // Reset line dash for next draw
    ctx.setLineDash([]);
  }
}
