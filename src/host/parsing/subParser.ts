import { readAndParseXml } from "./xmlParserFactory";
import { FBKind } from "../../shared/models/FBKind";
import { FBInterface, EMPTY_INTERFACE, extractEvents, extractDataVars } from "./fbtParser";

/**
 * Parse a SubAppInterfaceList node into FBInterface.
 */
function parseSubInterfaceList(iface: any): FBInterface {
  if (!iface) return EMPTY_INTERFACE;
  return {
    eventInputs: extractEvents(iface.SubAppEventInputs, "SubAppEvent"),
    eventOutputs: extractEvents(iface.SubAppEventOutputs, "SubAppEvent"),
    dataInputs: extractDataVars(iface.InputVars, "VarDeclaration", "input"),
    dataOutputs: extractDataVars(iface.OutputVars, "VarDeclaration", "output"),
  };
}

/**
 * Parse only the SubAppInterfaceList from a .sub file
 */
export function parseSubFile(filePath: string): FBInterface {
  const doc = readAndParseXml(filePath);
  return parseSubInterfaceList(doc?.SubAppType?.SubAppInterfaceList);
}

