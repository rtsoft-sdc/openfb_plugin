import * as fs from "fs";
import { XMLParser } from "fast-xml-parser";
import { detectFBKind } from "./FBKind";
import { FBKind } from "./FBKind";
import { FBPort } from "./fbtModel";

export interface FBInterface {
  eventInputs: string[];
  eventOutputs: string[];
  dataInputs: FBPort[];
  dataOutputs: FBPort[];
}

/**
 * Parse only the InterfaceList from a .fbt file (backward compatible)
 */
export function parseFbtFile(filePath: string): FBInterface {
  const xml = fs.readFileSync(filePath, "utf8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const doc = parser.parse(xml);

  const iface = doc?.FBType?.InterfaceList;
  if (!iface) {
    return {
      eventInputs: [],
      eventOutputs: [],
      dataInputs: [],
      dataOutputs: [],
    };
  }

  const extractEvents = (node: any, key: string) => {
    if (!node?.[key]) return [];
    const arr = Array.isArray(node[key]) ? node[key] : [node[key]];
    return arr.map((p: any) => p.Name).filter(Boolean);
  };

  const extractDataVars = (node: any, key: string, direction: "input" | "output"): FBPort[] => {
    if (!node?.[key]) return [];
    const arr = Array.isArray(node[key]) ? node[key] : [node[key]];
    return arr
      .filter((p: any) => p.Name)
      .map((p: any) => ({
        name: p.Name,
        kind: "data" as const,
        direction,
        type: p.Type || undefined,
      }));
  };

  return {
    eventInputs: extractEvents(iface.EventInputs, "Event"),
    eventOutputs: extractEvents(iface.EventOutputs, "Event"),
    dataInputs: extractDataVars(iface.InputVars, "VarDeclaration", "input"),
    dataOutputs: extractDataVars(iface.OutputVars, "VarDeclaration", "output"),
  };
}

/**
 * Load .fbt file and return parsed FBType object, the interface and detected kind.
 * This function centralizes parsing and structural detection for callers like sysParser.
 */
export function loadFbt(filePath: string): { fbType: any | null; iface: FBInterface; kind: FBKind } {
  try {
    const xml = fs.readFileSync(filePath, "utf8");
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const doc = parser.parse(xml);
    const fbType = doc?.FBType ?? null;

    const iface = fbType?.InterfaceList
      ? {
          eventInputs: ((): string[] => {
            const node = fbType.InterfaceList.EventInputs;
            if (!node) return [];
            const arr = Array.isArray(node.Event) ? node.Event : [node.Event];
            return arr.map((n: any) => n?.Name).filter(Boolean);
          })(),
          eventOutputs: ((): string[] => {
            const node = fbType.InterfaceList.EventOutputs;
            if (!node) return [];
            const arr = Array.isArray(node.Event) ? node.Event : [node.Event];
            return arr.map((n: any) => n?.Name).filter(Boolean);
          })(),
          dataInputs: ((): FBPort[] => {
            const node = fbType.InterfaceList.InputVars;
            if (!node) return [];
            const arr = Array.isArray(node.VarDeclaration) ? node.VarDeclaration : [node.VarDeclaration];
            return arr
              .filter((n: any) => n?.Name)
              .map((n: any) => ({
                name: n.Name,
                kind: "data" as const,
                direction: "input" as const,
                type: n.Type || undefined,
              }));
          })(),
          dataOutputs: ((): FBPort[] => {
            const node = fbType.InterfaceList.OutputVars;
            if (!node) return [];
            const arr = Array.isArray(node.VarDeclaration) ? node.VarDeclaration : [node.VarDeclaration];
            return arr
              .filter((n: any) => n?.Name)
              .map((n: any) => ({
                name: n.Name,
                kind: "data" as const,
                direction: "output" as const,
                type: n.Type || undefined,
              }));
          })(),
        }
      : { eventInputs: [], eventOutputs: [], dataInputs: [], dataOutputs: [] };

    const kind = detectFBKind(fbType);
    return { fbType, iface, kind };
  } catch (err) {
    return { fbType: null, iface: { eventInputs: [], eventOutputs: [], dataInputs: [], dataOutputs: [] }, kind: FBKind.UNKNOWN };
  }
}
