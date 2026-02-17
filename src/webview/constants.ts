/**
 * Webview Constants
 */

// ============ ZOOM CONSTANTS ============
export const ZOOM_CONFIG = {
  IN_FACTOR: 1.1,           // Multiply zoom by this when zooming in (Ctrl+Scroll Up)
  OUT_FACTOR: 0.9,          // Multiply zoom by this when zooming out (Ctrl+Scroll Down)
  MIN: 0.1,                 // Minimum zoom level (10%)
  MAX: 5.0,                 // Maximum zoom level (500%)
  FIT_ZOOM_MARGIN: 0.95,    // Apply 0.95 margin when fitting to view
  MIN_VIRTUAL_SIZE: 400,    // (legacy) Minimum virtual diagram size (not used for fit-to-view)
  FITS_MAX_ZOOM: 1.15,      // Max zoom when diagram already fits on screen
  MULTI_FIT_MARGIN: 0.98,   // Margin to use when fitting multiple, distant elements (almost touching edges)
  
  // Minimum rendered-node size (in pixels) to keep nodes readable when zoomed out
  NODE_MIN_RENDERED_WIDTH: 120,
  NODE_MIN_RENDERED_HEIGHT: 72,
};

// ============ PANNING/SCROLLING CONSTANTS ============
export const PAN_CONFIG = {
  WHEEL_SPEED: 15,          // Pixels to pan per wheel scroll (when not Ctrl)
  AUTO_SCROLL_SPEED: 0.3,   // Smooth scrolling factor when dragging nodes
};

// ============ PADDING CONSTANTS ============
export const PADDING_CONFIG = {
  AUTO_SCROLL_PADDING: 20,  // Distance from edge to maintain when auto-scrolling
  LAYOUT_PADDING: 40,       // Default padding for layout (fits, normalizing coordinates)
};

// ============ DIAGRAM LOADING CONSTANTS ============
export const DIAGRAM_CONFIG = {
  SIZE_THRESHOLD: 1500,     // If diagram larger than this, scale it down
  NORMALIZED_SIZE: 1000,    // Target size when scaling large diagrams
};
