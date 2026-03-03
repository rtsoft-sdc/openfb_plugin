/**
 * Standalone canvas renderer for the New FB wizard preview.
 *
 * Reuses the existing node/port rendering primitives but operates
 * independently of the main EditorState / CanvasRenderer.
 */

import { clearCanvas, drawGrid } from "../../rendering/grid";
import { drawNode } from "../../rendering/nodeRenderer";
import { layoutPorts } from "../../rendering/portRenderer";
import { calculateNodeDimensions } from "../../layout/nodeLayout";
import { FBKind } from "../../../domain/FBKind";
import type { NewFbDialogDraft } from "./newFbModel";
import { buildEditorPortsFromDraft } from "./newFbModel";
import type { EventDeclaration } from "../../../shared/fbtypes";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a preview of the FB block being created in the wizard.
 */
export function renderFbPreview(canvas: HTMLCanvasElement, draft: NewFbDialogDraft): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Ensure canvas internal size matches its CSS size (high-DPI aware)
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  const w = rect.width;
  const h = rect.height;

  // Clear & draw grid background
  clearCanvas(ctx, w, h);
  drawGrid(ctx, w, h);

  // Build port list from the draft interface
  const ports = buildEditorPortsFromDraft(draft);

  // Compute node dimensions
  const dims = ports.length > 0
    ? calculateNodeDimensions(ports)
    : { width: 140, height: 80 };

  // Centre the node on the canvas with some vertical offset for the label
  const labelSpace = 20;
  const nodeX = Math.round((w - dims.width) / 2);
  const nodeY = Math.round((h - dims.height) / 2 + labelSpace / 2);

  const node: any = {
    id: draft.name || "NewFB",
    type: draft.name || "NewFB",
    x: nodeX,
    y: nodeY,
    width: dims.width,
    height: dims.height,
    ports,
    fbKind: draft.category === FBKind.SUBAPP ? "SUBAPP" : undefined,
  };

  // Compute port positions for WITH routing before drawing the node.
  layoutPorts(node);
  drawWithConnections(ctx, node, draft);
  drawNode(ctx, node, undefined);
}

// ---------------------------------------------------------------------------
// With-connections rendering (event -> var)
// ---------------------------------------------------------------------------

function drawWithConnections(
  ctx: CanvasRenderingContext2D,
  node: any,
  draft: NewFbDialogDraft,
): void {
  if (!draft.interfaceList || draft.category === FBKind.SUBAPP) {
    return;
  }

  const inputEventPorts = new Map<string, any>();
  const outputEventPorts = new Map<string, any>();
  const inputVarPorts = new Map<string, any>();
  const outputVarPorts = new Map<string, any>();

  for (const p of node.ports || []) {
    if (p.kind === "event" && p.direction === "input") inputEventPorts.set(p.name, p);
    if (p.kind === "event" && p.direction === "output") outputEventPorts.set(p.name, p);
    if (p.kind === "data" && p.direction === "input") inputVarPorts.set(p.name, p);
    if (p.kind === "data" && p.direction === "output") outputVarPorts.set(p.name, p);
  }

  const iface = draft.interfaceList;
  drawEventWithLines(ctx, node, iface.eventInputs, inputEventPorts, inputVarPorts, "input");
  drawEventWithLines(ctx, node, iface.eventOutputs, outputEventPorts, outputVarPorts, "output");
}

function drawEventWithLines(
  ctx: CanvasRenderingContext2D,
  node: any,
  events: EventDeclaration[] | undefined,
  eventPorts: Map<string, any>,
  varPorts: Map<string, any>,
  direction: "input" | "output",
): void {
  if (!events || events.length === 0) return;

  ctx.save();
  ctx.strokeStyle = "rgba(60, 60, 60, 0.55)";
  ctx.lineWidth = 1;

  const gutter = 16;
  const channelSpacing = 6;
  const channelX = direction === "input"
    ? node.x - gutter
    : node.x + node.width + gutter;
  const lead = direction === "input" ? -6 : 6;

  events.forEach((ev, evIdx) => {
    if (!ev.with || ev.with.length === 0) return;
    const evPort = eventPorts.get(ev.name);
    if (!evPort) return;

    const startX = evPort.x + lead;
    const startY = evPort.y;
    const laneX = channelX + (direction === "input" ? -1 : 1) * evIdx * channelSpacing;

    for (const varName of ev.with ?? []) {
      const vPort = varPorts.get(varName);
      if (!vPort) continue;

      const endX = vPort.x + lead;
      const endY = vPort.y;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(laneX, startY);
      ctx.lineTo(laneX, endY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  });

  ctx.restore();
}
