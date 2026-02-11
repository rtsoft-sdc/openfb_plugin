import * as fs from "fs";
import { XMLParser } from "fast-xml-parser";
import { 
  SysBlock, 
  SysConnection, 
  SysModel, 
  SysParameter,
  SysDevice,
  SysResource,
  SysMapping 
} from "./sysModel";
import { getLogger } from "../logging";

export function parseSysFile(filePath: string): SysModel {
  const logger = getLogger();
  const xml = fs.readFileSync(filePath, "utf8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ""
  });

  const doc = parser.parse(xml);
  const system = doc?.System;
  if (!system) throw new Error("No System in SYS");

  const app = system.Application;
  if (!app) throw new Error("No Application in SYS");

  const applicationName = app.Name || "DefaultApp";
  const blocks: SysBlock[] = [];
  const parameters: SysParameter[] = [];
  const connections: SysConnection[] = [];
  const devices: SysDevice[] = [];
  const mappings: SysMapping[] = [];

  // ============ PARSE FB INSTANCES ============
  let fbList = app.FB;
  if (!fbList && app.SubAppNetwork?.FB) {
    fbList = app.SubAppNetwork.FB;
  }

  const fbArray = fbList ? (Array.isArray(fbList) ? fbList : [fbList]) : [];
  logger.debug("Found FB elements", fbArray.length);

  for (const fb of fbArray) {
    if (!fb) continue;
    
    blocks.push({
      id: fb.Name,
      type: fb.Type,
      x: Number(fb.x ?? 0),
      y: Number(fb.y ?? 0),
      application: applicationName
    });

    // Extract parameters for this FB
    if (fb.Parameter) {
      const paramList = Array.isArray(fb.Parameter) ? fb.Parameter : [fb.Parameter];
      for (const param of paramList) {
        if (param?.Name && param?.Value !== undefined) {
          parameters.push({
            fbName: fb.Name,
            name: param.Name,
            value: param.Value
          });
        }
      }
    }
  }

  // Also parse SubApps
  let subAppList = app.SubAppNetwork?.SubApp;
  const subAppArray = subAppList ? (Array.isArray(subAppList) ? subAppList : [subAppList]) : [];
  logger.debug("Found SubApp elements", subAppArray.length);

  for (const subApp of subAppArray) {
    if (!subApp) continue;
    blocks.push({
      id: subApp.Name,
      type: subApp.Type,
      x: Number(subApp.x ?? 0),
      y: Number(subApp.y ?? 0),
      application: applicationName
    });
  }

  logger.info("Total blocks parsed", blocks.length);

  // ============ PARSE CONNECTIONS ============
  // EventConnections
  const eventConnList = app.SubAppNetwork?.EventConnections?.Connection;
  const eventConnArray = eventConnList ? (Array.isArray(eventConnList) ? eventConnList : [eventConnList]) : [];
  
  // DataConnections
  const dataConnList = app.SubAppNetwork?.DataConnections?.Connection;
  const dataConnArray = dataConnList ? (Array.isArray(dataConnList) ? dataConnList : [dataConnList]) : [];

  const allConnArray = [...eventConnArray, ...dataConnArray];
  logger.debug("Found connection elements", allConnArray.length);

  for (const c of allConnArray) {
    if (!c) continue;
    const fromParts = c.Source?.split(".") || ["", ""];
    const toParts = c.Destination?.split(".") || ["", ""];
    
    connections.push({
      fromBlock: fromParts[0],
      fromPort: fromParts[1] || "",
      toBlock: toParts[0],
      toPort: toParts[1] || "",
      type: eventConnArray.includes(c) ? "event" : "data"
    });
  }

  logger.info("Total connections parsed", connections.length);

  // ============ PARSE DEVICES & RESOURCES ============
  const deviceList = system.Device;
  const deviceArray = deviceList ? (Array.isArray(deviceList) ? deviceList : [deviceList]) : [];
  logger.debug("Found Device elements", deviceArray.length);

  for (const device of deviceArray) {
    if (!device) continue;

    const resourceList = device.Resource;
    const resourceArray = resourceList ? (Array.isArray(resourceList) ? resourceList : [resourceList]) : [];
    
    const sysResources: SysResource[] = [];
    for (const res of resourceArray) {
      if (!res) continue;
      sysResources.push({
        name: res.Name,
        type: res.Type,
        device: device.Name
      });
    }

    devices.push({
      name: device.Name,
      type: device.Type,
      resources: sysResources
    });
  }

  logger.info("Total devices parsed", devices.length);

  // ============ PARSE MAPPINGS ============
  const mappingList = system.Mapping;
  const mappingArray = mappingList ? (Array.isArray(mappingList) ? mappingList : [mappingList]) : [];
  logger.debug("Found Mapping elements", mappingArray.length);

  for (const mapping of mappingArray) {
    if (!mapping?.From || !mapping?.To) continue;

    // Parse "From": e.g., "washer_detectorApp.CAMERA"
    const fromParts = mapping.From.split(".");
    const fbInstance = mapping.From;

    // Parse "To": e.g., "FORTE_PC.EMB_RES" or just "FORTE_PC"
    const toParts = mapping.To.split(".");
    const deviceName = toParts[0];
    const resourceName = toParts[1] || "EMB_RES"; // Default resource name

    mappings.push({
      fbInstance,
      device: deviceName,
      resource: resourceName
    });
  }

  logger.info("Total mappings parsed", mappings.length);

  return {
    applicationName,
    blocks,
    parameters,
    connections,
    devices,
    mappings
  };
}

