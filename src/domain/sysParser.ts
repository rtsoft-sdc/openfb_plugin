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

/**
 * Parse block name and port from a connection reference
 * E.g., "MULTIPLE_RESOURCES_ide3App.OUT_ANY_CONSOLE.REQ" -> { block: "MULTIPLE_RESOURCES_ide3App.OUT_ANY_CONSOLE", port: "REQ" }
 * Tries to match against known block IDs first
 */
function parseBlockAndPort(
  reference: string,
  knownBlockIds: string[],
  logger: any
): { block: string; port: string } {
  const parts = reference.split(".");
  
  // Try to find a matching block by working backwards from the full reference
  // E.g., if reference is "MULTIPLE_RESOURCES_ide3App.OUT_ANY_CONSOLE.REQ"
  // try "MULTIPLE_RESOURCES_ide3App.OUT_ANY_CONSOLE", then "OUT_ANY_CONSOLE", then "REQ"
  
  for (let i = parts.length - 1; i > 0; i--) {
    const potentialBlock = parts.slice(0, i).join(".");
    const potentialPort = parts[i];
    
    if (knownBlockIds.includes(potentialBlock)) {
      logger.debug(`Matched "${reference}" -> block="${potentialBlock}" port="${potentialPort}"`);
      return { block: potentialBlock, port: potentialPort };
    }
  }
  
  // Fallback: assume last part is port, rest is block
  const block = parts.slice(0, -1).join(".");
  const port = parts[parts.length - 1];
  logger.debug(`No match found for "${reference}", fallback -> block="${block}" port="${port}"`);
  return { block, port };
}

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
  let fbInSubAppNetwork = false;
  if (!fbList && app.SubAppNetwork?.FB) {
    fbList = app.SubAppNetwork.FB;
    fbInSubAppNetwork = true;
  }

  const fbArray = fbList ? (Array.isArray(fbList) ? fbList : [fbList]) : [];
  logger.debug("Found FB elements", fbArray.length);

  for (const fb of fbArray) {
    if (!fb) continue;
    
    const fbId = fbInSubAppNetwork ? `${applicationName}.${fb.Name}` : fb.Name;
    
    blocks.push({
      id: fbId,
      type: fb.Type?.split("::").pop() || fb.Type,
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
            fbName: fbId,
            name: param.Name,
            value: param.Value
          });
        }
      }
    }
  }

  // Also parse SubApps (with their application prefix)
  let subAppList = app.SubAppNetwork?.SubApp;
  const subAppArray = subAppList ? (Array.isArray(subAppList) ? subAppList : [subAppList]) : [];
  logger.debug("Found SubApp elements", subAppArray.length);

  for (const subApp of subAppArray) {
    if (!subApp) continue;
    
    // SubApps also need application prefix
    const subAppId = `${applicationName}.${subApp.Name}`;
    
    blocks.push({
      id: subAppId,
      type: subApp.Type?.split("::").pop() || subApp.Type,
      x: Number(subApp.x ?? 0),
      y: Number(subApp.y ?? 0),
      application: applicationName
    });
  }

  logger.info("Total blocks parsed", blocks.length);

  // Build list of all known block IDs for connection parsing
  const knownBlockIds = blocks.map(b => b.id);
  logger.debug("Known block IDs for connection parsing", knownBlockIds);

  // ============ PARSE CONNECTIONS ============
  // EventConnections
  const eventConnList = app.SubAppNetwork?.EventConnections?.Connection;
  const eventConnArray = eventConnList ? (Array.isArray(eventConnList) ? eventConnList : [eventConnList]) : [];
  logger.debug("Found EventConnection elements", eventConnArray.length);
  
  if (eventConnArray.length > 0) {
    logger.debug("EventConnections raw Source/Destination:", eventConnArray.map((ec: any) => ({ 
      Source: ec.Source, 
      Destination: ec.Destination 
    })));
  }
  
  // DataConnections
  const dataConnList = app.SubAppNetwork?.DataConnections?.Connection;
  const dataConnArray = dataConnList ? (Array.isArray(dataConnList) ? dataConnList : [dataConnList]) : [];
  logger.debug("Found DataConnection elements", dataConnArray.length);
  
  if (dataConnArray.length > 0) {
    logger.debug("DataConnections raw Source/Destination:", dataConnArray.map((dc: any) => ({ 
      Source: dc.Source, 
      Destination: dc.Destination 
    })));
  }

  // Process EventConnections
  for (const c of eventConnArray) {
    if (!c) continue;
    const fromParsed = parseBlockAndPort(c.Source || "", knownBlockIds, logger);
    const toParsed = parseBlockAndPort(c.Destination || "", knownBlockIds, logger);
    
    const conn = {
      fromBlock: fromParsed.block,
      fromPort: fromParsed.port,
      toBlock: toParsed.block,
      toPort: toParsed.port,
      type: "event" as const
    };
    
    logger.info(`Parsed EventConnection: "${c.Source}" -> "${c.Destination}" = ${conn.fromBlock}.${conn.fromPort} -> ${conn.toBlock}.${conn.toPort}`);
    connections.push(conn);
  }

  // Process DataConnections
  for (const c of dataConnArray) {
    if (!c) continue;
    const fromParsed = parseBlockAndPort(c.Source || "", knownBlockIds, logger);
    const toParsed = parseBlockAndPort(c.Destination || "", knownBlockIds, logger);
    
    const conn = {
      fromBlock: fromParsed.block,
      fromPort: fromParsed.port,
      toBlock: toParsed.block,
      toPort: toParsed.port,
      type: "data" as const
    };
    
    logger.info(`Parsed DataConnection: "${c.Source}" -> "${c.Destination}" = ${conn.fromBlock}.${conn.fromPort} -> ${conn.toBlock}.${conn.toPort}`);
    connections.push(conn);
  }

  // ============ PARSE DEVICES & RESOURCES ============
  const deviceList = system.Device;
  const deviceArray = deviceList ? (Array.isArray(deviceList) ? deviceList : [deviceList]) : [];
  logger.debug("Found Device elements", deviceArray.length);

  for (const device of deviceArray) {
    if (!device) continue;

    const resourceList = device.Resource;
    const resourceArray = resourceList ? (Array.isArray(resourceList) ? resourceList : [resourceList]) : [];
    
    const sysResources: SysResource[] = [];
    const deviceParameters: Array<{ name: string; value: string }> = [];
    
    // Parse device parameters
    const paramList = device.Parameter;
    const paramArray = paramList ? (Array.isArray(paramList) ? paramList : [paramList]) : [];
    for (const param of paramArray) {
      if (param && param.Name) {
        deviceParameters.push({
          name: param.Name,
          value: param.Value || ''
        });
      }
    }
    
    for (const res of resourceArray) {
      if (!res) continue;
      sysResources.push({
        name: res.Name,
        type: res.Type,
        device: device.Name
      });

      // ========== PARSE CONNECTIONS FROM RESOURCE FBNETWORK ==========
      // Connections can also be inside Device → Resource → FBNetwork
      const resFBNet = res.FBNetwork;
      if (resFBNet) {
        // EventConnections in Resource
        const resEventConnList = resFBNet.EventConnections?.Connection;
        const resEventConnArray = resEventConnList ? (Array.isArray(resEventConnList) ? resEventConnList : [resEventConnList]) : [];
        
        if (resEventConnArray.length > 0) {
          logger.debug(`Found ${resEventConnArray.length} EventConnections in Resource ${res.Name}`);
          logger.debug(`Resource EventConnections raw:`, resEventConnArray.map((ec: any) => ({ Source: ec.Source, Destination: ec.Destination })));
        }

        // DataConnections in Resource
        const resDataConnList = resFBNet.DataConnections?.Connection;
        const resDataConnArray = resDataConnList ? (Array.isArray(resDataConnList) ? resDataConnList : [resDataConnList]) : [];
        
        if (resDataConnArray.length > 0) {
          logger.debug(`Found ${resDataConnArray.length} DataConnections in Resource ${res.Name}`);
          logger.debug(`Resource DataConnections raw:`, resDataConnArray.map((dc: any) => ({ Source: dc.Source, Destination: dc.Destination })));
        }

        // Process EventConnections from Resource
        for (const c of resEventConnArray) {
          if (!c) continue;
          const fromParsed = parseBlockAndPort(c.Source || "", knownBlockIds, logger);
          const toParsed = parseBlockAndPort(c.Destination || "", knownBlockIds, logger);
          
          const conn = {
            fromBlock: fromParsed.block,
            fromPort: fromParsed.port,
            toBlock: toParsed.block,
            toPort: toParsed.port,
            type: "event" as const
          };
          
          logger.info(`Parsed EventConnection from Resource ${res.Name}: "${c.Source}" -> "${c.Destination}" = ${conn.fromBlock}.${conn.fromPort} -> ${conn.toBlock}.${conn.toPort}`);
          connections.push(conn);
        }

        // Process DataConnections from Resource
        for (const c of resDataConnArray) {
          if (!c) continue;
          const fromParsed = parseBlockAndPort(c.Source || "", knownBlockIds, logger);
          const toParsed = parseBlockAndPort(c.Destination || "", knownBlockIds, logger);
          
          const conn = {
            fromBlock: fromParsed.block,
            fromPort: fromParsed.port,
            toBlock: toParsed.block,
            toPort: toParsed.port,
            type: "data" as const
          };
          
          logger.info(`Parsed DataConnection from Resource ${res.Name}: "${c.Source}" -> "${c.Destination}" = ${conn.fromBlock}.${conn.fromPort} -> ${conn.toBlock}.${conn.toPort}`);
          connections.push(conn);
        }
      }
    }

    devices.push({
      name: device.Name,
      type: device.Type,
      resources: sysResources,
      parameters: deviceParameters
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

  // ============ VALIDATE & FILTER CONNECTIONS ============
  // Only keep connections where both blocks exist on the diagram
  const validConnections = connections.filter(conn => {
    const fromBlockExists = knownBlockIds.includes(conn.fromBlock);
    const toBlockExists = knownBlockIds.includes(conn.toBlock);
    
    if (!fromBlockExists) {
      logger.debug(`Filtered out connection: fromBlock "${conn.fromBlock}" not found on diagram`);
    }
    if (!toBlockExists) {
      logger.debug(`Filtered out connection: toBlock "${conn.toBlock}" not found on diagram`);
    }
    
    return fromBlockExists && toBlockExists;
  });

  // ============ FINAL SUMMARY ============
  logger.info("Total connections parsed", connections.length);
  logger.info("Valid connections (both blocks exist)", validConnections.length);
  if (validConnections.length > 0) {
    logger.debug("Valid connections", validConnections);
  } else {
    logger.warn("No valid connections (connections with both blocks on diagram)");
  }

  return {
    applicationName,
    blocks,
    parameters,
    connections: validConnections,
    devices,
    mappings
  };
}

