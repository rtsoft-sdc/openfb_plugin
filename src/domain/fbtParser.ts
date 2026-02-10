import * as fs from "fs";
import { XMLParser } from "fast-xml-parser";

export interface FBInterface {
  eventInputs: string[];
  eventOutputs: string[];
  dataInputs: string[];
  dataOutputs: string[];
}

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

  const extract = (node: any, key: string) => {
    if (!node?.[key]) return [];
    const arr = Array.isArray(node[key]) ? node[key] : [node[key]];
    return arr.map((p: any) => p.Name);
  };

  return {
    eventInputs: extract(iface.EventInputs, "Event"),
    eventOutputs: extract(iface.EventOutputs, "Event"),
    dataInputs: extract(iface.InputVars, "VarDeclaration"),
    dataOutputs: extract(iface.OutputVars, "VarDeclaration"),
  };
}
