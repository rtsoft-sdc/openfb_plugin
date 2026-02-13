import { FBKind } from "./FBKind";

export type PortKind = "event" | "data";
export type PortDirection = "input" | "output";

export interface SysBlock {
  id: string;           // instance name
  type: string;         // FB type
  x: number;
  y: number;
  application?: string; // parent application name
  kind?: FBKind;        // FB type classification: BASIC | COMPOSITE | SERVICE | ADAPTER | SUBAPP | UNKNOWN
}

export interface SysParameter {
  fbName: string;       // FB instance name to which parameter belongs
  name: string;         // parameter name
  value: string;        // parameter value
}

export interface SysConnection {
  fromBlock: string;
  fromPort: string;
  toBlock: string;
  toPort: string;
  type?: "event" | "data";  // connection type
}

export interface SysResource {
  name: string;         // resource name (e.g., "EMB_RES")
  type: string;         // resource type (e.g., "iec61499::system::EMB_RES")
  device: string;       // parent device name
}

export interface SysDevice {
  name: string;         // device name (e.g., "FORTE_PC")
  type?: string;        // device type (e.g., "iec61499::system::FORTE_PC")
  resources: SysResource[];
  color?: string;       // optional color attribute in format "R,G,B"
  parameters?: Array<{  // device parameters
    name: string;
    value: string;
  }>;
}

export interface SysMapping {
  fbInstance: string;   // FB qualified name (e.g., "washer_detectorApp.CAMERA")
  device: string;       // target device name (e.g., "FORTE_PC")
  resource: string;     // target resource name (e.g., "EMB_RES")
}

export interface SysModel {
  applicationName: string;      // Application name
  blocks: SysBlock[];           // FB instances with parameters
  parameters: SysParameter[];   // FB parameters (Literal Assignments)
  connections: SysConnection[]; // EventConnections + DataConnections
  devices: SysDevice[];         // Devices with their resources
  mappings: SysMapping[];       // FB to Device/Resource mappings (CRITICAL)
}
