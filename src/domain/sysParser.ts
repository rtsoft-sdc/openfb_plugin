import * as fs from "fs";
import { XMLParser } from "fast-xml-parser";
import { SysBlock, SysConnection, SysModel } from "./sysModel";
import { getLogger } from "../logging";

export function parseSysFile(filePath: string): SysModel {
  const logger = getLogger();
  const xml = fs.readFileSync(filePath, "utf8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ""
  });

  const doc = parser.parse(xml);

  const app = doc?.System?.Application;
  if (!app) throw new Error("No Application in SYS");

  const blocks: SysBlock[] = [];
  const connections: SysConnection[] = [];

  // FBs can be either directly in Application or inside SubAppNetwork
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
      y: Number(fb.y ?? 0)
    });
  }

  // SubApps can also be in SubAppNetwork
  let subAppList = app.SubAppNetwork?.SubApp;
  const subAppArray = subAppList ? (Array.isArray(subAppList) ? subAppList : [subAppList]) : [];
  logger.debug("Found SubApp elements", subAppArray.length);

  for (const subApp of subAppArray) {
    if (!subApp) continue;
    blocks.push({
      id: subApp.Name,
      type: subApp.Type,
      x: Number(subApp.x ?? 0),
      y: Number(subApp.y ?? 0)
    });
  }

  logger.info("Total blocks parsed", blocks.length);
  
  let connList = app.Connection;
  if (!connList && app.SubAppNetwork?.Connection) {
    connList = app.SubAppNetwork.Connection;
  }

  // Also check FBNetwork connections
  if (!connList && app.SubAppNetwork?.FBNetwork?.EventConnections?.Connection) {
    connList = app.SubAppNetwork.FBNetwork.EventConnections.Connection;
  }
  if (!connList && app.SubAppNetwork?.FBNetwork?.DataConnections?.Connection) {
    connList = app.SubAppNetwork.FBNetwork.DataConnections.Connection;
  }

  const connArray = connList ? (Array.isArray(connList) ? connList : [connList]) : [];
  logger.debug("Found connection elements", connArray.length);

  for (const c of connArray) {
    if (!c) continue;
    // Parse connection format: e.g., "BlockName.PortName" -> "BlockName.PortName"
    const fromParts = c.Source?.split(".") || ["", ""];
    const toParts = c.Destination?.split(".") || ["", ""];
    
    connections.push({
      fromBlock: fromParts[0],
      fromPort: fromParts[1] || "",
      toBlock: toParts[0],
      toPort: toParts[1] || ""
    });
  }

  logger.info("Total connections parsed", connections.length);
  return { blocks, connections };
}

