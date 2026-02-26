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

const EMPTY_INTERFACE: FBInterface = {
  eventInputs: [],
  eventOutputs: [],
  dataInputs: [],
  dataOutputs: [],
};

export function parseInterfaceList(interfaceList: any): FBInterface {
  if (!interfaceList) {
    return EMPTY_INTERFACE;
  }

  const extractEvents = (node: any, key: string): string[] => {
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
    eventInputs: extractEvents(interfaceList.EventInputs, "Event"),
    eventOutputs: extractEvents(interfaceList.EventOutputs, "Event"),
    dataInputs: extractDataVars(interfaceList.InputVars, "VarDeclaration", "input"),
    dataOutputs: extractDataVars(interfaceList.OutputVars, "VarDeclaration", "output"),
  };
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
  return parseInterfaceList(doc?.FBType?.InterfaceList);
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

    const iface = parseInterfaceList(fbType?.InterfaceList);

    const kind = detectFBKind(fbType);
    return { fbType, iface, kind };
  } catch (err) {
    return { fbType: null, iface: EMPTY_INTERFACE, kind: FBKind.UNKNOWN };
  }
}
