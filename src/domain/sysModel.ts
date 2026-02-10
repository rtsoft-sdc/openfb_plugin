export type PortKind = "event" | "data";
export type PortDirection = "input" | "output";

export interface SysBlock {
  id: string;       // instance name
  type: string;     // FB type
  x: number;
  y: number;
}

export interface SysConnection {
  fromBlock: string;
  fromPort: string;
  toBlock: string;
  toPort: string;
}

export interface SysModel {
  blocks: SysBlock[];
  connections: SysConnection[];
}
