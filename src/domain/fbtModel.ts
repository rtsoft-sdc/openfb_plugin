export type PortKind = "event" | "data";
export type PortDirection = "input" | "output";

export interface FBPort {
  name: string;
  kind: PortKind;           // event | data
  direction: PortDirection; // input | output
}

export interface FBTypeModel {
  name: string;
  ports: FBPort[];
}