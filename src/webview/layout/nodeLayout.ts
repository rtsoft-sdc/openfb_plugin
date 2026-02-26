import { EditorPort } from "../editorState";

/**
 * Node dimension calculation configuration
 * Extracted from calculateNodeDimensions for easier tuning
 */
const NODE_LAYOUT = {
  PORT_SPACING: 18,           // Vertical spacing between ports
  PORT_RADIUS: 4,             // Radius of port circle
  MIN_WIDTH: 140,             // Minimum node width
  MIN_HEIGHT: 80,             // Minimum node height
  PADDING_X: 16,              // Horizontal padding inside node
  PADDING_Y: 12,              // Vertical padding inside node
  GAP_BETWEEN_ZONES: 8,       // Gap between event and data zones
  TEXT_WIDTH_PER_CHAR: 7.5,   // Estimated pixels per character (11px monospace)
  ARROWS_AND_SPACING: 40,     // Space for arrows and spacing around port labels
};

/**
 * Calculate node dimensions based on its ports
 * 
 * @param ports List of editor ports for the node
 * @returns Width and height suitable for rendering the node with all ports
 */
export function calculateNodeDimensions(ports: EditorPort[]): { width: number; height: number } {
  // Find longest port name for width calculation
  const longestPortName = ports.reduce((max, p) => 
    p.name.length > max.length ? p.name : max, 
    ""
  );

  // Estimate width based on port names + space for arrows and labels on both sides
  // Each port label needs: arrow (8px) + gap (8px) + text width
  // We need space on BOTH sides (input and output), so multiply base width by 2
  const estimatedTextWidth = longestPortName.length * NODE_LAYOUT.TEXT_WIDTH_PER_CHAR;
  const width = Math.max(
    NODE_LAYOUT.MIN_WIDTH,
    estimatedTextWidth * 2 + NODE_LAYOUT.PADDING_X + NODE_LAYOUT.ARROWS_AND_SPACING
  );

  // Calculate height based on port zones:
  // Separate into Event and Data ports, then Input and Output
  const inputs = ports.filter((p) => p.direction === "input");
  const outputs = ports.filter((p) => p.direction === "output");

  const eventInputs = inputs.filter((p) => p.kind === "event");
  const eventOutputs = outputs.filter((p) => p.kind === "event");
  const dataInputs = inputs.filter((p) => p.kind === "data");
  const dataOutputs = outputs.filter((p) => p.kind === "data");

  // Height calculation:
  // - Initial padding
  // - Max of event inputs/outputs * spacing
  // - Gap
  // - Max of data inputs/outputs * spacing
  // - Final padding

  const eventZoneHeight = Math.max(eventInputs.length, eventOutputs.length) > 0
    ? Math.max(eventInputs.length, eventOutputs.length) * NODE_LAYOUT.PORT_SPACING + 4
    : 0;

  const dataZoneHeight = Math.max(dataInputs.length, dataOutputs.length) > 0
    ? Math.max(dataInputs.length, dataOutputs.length) * NODE_LAYOUT.PORT_SPACING + 4
    : 0;

  const height = Math.max(
    NODE_LAYOUT.MIN_HEIGHT,
    NODE_LAYOUT.PADDING_Y + eventZoneHeight + (eventZoneHeight > 0 && dataZoneHeight > 0 ? NODE_LAYOUT.GAP_BETWEEN_ZONES : 0) + dataZoneHeight + 6
  );

  return { width, height };
}
