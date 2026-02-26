/**
 * Type definitions for canvas rendering
 * Shared interfaces and types used across rendering modules
 */

import { EditorPort } from "../editorState";

/**
 * Camera state for viewport transformations
 * Manages zoom level and pan offset
 */
export interface Camera {
  /** Zoom/scale factor (1.0 = 100%) */
  scale: number;

  /** Horizontal pan offset in canvas coordinates */
  offsetX: number;

  /** Vertical pan offset in canvas coordinates */
  offsetY: number;
}

/**
 * Options passed to legend and stats renderer
 */
export interface StatsLegendOptions {
  /** Current camera horizontal offset */
  offsetX: number;

  /** Current camera vertical offset */
  offsetY: number;

  /** Current camera zoom scale */
  scale: number;
}

/**
 * Node with computed rendering properties
 */
export interface RenderedNode {
  /** Unique node identifier */
  id: string;

  /** Node type/name */
  type: string;

  /** X position in diagram coordinates */
  x: number;

  /** Y position in diagram coordinates */
  y: number;

  /** Rendered width in pixels */
  width: number;

  /** Rendered height in pixels */
  height: number;

  /** Array of ports with computed positions */
  ports: EditorPort[];

  /** Internal: Event port zone start Y */
  _eventZoneY?: number;

  /** Internal: Event port zone height */
  _eventZoneHeight?: number;

  /** Internal: Data port zone start Y */
  _dataZoneY?: number;

  /** Internal: Data port zone height */
  _dataZoneHeight?: number;
}

/**
 * Connection between two ports
 */
export interface DiagramConnection {
  /** Unique connection identifier */
  id: string;

  /** Source port identifier */
  fromPortId: string;

  /** Target port identifier */
  toPortId: string;

  /** Connection kind - determines visual style */
  kind?: "event" | "data";
}

/**
 * Bounding box for geometric calculations
 */
export interface BoundingBox {
  /** Minimum X coordinate */
  minX: number;

  /** Minimum Y coordinate */
  minY: number;

  /** Maximum X coordinate */
  maxX: number;

  /** Maximum Y coordinate */
  maxY: number;

  /** Width of bounding box */
  width: number;

  /** Height of bounding box */
  height: number;
}

/**
 * A point along an orthogonal connection route
 */
export interface Waypoint {
  x: number;
  y: number;
}

/**
 * Legend item to be rendered
 */
export interface LegendItem {
  /** Item label text */
  label: string;

  /** Visual style type */
  type: "port-event" | "port-data" | "connection-event" | "connection-data";

  /** Item color */
  color: string;

  /** Optional dash pattern for connections */
  dash?: number[];
}

