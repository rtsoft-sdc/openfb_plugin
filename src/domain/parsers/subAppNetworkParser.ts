import * as fs from "fs";
import { XMLParser } from "fast-xml-parser";
import { SysSubAppNetwork, SysBlock, SysSubApp, SubAppInterfaceParam } from "../sysModel";
import { parseFBBlock } from "./fbBlockParser";
import { parseConnections } from "./connectionsParser";
import { parseParameters } from "./parameterParser";
import { resolveTypeFilePath } from "../fileSearch";

function resolveSubAppTypePath(
  typeShort: string,
  sysDir: string,
  searchPaths: string[],
): string | undefined {
  return resolveTypeFilePath(typeShort, "sub", [sysDir, ...searchPaths]);
}

function parseSubAppInterfaceList(node: any): SubAppInterfaceParam[] | undefined {
  if (!node) return undefined;

  const parameters: SubAppInterfaceParam[] = [];

  const addParams = (listNode: any, key: string, kind: "event" | "data", direction: "input" | "output") => {
    if (!listNode?.[key]) return;
    const arr = Array.isArray(listNode[key]) ? listNode[key] : [listNode[key]];
    for (const item of arr) {
      if (!item?.Name) continue;
      parameters.push({
        name: item.Name,
        kind,
        direction,
      });
    }
  };

  addParams(node.SubAppEventInputs, "SubAppEvent", "event", "input");
  addParams(node.SubAppEventOutputs, "SubAppEvent", "event", "output");
  addParams(node.InputVars, "VarDeclaration", "data", "input");
  addParams(node.OutputVars, "VarDeclaration", "data", "output");

  return parameters.length > 0 ? parameters : undefined;
}

function loadSubAppDefinitionFromFile(
  filePath: string,
  logger: any,
): { network?: any; subAppInterfaceParams?: SubAppInterfaceParam[] } | undefined {
  try {
    const xml = fs.readFileSync(filePath, "utf8");
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const doc = parser.parse(xml);
    const subAppType = doc?.SubAppType;
    return {
      network: subAppType?.SubAppNetwork,
      subAppInterfaceParams: parseSubAppInterfaceList(subAppType?.SubAppInterfaceList),
    };
  } catch (err) {
    logger.warn(`Failed to parse SubApp file ${filePath}`, err);
    return undefined;
  }
}

function parseSubAppElement(
  subApp: any,
  sysDir: string,
  searchPaths: string[],
  logger: any,
): SysSubApp {
  const typeLong = subApp.Type || "";
  const typeShort = typeLong.includes("::")
    ? typeLong.split("::").pop() || typeLong
    : typeLong;

  const parameters = parseParameters(subApp.Name, subApp);

  let subAppNetwork: SysSubAppNetwork = { blocks: [] };
  let subAppInterfaceParams: SubAppInterfaceParam[] | undefined;
  if (typeShort) {
    const subPath = resolveSubAppTypePath(typeShort, sysDir, searchPaths);
    if (subPath) {
      logger.debug(`Resolved SubApp type ${typeShort} at ${subPath}`);
      const def = loadSubAppDefinitionFromFile(subPath, logger);
      if (def?.network) {
        subAppNetwork = parseSubAppNetworkFromNode(def.network, sysDir, searchPaths, logger);
      }
      subAppInterfaceParams = def?.subAppInterfaceParams;
    } else {
      logger.debug(`No .sub file found for SubApp type ${typeShort}`);
    }
  }

  return {
    id: subApp.Name,
    typeShort,
    typeLong,
    x: Number(subApp.x ?? 0),
    y: Number(subApp.y ?? 0),
    parameters: parameters.length > 0 ? parameters : undefined,
    subAppNetwork,
    subAppInterfaceParams,
  };
}

function parseSubAppNetworkFromNode(
  network: any,
  sysDir: string,
  searchPaths: string[],
  logger: any,
): SysSubAppNetwork {
  const blocks: SysBlock[] = [];
  const subApps: SysSubApp[] = [];

  const fbList = network?.FB;
  if (fbList) {
    const fbArray = Array.isArray(fbList) ? fbList : [fbList];
    logger.debug(`Found ${fbArray.length} FB elements`);

    for (const fb of fbArray) {
      if (!fb || !fb.Name) continue;
      const fbName = fb.Name;
      const block = parseFBBlock(fb, fbName, sysDir, searchPaths, logger);
      blocks.push(block);
    }
  }

  const subAppList = network?.SubApp;
  if (subAppList) {
    const subAppArray = Array.isArray(subAppList) ? subAppList : [subAppList];
    logger.debug(`Found ${subAppArray.length} SubApp elements`);

    for (const subApp of subAppArray) {
      if (!subApp || !subApp.Name) continue;
      const subAppNode = parseSubAppElement(subApp, sysDir, searchPaths, logger);
      subApps.push(subAppNode);
    }
  }

  const connections = parseConnections(network, logger, true);

  return {
    blocks,
    subApps: subApps.length > 0 ? subApps : undefined,
    connections: connections.length > 0 ? connections : undefined,
  };
}

export function parseSubAppNetwork(
  app: any,
  sysDir: string,
  searchPaths: string[],
  logger: any,
): SysSubAppNetwork {
  const network = app.SubAppNetwork || app;
  const result = parseSubAppNetworkFromNode(network, sysDir, searchPaths, logger);
  logger.info(
    `Parsed ${result.blocks.length} blocks, ${result.subApps?.length || 0} subApps, and ${result.connections?.length || 0} connections`
  );
  return result;
}
