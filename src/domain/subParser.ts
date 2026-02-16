import * as fs from "fs";
import { XMLParser } from "fast-xml-parser";
import { FBKind } from "./FBKind";
import { FBInterface } from "./fbtParser";

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

  return {
    eventInputs: extract(iface.SubAppEventInputs, "SubAppEvent"),
    eventOutputs: extract(iface.SubAppEventOutputs, "SubAppEvent"),
    dataInputs: extract(iface.InputVars, "VarDeclaration"),
    dataOutputs: extract(iface.OutputVars, "VarDeclaration"),
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
          dataInputs: ((): string[] => {
            const node = subAppType.SubAppInterfaceList.InputVars;
            if (!node) return [];
            const arr = Array.isArray(node.VarDeclaration) ? node.VarDeclaration : [node.VarDeclaration];
            return arr.map((n: any) => n?.Name).filter(Boolean);
          })(),
          dataOutputs: ((): string[] => {
            const node = subAppType.SubAppInterfaceList.OutputVars;
            if (!node) return [];
            const arr = Array.isArray(node.VarDeclaration) ? node.VarDeclaration : [node.VarDeclaration];
            return arr.map((n: any) => n?.Name).filter(Boolean);
          })(),
        }
      : { eventInputs: [], eventOutputs: [], dataInputs: [], dataOutputs: [] };

    const kind = subAppType ? FBKind.SUBAPP : FBKind.UNKNOWN;
    return { subAppType, iface, kind };
  } catch (err) {
    return { subAppType: null, iface: { eventInputs: [], eventOutputs: [], dataInputs: [], dataOutputs: [] }, kind: FBKind.UNKNOWN };
  }
}
