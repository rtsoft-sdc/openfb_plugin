import * as path from "path";
import { readAndParseXml } from "./xmlParserFactory";
import { SysModel } from "../../shared/models/sysModel";
import { getLogger } from "../logging";
import { parseSubAppNetwork } from "./parsers/subAppNetworkParser";
import { parseDevices } from "./parsers/devicesParser";
import { parseMappings } from "./parsers/mappingsParser";

export function parseSysFile(
  filePath: string,
  searchPaths?: string[],
): SysModel {
  const logger = getLogger();
  const doc = readAndParseXml(filePath);
  const system = doc?.System;
  if (!system) throw new Error("No System in SYS");

  const app = system.Application;
  if (!app) throw new Error("No Application in SYS");

  const systemName = system.Name || "DefaultSystem";
  const applicationName = app.Name || "DefaultApp";
  const sysDir = path.dirname(filePath);

  const subAppNetwork = parseSubAppNetwork(app, sysDir, searchPaths || [], logger);
  const devices = parseDevices(system, sysDir, searchPaths || [], logger);
  const mappings = parseMappings(system, logger);
  
  return {
    systemName,
    applicationName,
    subAppNetwork,
    devices,
    mappings,
  };
}
