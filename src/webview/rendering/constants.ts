import { CANVAS_COLORS } from "../../shared/colorScheme";

/**
 * Canvas rendering constants
 * All magic numbers, colors, and sizes are defined here for easy configuration
 */

// ============================================================================
// NODE RENDERING
// ============================================================================

/** Radius for rounded corners on node rectangles */
export const NODE_BORDER_RADIUS = 8;

/** Node background fill color */
export const NODE_BACKGROUND_COLOR = CANVAS_COLORS.NODE_BACKGROUND_COLOR;

/** Node border stroke color */
export const NODE_BORDER_COLOR = CANVAS_COLORS.NODE_BORDER_COLOR;

/** Node border width in pixels */
export const NODE_BORDER_WIDTH = 1;

/** SubApp border width in pixels */
export const SUBAPP_BORDER_WIDTH = 2;

/** SubApp border dash pattern [dash, gap] */
export const SUBAPP_BORDER_DASH = [4, 3];

/** Node shadow color (semi-transparent black) */
export const NODE_SHADOW_COLOR = CANVAS_COLORS.NODE_SHADOW_COLOR;

/** Node shadow blur radius in pixels */
export const NODE_SHADOW_BLUR = 3;

/** Node shadow X offset in pixels */
export const NODE_SHADOW_OFFSET_X = 2;

/** Node shadow Y offset in pixels */
export const NODE_SHADOW_OFFSET_Y = 2;

/** Node label font style */
export const NODE_LABEL_FONT = "bold 15px monospace";

/** Node label text color */
export const NODE_LABEL_COLOR = CANVAS_COLORS.NODE_LABEL_COLOR;

/** Padding above node for label placement */
export const NODE_LABEL_PADDING = 6;

// ============================================================================
// PORT RENDERING
// ============================================================================

/** Port indicator circle radius in pixels */
export const PORT_RADIUS = 4;

/** Vertical spacing between ports in pixels */
export const PORT_SPACING = 18;

/** Starting Y offset for port layout */
export const PORT_LAYOUT_START_Y = 8;

/** Gap between event and data port zones */
export const PORT_ZONE_GAP = 8;

/** Event port color (bright green) */
export const EVENT_PORT_COLOR = CANVAS_COLORS.EVENT_PORT_COLOR;

/** Data port color (bright blue) */
export const DATA_PORT_COLOR = CANVAS_COLORS.DATA_PORT_COLOR;

/** Port type indicator (E/D label) font */
export const PORT_TYPE_FONT = "bold 9px monospace";

/** Port type indicator text color */
export const PORT_TYPE_COLOR = CANVAS_COLORS.PORT_TYPE_COLOR;

/** Port name label font */
export const PORT_NAME_FONT = "11px monospace";

/** Port value label font (lighter, smaller) */
export const PORT_VALUE_FONT = "10px monospace";

/** Port default value label font (gray italic) */
export const PORT_DEFAULT_VALUE_FONT = "italic 10px monospace";

/** Port name label text color */
export const PORT_NAME_COLOR = CANVAS_COLORS.PORT_NAME_COLOR;

/** Port value label text color */
export const PORT_VALUE_COLOR = CANVAS_COLORS.PORT_VALUE_COLOR;

/** Port default value label text color */
export const PORT_DEFAULT_VALUE_COLOR = CANVAS_COLORS.PORT_DEFAULT_VALUE_COLOR;

/** Padding from port circle to name label */
export const PORT_LABEL_OFFSET = 8;

/** Padding from port circle to value label */
export const PORT_VALUE_OFFSET = 5;

// --- Port hover ---

/** Hit-test radius for port hover/click detection (px, larger than visual) */
export const PORT_HIT_RADIUS = 10;

/** Port arrow scale factor when hovered */
export const PORT_HOVER_SCALE = 1.6;

/** Port name font when hovered (bold) */
export const PORT_HOVER_NAME_FONT = "bold 11px monospace";

// ============================================================================
// CONNECTION RENDERING
// ============================================================================

