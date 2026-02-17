/**
 * Port rendering module
 * Handles port layout calculation and rendering
 */

import { EditorPort } from "../editorState";
import * as C from "./constants";

/**
 * Layout ports on a node, computing their positions
 * Separates event and data ports into zones
 *
 * @param node - Node object with ports array, will be modified with computed positions
 */
export function layoutPorts(node: any): void {
  const inputs = node.ports.filter((p: EditorPort) => p.direction === "input");
  const outputs = node.ports.filter((p: EditorPort) => p.direction === "output");

  // Split events and data into separate zones
  const eventInputs = inputs.filter((p: EditorPort) => p.kind === "event");
  const eventOutputs = outputs.filter((p: EditorPort) => p.kind === "event");
  const dataInputs = inputs.filter((p: EditorPort) => p.kind === "data");
  const dataOutputs = outputs.filter((p: EditorPort) => p.kind === "data");

  let yOffset = C.PORT_LAYOUT_START_Y;

  // Events zone - input ports on left, output ports on right
  eventInputs.forEach((p: any, i: number) => {
    p.x = node.x + C.PORT_RADIUS;
    p.y = node.y + yOffset + i * C.PORT_SPACING;
  });

  eventOutputs.forEach((p: any, i: number) => {
    p.x = node.x + node.width - C.PORT_RADIUS;
    p.y = node.y + yOffset + i * C.PORT_SPACING;
  });

  // Move to data zone
  yOffset +=
    Math.max(eventInputs.length, eventOutputs.length) * C.PORT_SPACING +
    C.PORT_ZONE_GAP;

  // Data zone - input ports on left, output ports on right
  dataInputs.forEach((p: any, i: number) => {
    p.x = node.x + C.PORT_RADIUS;
    p.y = node.y + yOffset + i * C.PORT_SPACING;
  });

  dataOutputs.forEach((p: any, i: number) => {
    p.x = node.x + node.width - C.PORT_RADIUS;
    p.y = node.y + yOffset + i * C.PORT_SPACING;
  });

  // Store zone boundaries for future visualization
  node._eventZoneY = C.PORT_LAYOUT_START_Y;
  node._eventZoneHeight =
    Math.max(eventInputs.length, eventOutputs.length) * C.PORT_SPACING + 4;
  node._dataZoneY = yOffset - C.PORT_ZONE_GAP + 2;
  node._dataZoneHeight =
    Math.max(dataInputs.length, dataOutputs.length) * C.PORT_SPACING + 4;
}

/**
 * Draw all ports for a node
 * Renders colored arrows and labels for each port
 *
 * @param ctx - Canvas 2D rendering context
 * @param node - Node with ports to render
 */
export function drawPorts(ctx: CanvasRenderingContext2D, node: any): void {
  for (const p of node.ports) {
    // Determine visual style based on port kind
    const isEvent = p.kind === "event";
    const portColor = isEvent ? C.EVENT_PORT_COLOR : C.DATA_PORT_COLOR;
    const portTypeIcon = isEvent ? "E" : "D";

    if (p.direction === "input") {
      // Input: arrow points to the right
      ctx.fillStyle = portColor;
      ctx.beginPath();
      ctx.moveTo(p.x + C.PORT_RADIUS, p.y); // right (point)
      ctx.lineTo(p.x - C.PORT_RADIUS, p.y - C.PORT_RADIUS); // top-left
      ctx.lineTo(p.x - C.PORT_RADIUS, p.y + C.PORT_RADIUS); // bottom-left
      ctx.closePath();
      ctx.fill();

      // Draw port type indicator (E or D)
      ctx.fillStyle = C.PORT_TYPE_COLOR;
      ctx.font = C.PORT_TYPE_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(portTypeIcon, p.x - C.PORT_RADIUS, p.y - 1);

      // Draw port name label to the right
      ctx.fillStyle = C.PORT_NAME_COLOR;
      ctx.font = C.PORT_NAME_FONT;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(p.name, p.x + C.PORT_RADIUS + C.PORT_LABEL_OFFSET, p.y);
    } else {
      // Output: arrow points to the right
      ctx.fillStyle = portColor;
      ctx.beginPath();
      ctx.moveTo(p.x + C.PORT_RADIUS, p.y); // right (point)
      ctx.lineTo(p.x - C.PORT_RADIUS, p.y - C.PORT_RADIUS); // top-left
      ctx.lineTo(p.x - C.PORT_RADIUS, p.y + C.PORT_RADIUS); // bottom-left
      ctx.closePath();
      ctx.fill();

      // Draw port type indicator (E or D)
      ctx.fillStyle = C.PORT_TYPE_COLOR;
      ctx.font = C.PORT_TYPE_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(portTypeIcon, p.x + C.PORT_RADIUS, p.y - 1);

      // Draw port name label to the left
      ctx.fillStyle = C.PORT_NAME_COLOR;
      ctx.font = C.PORT_NAME_FONT;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(p.name, p.x - C.PORT_RADIUS - C.PORT_LABEL_OFFSET, p.y);
    }

    // Reset text alignment
    ctx.textAlign = C.DEFAULT_TEXT_ALIGN;
  }
}
