import { readAndParseXml } from "./xmlParserFactory";
import { detectFBKind, FBKind } from "../../shared/models/FBKind";
import { FBPort } from "../../shared/models/fbtModel";
import { asArray } from "../../shared/utils/arrayUtils";

export interface FBInterface {
  eventInputs: string[];
  eventOutputs: string[];
  dataInputs: FBPort[];
  dataOutputs: FBPort[];
}

export const EMPTY_INTERFACE: FBInterface = {
  eventInputs: [],
  eventOutputs: [],
  dataInputs: [],
  dataOutputs: [],
};

/**
 * Extract event names from an XML interface node.
 */
export function extractEvents(node: any, key: string): string[] {
  if (!node?.[key]) return [];
  const arr = asArray(node[key]);
  return arr.map((p: any) => p.Name).filter(Boolean);
}

/**
 * Extract data variable ports from an XML interface node.
 */
export function extractDataVars(node: any, key: string, direction: "input" | "output"): FBPort[] {
  if (!node?.[key]) return [];
  const arr = asArray(node[key]);
  return arr
    .filter((p: any) => p.Name)
    .map((p: any) => ({
      name: p.Name,
      kind: "data" as const,
      direction,
      type: p.Type || undefined,
    }));
}

export function parseInterfaceList(interfaceList: any): FBInterface {
  if (!interfaceList) {
    return EMPTY_INTERFACE;
  }

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
  const doc = readAndParseXml(filePath);
  return parseInterfaceList(doc?.FBType?.InterfaceList);
}

/**
 * Load .fbt file and return parsed FBType object, the interface and detected kind.
 * This function centralizes parsing and structural detection for callers like sysParser.
 */
export function loadFbt(filePath: string): { fbType: any | null; iface: FBInterface; kind: FBKind } {
  try {
    const doc = readAndParseXml(filePath);
    const fbType = doc?.FBType ?? null;

    const iface = parseInterfaceList(fbType?.InterfaceList);

    const kind = detectFBKind(fbType);
    return { fbType, iface, kind };
  } catch (err) {
    return { fbType: null, iface: EMPTY_INTERFACE, kind: FBKind.UNKNOWN };
  }
}
