import * as fs from "fs";
import { XMLParser } from "fast-xml-parser";
import { FBKind } from "./FBKind";
import { FBInterface } from "./fbtParser";
import { FBPort } from "./fbtModel";

/**
 * Parse only the SubAppInterfaceList from a .sub file
 */
export function parseSubFile(filePath: string): FBInterface {
  const xml = fs.readFileSync(filePath, "utf8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const doc = parser.parse(xml);

  const iface = doc?.SubAppType?.SubAppInterfaceList;
  if (!iface) {
    return {
      eventInputs: [],
      eventOutputs: [],
      dataInputs: [],
      dataOutputs: [],
    };
  }

  const extract = (node: any, key: string) => {
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
    eventInputs: extract(iface.SubAppEventInputs, "SubAppEvent"),
    eventOutputs: extract(iface.SubAppEventOutputs, "SubAppEvent"),
    dataInputs: extractDataVars(iface.InputVars, "VarDeclaration", "input"),
    dataOutputs: extractDataVars(iface.OutputVars, "VarDeclaration", "output"),
  };
}

/**
 * Load .sub file and return parsed SubAppType object, the interface and detected kind.
 */
export function loadSub(filePath: string): { subAppType: any | null; iface: FBInterface; kind: FBKind } {
  try {
    const xml = fs.readFileSync(filePath, "utf8");
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const doc = parser.parse(xml);
    const subAppType = doc?.SubAppType ?? null;

    const iface = subAppType?.SubAppInterfaceList
      ? {
          eventInputs: ((): string[] => {
            const node = subAppType.SubAppInterfaceList.SubAppEventInputs;
            if (!node) return [];
            const arr = Array.isArray(node.SubAppEvent) ? node.SubAppEvent : [node.SubAppEvent];
            return arr.map((n: any) => n?.Name).filter(Boolean);
          })(),
          eventOutputs: ((): string[] => {
            const node = subAppType.SubAppInterfaceList.SubAppEventOutputs;
            if (!node) return [];
            const arr = Array.isArray(node.SubAppEvent) ? node.SubAppEvent : [node.SubAppEvent];
            return arr.map((n: any) => n?.Name).filter(Boolean);
          })(),
          dataInputs: ((): FBPort[] => {
            const node = subAppType.SubAppInterfaceList.InputVars;
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
            const node = subAppType.SubAppInterfaceList.OutputVars;
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

    const kind = subAppType ? FBKind.SUBAPP : FBKind.UNKNOWN;
    return { subAppType, iface, kind };
  } catch (err) {
    return { subAppType: null, iface: { eventInputs: [], eventOutputs: [], dataInputs: [], dataOutputs: [] }, kind: FBKind.UNKNOWN };
  }
}