/** Event connection line color (matches event ports) */
export const EVENT_CONNECTION_COLOR = CANVAS_COLORS.EVENT_CONNECTION_COLOR;

/** Event connection line width in pixels */
export const EVENT_CONNECTION_WIDTH = 2;

/** Event connection dash pattern [dash, gap] */
export const EVENT_CONNECTION_DASH = [5, 3];

/** Data connection line color (matches data ports) */
export const DATA_CONNECTION_COLOR = CANVAS_COLORS.DATA_CONNECTION_COLOR;

/** Data connection line width in pixels */
export const DATA_CONNECTION_WIDTH = 2.5;

/** Data connection is solid (no dash) */
export const DATA_CONNECTION_DASH: number[] = [];

// --- Orthogonal routing ---

/** Horizontal stub length from port before first bend (px) */
export const ROUTING_STUB_LENGTH = 20;

/** Padding around node bounding boxes for obstacle avoidance (px) */
export const ROUTING_PADDING = 15;

/** Radius for rounded corners at bends (0 = sharp corners) */
export const ROUTING_CORNER_RADIUS = 4;

// ============================================================================
// GRID RENDERING
// ============================================================================

/** Grid cell size in pixels */
export const GRID_SIZE = 20;

/** Grid line stroke color */
export const GRID_COLOR = CANVAS_COLORS.GRID_COLOR;

/** Grid line width in pixels */
export const GRID_LINE_WIDTH = 0.4;

/** Grid line dash pattern [dash, gap] */
export const GRID_DASH = [3, 3];

// ============================================================================
// LEGEND AND STATS
// ============================================================================

/** Legend box background color (semi-transparent white) */
export const LEGEND_BACKGROUND_COLOR = CANVAS_COLORS.LEGEND_BACKGROUND_COLOR;

/** Legend box border color */
export const LEGEND_BORDER_COLOR = CANVAS_COLORS.LEGEND_BORDER_COLOR;

/** Legend box border width in pixels */
export const LEGEND_BORDER_WIDTH = 1;

/** Legend title text font */
export const LEGEND_TITLE_FONT = "bold 12px monospace";

/** Legend text color */
export const LEGEND_TEXT_COLOR = CANVAS_COLORS.LEGEND_TEXT_COLOR;

/** Legend item font */
export const LEGEND_ITEM_FONT = "10px monospace";

/** Maximum width of legend box in pixels */
export const LEGEND_MAX_WIDTH = 120;

/** Padding inside legend box */
export const LEGEND_PADDING = 8;

/** Line height for legend items */
export const LEGEND_LINE_HEIGHT = 10;

/** Legend title height in pixels */
export const LEGEND_TITLE_HEIGHT = 22;

/** Number of content lines in legend */
export const LEGEND_CONTENT_LINES = 4;

/** Padding for stats text */
export const STATS_PADDING = 10;

/** Stats text font */
export const STATS_FONT = "12px monospace";

/** Stats text color */
export const STATS_TEXT_COLOR = CANVAS_COLORS.STATS_TEXT_COLOR;

/** Line height for stats text */
export const STATS_LINE_HEIGHT = 16;

// ============================================================================
// TEXT CANVAS RENDERING
// ============================================================================

/** Default text alignment (for reset operations) */
export const DEFAULT_TEXT_ALIGN = "left";

/** Default text baseline (for reset operations) */
export const DEFAULT_TEXT_BASELINE = "alphabetic";

/** Empty nodes message font */
export const EMPTY_NODES_FONT = "14px monospace";

/** Empty nodes message color */
export const EMPTY_NODES_COLOR = CANVAS_COLORS.EMPTY_NODES_COLOR;

/** Selection outline stroke color */
export const SELECTION_STROKE_COLOR = CANVAS_COLORS.SELECTION_STROKE_COLOR;

/** Empty nodes message X position */
export const EMPTY_NODES_X = 20;

/** Empty nodes message Y position */
export const EMPTY_NODES_Y = 30;

// ============================================================================
// LEGEND ITEM LABELS (localized via i18n)
// ============================================================================
// Legend labels are now rendered dynamically via tr() in legendRenderer.ts
