/**
 * Webview Constants
 */

// ============ PANNING/SCROLLING CONSTANTS ============
export const PAN_CONFIG = {
  WHEEL_SPEED: 15,          // Pixels to pan per wheel scroll (when not Ctrl)
  AUTO_SCROLL_SPEED: 0.3,   // Smooth scrolling factor when dragging nodes
};

// ============ ZOOM CONSTANTS ============
export const ZOOM_CONFIG = {
  MIN: 0.1,                 // Minimum zoom level (10%)
  MAX: 3.0,                 // Maximum zoom level (300%)
  STEP: 0.1,                // Zoom step per wheel tick
};

// ============ COORDINATE NORMALIZATION ============
export const COORDINATE_CONFIG = {
  TARGET_WIDTH: 1200,       // Target diagram width in pixels after normalization
  TARGET_HEIGHT: 800,       // Target diagram height in pixels after normalization  
  PADDING: 50,              // Padding around normalized diagram
};

// ============ PADDING CONSTANTS ============
export const PADDING_CONFIG = {
  AUTO_SCROLL_PADDING: 20,  // Distance from edge to maintain when auto-scrolling
  LAYOUT_PADDING: 40,       // Default padding for layout (fits, normalizing coordinates)
};

// ============ PANEL/CANVAS LAYOUT ============
export const PANEL_LAYOUT_CONFIG = {
  LEFT_PANEL_WIDTH: 250,
  RIGHT_PANEL_WIDTH: 300,
  TOOLBAR_ID: "toolbar",
};
