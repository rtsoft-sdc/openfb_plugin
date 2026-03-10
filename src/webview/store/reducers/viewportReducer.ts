/**
 * Viewport-related reducer cases:
 * ZOOM, PAN, HOVER_PORT
 */

import { EditorStoreState } from "../types";
import { EditorAction } from "../actions";
import { ZOOM_CONFIG } from "../../constants";

export function reduceViewportAction(
  state: EditorStoreState,
  action: EditorAction,
): EditorStoreState | undefined {
  switch (action.type) {
    case "ZOOM": {
      const oldZoom = state.ui.viewport.zoom;
      const oldOffsetX = state.ui.viewport.offsetX;
      const oldOffsetY = state.ui.viewport.offsetY;

      const newZoom = Math.max(
        ZOOM_CONFIG.MIN,
        Math.min(ZOOM_CONFIG.MAX, oldZoom * action.factor),
      );

      if (newZoom === oldZoom) return state;

      const dx =
        (action.centerX - action.canvasCenterX) * (1 / newZoom - 1 / oldZoom);
      const dy =
        (action.centerY - action.canvasCenterY) * (1 / newZoom - 1 / oldZoom);

      return {
        ...state,
        ui: {
          ...state.ui,
          viewport: {
            ...state.ui.viewport,
            zoom: newZoom,
            offsetX: oldOffsetX + dx,
            offsetY: oldOffsetY + dy,
          },
        },
      };
    }

    case "PAN":
      return {
        ...state,
        ui: {
          ...state.ui,
          viewport: {
            ...state.ui.viewport,
            offsetX: state.ui.viewport.offsetX + action.dx,
            offsetY: state.ui.viewport.offsetY + action.dy,
          },
        },
      };

    case "HOVER_PORT":
      if (state.ui.hoveredPortId === action.portId) return state;
      return {
        ...state,
        ui: {
          ...state.ui,
          hoveredPortId: action.portId,
        },
      };

    default:
      return undefined;
  }
}
