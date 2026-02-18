/**
 * Legend and stats rendering module
 * Handles drawing overlay UI with statistics and legend
 */

import * as C from "./constants";
import { EditorState } from "../editorState";
import { StatsLegendOptions } from "./types";

/**
 * Draw stats and legend on canvas overlay
 * Stats show node count and camera position
 * Legend explains the color scheme and line styles
 *
 * @param ctx - Canvas 2D rendering context
 * @param state - Editor state with nodes data
 * @param canvas - Canvas element for dimensions
 * @param options - Camera state for display
 */
export function drawStatsAndLegend(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  canvas: HTMLCanvasElement,
  options: StatsLegendOptions
): void {
  // =========================================================================
  // STATS LINE - top left
  // =========================================================================

  const statsText = `Узлы: ${state.nodes.length} | Масштаб: ${(options.scale * 100).toFixed(0)}%`;
  ctx.fillStyle = C.STATS_TEXT_COLOR;
  ctx.font = C.STATS_FONT;
  ctx.fillText(
    statsText,
    C.STATS_PADDING,
    C.STATS_PADDING + C.STATS_LINE_HEIGHT
  );

  // =========================================================================
  // LEGEND BOX - top right
  // =========================================================================

  const legendX = canvas.width - C.LEGEND_MAX_WIDTH - C.STATS_PADDING;
  const legendY = C.STATS_PADDING;
  const legendHeight =
    C.LEGEND_TITLE_HEIGHT +
    C.LEGEND_CONTENT_LINES * C.LEGEND_LINE_HEIGHT +
    2 * C.LEGEND_PADDING;

  // Draw background
  ctx.fillStyle = C.LEGEND_BACKGROUND_COLOR;
  ctx.fillRect(legendX, legendY, C.LEGEND_MAX_WIDTH, legendHeight);

  // Draw border
  ctx.strokeStyle = C.LEGEND_BORDER_COLOR;
  ctx.lineWidth = C.LEGEND_BORDER_WIDTH;
  ctx.strokeRect(legendX, legendY, C.LEGEND_MAX_WIDTH, legendHeight);

  // Draw title (centered)
  ctx.fillStyle = C.LEGEND_TEXT_COLOR;
  ctx.font = C.LEGEND_TITLE_FONT;
  ctx.textAlign = "center";
  ctx.fillText(
    C.LEGEND_TITLE,
    legendX + C.LEGEND_MAX_WIDTH / 2,
    legendY + C.LEGEND_PADDING + 12
  );
  ctx.textAlign = C.DEFAULT_TEXT_ALIGN;

  let yPos = legendY + C.LEGEND_PADDING + C.LEGEND_TITLE_HEIGHT + 2;

  // =========================================================================
  // LEGEND ITEM: Event Ports
  // =========================================================================

  ctx.font = C.LEGEND_ITEM_FONT;
  ctx.fillStyle = C.EVENT_PORT_COLOR;
  ctx.beginPath();
  ctx.arc(
    legendX + C.LEGEND_PADDING + 6,
    yPos - 1,
    3,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.fillStyle = C.LEGEND_TEXT_COLOR;
  ctx.fillText(
    C.LEGEND_EVENT_PORT,
    legendX + C.LEGEND_PADDING + 16,
    yPos
  );
  yPos += C.LEGEND_LINE_HEIGHT;

  // =========================================================================
  // LEGEND ITEM: Data Ports
  // =========================================================================

  ctx.fillStyle = C.DATA_PORT_COLOR;
  ctx.beginPath();
  ctx.arc(
    legendX + C.LEGEND_PADDING + 6,
    yPos - 1,
    3,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.fillStyle = C.LEGEND_TEXT_COLOR;
  ctx.font = C.LEGEND_ITEM_FONT;
  ctx.fillText(C.LEGEND_DATA_PORT, legendX + C.LEGEND_PADDING + 16, yPos);
  yPos += C.LEGEND_LINE_HEIGHT;

  // =========================================================================
  // LEGEND ITEM: Event Connections (dashed line)
  // =========================================================================

  ctx.strokeStyle = C.EVENT_PORT_COLOR;
  ctx.setLineDash(C.EVENT_CONNECTION_DASH);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(legendX + C.LEGEND_PADDING, yPos - 3);
  ctx.lineTo(legendX + C.LEGEND_PADDING + 12, yPos - 3);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = C.LEGEND_TEXT_COLOR;
  ctx.font = C.LEGEND_ITEM_FONT;
  ctx.fillText(
    C.LEGEND_EVENT_CONNECTION,
    legendX + C.LEGEND_PADDING + 16,
    yPos
  );
  yPos += C.LEGEND_LINE_HEIGHT;

  // =========================================================================
  // LEGEND ITEM: Data Connections (solid line)
  // =========================================================================

  ctx.strokeStyle = C.DATA_PORT_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(legendX + C.LEGEND_PADDING, yPos - 3);
  ctx.lineTo(legendX + C.LEGEND_PADDING + 12, yPos - 3);
  ctx.stroke();
  ctx.fillStyle = C.LEGEND_TEXT_COLOR;
  ctx.font = C.LEGEND_ITEM_FONT;
  ctx.fillText(
    C.LEGEND_DATA_CONNECTION,
    legendX + C.LEGEND_PADDING + 16,
    yPos
  );
}
