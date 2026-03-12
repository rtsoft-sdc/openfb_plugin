import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { parseSysFile } from "./parsing/sysParser";
import { loadFbt } from "./parsing/fbtParser";
import { FBTypeRegistry } from "./fbTypeRegistry";
import { stripTypeLibraryPaths } from "./settingsManager";
import type { SysSubAppNetwork } from "../shared/models/sysModel";
import type { MessageContext } from "./messageRouter";
import type { Logger } from "./logging";

/**
 * Resolve the "Type Library" folder next to the .sys file directory.
 */
export function createTypeLibraryResolver(sysFileDir: string, logger: Logger): () => string | undefined {
  return (): string | undefined => {
    const typeLibDir = path.join(sysFileDir, "Type Library");
    try {
      if (fs.existsSync(typeLibDir) && fs.statSync(typeLibDir).isDirectory()) {
        return typeLibDir;
      }
    } catch (err) {
      logger.warn("Failed to resolve Type Library path", err);
    }
    return undefined;
  };
}

/**
 * Create a reusable diagram-loading function that populates shared state
 * with parsed SYS model, FB types, and search paths.
 */
export function createDiagramLoader(
  uri: vscode.Uri,
  workspaceFolder: vscode.WorkspaceFolder,
  shared: MessageContext["shared"],
  resolveTypeLibraryPath: () => string | undefined,
  logger: Logger,
): () => Promise<void> {
  const sysFileDir = path.dirname(uri.fsPath);

  return async (): Promise<void> => {
    const config = vscode.workspace.getConfiguration("openfb");
    const rawUserPaths = config.get<string[]>("fbLibraryPaths") || [];
    const userPaths = stripTypeLibraryPaths(rawUserPaths);
    const typeLibPath = resolveTypeLibraryPath();

    const uniquePaths = new Set<string>();
    if (typeLibPath) uniquePaths.add(typeLibPath);
    uniquePaths.add(sysFileDir);
    //uniquePaths.add(workspaceFolder.uri.fsPath);
    userPaths.forEach((p) => uniquePaths.add(p));
    shared.searchPaths = Array.from(uniquePaths);

    logger.info("FB library search paths", shared.searchPaths);
    logger.info("Loading SYS file", uri.fsPath);
    const model = parseSysFile(uri.fsPath, shared.searchPaths);
    shared.model = model;

    const usedTypeNames = new Set<string>();
    const collectTypeNames = (network: SysSubAppNetwork) => {
      for (const block of network?.blocks || []) {
        if (block?.typeShort) usedTypeNames.add(block.typeShort);
      }
      for (const subApp of network?.subApps || []) {
        if (subApp?.typeShort) usedTypeNames.add(subApp.typeShort);
        if (subApp?.subAppNetwork) collectTypeNames(subApp.subAppNetwork);
      }
    };
    collectTypeNames(model.subAppNetwork);
    logger.info("FB types used in SYS file", Array.from(usedTypeNames));

    const registry = new FBTypeRegistry(shared.searchPaths);
    registry.scanForTypes(Array.from(usedTypeNames));
    try {
      for (const b of model.subAppNetwork.blocks) {
        const typeName = b.typeShort;
        if (!typeName) continue;
        const info = registry.get(typeName);
        if (info && info.filePath) {
          try {
            const { kind } = loadFbt(info.filePath);
            b.fbKind = kind;
            b.resolvedTypePath = info.filePath;
            logger.debug(`Resolved type ${typeName} -> ${info.filePath} (kind=${kind})`);
          } catch (err) {
            logger.warn(`Failed to load FBT for type ${typeName}`, err);
          }
        } else {
          logger.debug(`FB type ${typeName} not found in registry`);
        }
      }
      logger.info("FB type classification via registry complete");
    } catch (err) {
      logger.warn("FB type classification via registry failed", err);
    }

    shared.fbTypeMap = new Map();
    for (const typeName of usedTypeNames) {
      const fbModel = registry.getTypeModel(typeName);
      if (fbModel) {
        shared.fbTypeMap.set(typeName, fbModel);
        logger.debug(
          `Type "${typeName}" ports:`,
          fbModel.ports.map((p) => `${p.name}(${p.direction}/${p.kind})`)
        );
      }
    }
  };
}
