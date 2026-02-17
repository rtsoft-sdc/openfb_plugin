/**
 * Node rendering module
 * Handles node drawing and layout
 */

import * as C from "./constants";
import { layoutPorts, drawPorts } from "./portRenderer";

/**
 * Draw a rounded rectangle path on canvas
 * Used for node and other UI elements
 *
 * @param ctx - Canvas 2D rendering context
 * @param x - Rectangle X position
 * @param y - Rectangle Y position
 * @param w - Rectangle width
 * @param h - Rectangle height
 * @param r - Corner radius
 */
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw a single node with label, box, shadow, and ports
 *
 * @param ctx - Canvas 2D rendering context
 * @param node - Node object to render
 */
export function drawNode(ctx: CanvasRenderingContext2D, node: any): void {
  // First, layout ports to compute their positions
  layoutPorts(node);

  const x = node.x;
  const y = node.y;
  const w = node.width;
  const h = node.height;

  ctx.save();

  // Add shadow
  ctx.shadowColor = C.NODE_SHADOW_COLOR;
  ctx.shadowBlur = C.NODE_SHADOW_BLUR;
  ctx.shadowOffsetX = C.NODE_SHADOW_OFFSET_X;
  ctx.shadowOffsetY = C.NODE_SHADOW_OFFSET_Y;

  // Fill with background color
  ctx.fillStyle = C.NODE_BACKGROUND_COLOR;
  roundedRectPath(ctx, x, y, w, h, C.NODE_BORDER_RADIUS);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = C.NODE_BORDER_COLOR;
  ctx.lineWidth = C.NODE_BORDER_WIDTH;
  roundedRectPath(ctx, x, y, w, h, C.NODE_BORDER_RADIUS);
  ctx.stroke();

  // Draw SubApp border overlay (dashed)
  if ((node as any).fbKind === "SUBAPP") {
    ctx.strokeStyle = C.NODE_BORDER_COLOR;
    ctx.lineWidth = C.SUBAPP_BORDER_WIDTH;
    ctx.setLineDash(C.SUBAPP_BORDER_DASH);
    roundedRectPath(ctx, x, y, w, h, C.NODE_BORDER_RADIUS);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();

  // Draw device color border if available (2px, on top of node border)
  if ((node as any).deviceColor) {
    ctx.save();
    ctx.strokeStyle = `rgb(${(node as any).deviceColor})`;
    ctx.lineWidth = 2;
    roundedRectPath(ctx, x, y, w, h, C.NODE_BORDER_RADIUS);
    ctx.stroke();
    ctx.restore();
  }

  // Draw node label above the box, centered
  ctx.fillStyle = C.NODE_LABEL_COLOR;
  ctx.font = C.NODE_LABEL_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const label = String(node.id || "");
  const labelY = node.y - C.NODE_LABEL_PADDING;
  ctx.fillText(label, node.x + node.width / 2, labelY);

  // Reset text alignment/baseline
  ctx.textAlign = C.DEFAULT_TEXT_ALIGN;
  ctx.textBaseline = C.DEFAULT_TEXT_BASELINE;

  // Draw all ports for this node
  drawPorts(ctx, node);
}

/**
 * Draw selection highlight around a selected node
 * @param ctx - Canvas 2D rendering context
 * @param node - The selected node
 */
function drawNodeSelection(ctx: CanvasRenderingContext2D, node: any): void {
  const x = node.x;
  const y = node.y;
  const w = node.width;
  const h = node.height;
  const padding = 4; // Padding around node

  ctx.save();

  // Draw glowing selection frame
  ctx.strokeStyle = "#FFD700"; // Gold color for selection
  ctx.lineWidth = 3;

  // Draw rounded rectangle around node with padding
  roundedRectPath(ctx, x - padding, y - padding, w + padding * 2, h + padding * 2, C.NODE_BORDER_RADIUS + 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw all nodes in the diagram
 * Handles empty diagram case and iterates through all nodes
 *
 * @param ctx - Canvas 2D rendering context
 * @param nodes - Array of nodes to render
 * @param selectedNodeId - ID of selected node, if any
 */
export function drawNodes(
  ctx: CanvasRenderingContext2D,
  nodes: Array<any>,
  selectedNodeId?: string
): void {
  if (nodes.length === 0) {
    // Show message for empty diagram
    ctx.restore();
    ctx.fillStyle = C.EMPTY_NODES_COLOR;
    ctx.font = C.EMPTY_NODES_FONT;
    ctx.fillText(C.EMPTY_NODES_MESSAGE, C.EMPTY_NODES_X, C.EMPTY_NODES_Y);
    ctx.save();
    return;
  }

  // Draw each node
  for (const node of nodes) {
    drawNode(ctx, node);
  }

  // Draw selection highlight if a node is selected
  if (selectedNodeId) {
    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (selectedNode) {
      drawNodeSelection(ctx, selectedNode);
    }
  }
}
