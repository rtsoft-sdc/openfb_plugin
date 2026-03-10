import type { FBKind } from "./FBKind";

export type PortKind = "event" | "data";
export type PortDirection = "input" | "output";

export interface FBPort {
  name: string;
  kind: PortKind;           // event | data
  direction: PortDirection; // input | output
  type?: string;            // Port data type (e.g., ANY_MAGNITUDE)
}

export interface FBTypeModel {
  name: string;
  ports: FBPort[];
  sourcePath?: string; // Relative path from library root (e.g., "stdlib/convert")
  kind?: FBKind;
}