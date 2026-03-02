import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { OpenFBHandler, setResponsesChannel } from "./openfb/handler";
import { parseSysFile } from "./domain/sysParser";
import { loadFbt } from "./domain/fbtParser";
import { FBTypeRegistry } from "./fbTypeRegistry";
import { initializeLogger, getLogger } from "./logging";
import { FBootGenerator } from "./generators/fboot/fbootGenerator";
import { patchSysFile } from "./domain/sysPatcher";
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings, UiLanguage } from "./shared/pluginSettings";
import { EXTENSION_COLORS } from "./colorScheme";

// Store subscriptions for cleanup on deactivation
const extensionSubscriptions: vscode.Disposable[] = [];

function isUiLanguage(value: unknown): value is UiLanguage {
  return value === "ru" || value === "en";
}

function mergePluginSettings(raw: unknown): PluginSettings {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_PLUGIN_SETTINGS;
  }

  const candidate = raw as Partial<PluginSettings>;
  const fbPaths = Array.isArray(candidate.fbPaths)
    ? candidate.fbPaths.filter((pathValue): pathValue is string => typeof pathValue === "string")
    : DEFAULT_PLUGIN_SETTINGS.fbPaths;

  const deployCandidate = candidate.deploy;
  const deploy = {
    ...DEFAULT_PLUGIN_SETTINGS.deploy,
    ...(deployCandidate && typeof deployCandidate === "object" ? deployCandidate : {}),
  };

  return {
    fbPaths,
    deploy: {
      host: typeof deploy.host === "string" ? deploy.host : DEFAULT_PLUGIN_SETTINGS.deploy.host,
      port: typeof deploy.port === "number" ? deploy.port : DEFAULT_PLUGIN_SETTINGS.deploy.port,
      timeoutMs: typeof deploy.timeoutMs === "number" ? deploy.timeoutMs : DEFAULT_PLUGIN_SETTINGS.deploy.timeoutMs,
    },
    uiLanguage: isUiLanguage(candidate.uiLanguage) ? candidate.uiLanguage : DEFAULT_PLUGIN_SETTINGS.uiLanguage,
  };
}

function sanitizeAndValidatePluginSettings(raw: unknown): { settings?: PluginSettings; error?: string } {
  const merged = mergePluginSettings(raw);

  const host = merged.deploy.host.trim();
  if (!host) {
    return { error: "Поле Host не должно быть пустым" };
  }

  const port = Math.trunc(merged.deploy.port);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return { error: "Port должен быть числом от 1 до 65535" };
  }

  const timeoutMs = Math.trunc(merged.deploy.timeoutMs);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
    return { error: "Timeout должен быть не меньше 1000 мс" };
  }

  const uniquePaths = new Set<string>();
  const fbPaths: string[] = [];
  for (const pathValue of merged.fbPaths) {
    const normalizedPath = pathValue.trim();
    if (!normalizedPath || uniquePaths.has(normalizedPath)) {
      continue;
    }
    uniquePaths.add(normalizedPath);
    fbPaths.push(normalizedPath);
  }

  return {
    settings: {
      fbPaths,
      deploy: {
        host,
        port,
        timeoutMs,
      },
      uiLanguage: merged.uiLanguage,
    },
  };
}

function readSettingsFromVsCodeConfig(): PluginSettings {
  const config = vscode.workspace.getConfiguration("openfb");

  const fbPaths = config.get<string[]>("fbLibraryPaths");
  const host = config.get<string>("host");
  const port = config.get<number>("port");
  const timeoutMs = config.get<number>("deployTimeoutMs");
  const uiLanguage = config.get<string>("uiLanguage");

  return {
    fbPaths: Array.isArray(fbPaths)
      ? fbPaths.filter((pathValue): pathValue is string => typeof pathValue === "string")
      : DEFAULT_PLUGIN_SETTINGS.fbPaths,
    deploy: {
      host: typeof host === "string" ? host : DEFAULT_PLUGIN_SETTINGS.deploy.host,
      port: typeof port === "number" ? port : DEFAULT_PLUGIN_SETTINGS.deploy.port,
      timeoutMs: typeof timeoutMs === "number" ? timeoutMs : DEFAULT_PLUGIN_SETTINGS.deploy.timeoutMs,
    },
    uiLanguage: isUiLanguage(uiLanguage) ? uiLanguage : DEFAULT_PLUGIN_SETTINGS.uiLanguage,
  };
}

export function activate(context: vscode.ExtensionContext) {
  // Ensure the responses output channel exists and is registered in the Output panel
  const responsesChannel = vscode.window.createOutputChannel("OpenFBPlugin");
  context.subscriptions.push(responsesChannel);
  try { responsesChannel.show(true); } catch (e) {}

  // Initialize logger with the responses channel so all logger output goes there
  const logger = initializeLogger(responsesChannel);
  logger.info("OpenFB plugin activated");

  // Register the responses channel with the handler module so it uses this instance
  try { setResponsesChannel(responsesChannel); } catch (e) {}
  
  const commandDisposable = vscode.commands.registerCommand(
    "openfb.plugin.showSysDiagram",
    async (uri: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage("Не выбран SYS-файл");
        return;
      }

      const basePanelTitle = path.parse(uri.fsPath).name;
      const panel = vscode.window.createWebviewPanel(
        "openfbEditor",
        basePanelTitle,
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
        },
      );

      // Setup panel disposal handler immediately (before any async work)
      const panelDisposables: vscode.Disposable[] = [];

      /**
       * Cleanup function - called when panel is disposed
       */
      const cleanup = () => {
        logger.debug("Cleaning up OpenFB Editor panel resources");
        // Dispose all panel-related listeners
        panelDisposables.forEach(d => d.dispose());
      };

      panel.onDidDispose(cleanup, null, panelDisposables);

      panel.webview.html = getWebviewHtml(
        panel.webview,
        context.extensionUri,
      );

      try {
        const logger = getLogger();
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
          vscode.window.showErrorMessage("Файл не находится в рабочей области");
          panel.dispose();
          return;
        }

        logger.info("Workspace folder", workspaceFolder.uri.fsPath);
        
        // Get directory of .sys file
        const sysFileDir = path.dirname(uri.fsPath);
        logger.info("SYS file directory", sysFileDir);
        
        // Read library paths from settings
        const config = vscode.workspace.getConfiguration("openfb");
        const userPaths = config.get<string[]>("fbLibraryPaths") || [];
        
        // Search paths: sys file directory first, then workspace root, then user configured paths
        const uniquePaths = new Set<string>();
        uniquePaths.add(sysFileDir);
        uniquePaths.add(workspaceFolder.uri.fsPath);
        userPaths.forEach(p => uniquePaths.add(p));
        const searchPaths = Array.from(uniquePaths);
        
        logger.info("FB library search paths", searchPaths);

        logger.info("Loading SYS file", uri.fsPath);
        let model = parseSysFile(uri.fsPath, searchPaths);
        
        // Extract the FB types that are actually used in the SYS file
        const usedTypeNames = new Set<string>();
        const collectTypeNames = (network: any) => {
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
        
        const registry = new FBTypeRegistry(searchPaths);
        // Scan only for the types that are used in the SYS file
        registry.scanForTypes(Array.from(usedTypeNames));
        // Resolve FB kinds using registry results (preferred: registry searches recursively)
        try {
          for (const b of model.subAppNetwork.blocks) {
            const typeName = b.typeShort;
            if (!typeName) continue;
            const info = registry.get(typeName);
            if (info && info.filePath) {
              try {
                const { kind } = loadFbt(info.filePath);
                b.fbKind = kind;
                (b as any).resolvedTypePath = info.filePath;
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
        
        const fbTypeMap = new Map();
        for (const typeName of usedTypeNames) {
          const fbModel = registry.getTypeModel(typeName);
          if (fbModel) {
            fbTypeMap.set(typeName, fbModel);
            logger.debug(
              `Type "${typeName}" ports:`,
              fbModel.ports.map((p) => `${p.name}(${p.direction}/${p.kind})`)
            );
          }
        }

        logger.debug(
          "Sending to webview",
          {
            diagramBlocks: model.subAppNetwork.blocks.length,
            fbTypesCount: fbTypeMap.size,
          }
        );
        
        // Log detailed block info
        logger.debug("Detailed block info");
        for (const block of model.subAppNetwork.blocks) {
          logger.debug(`Block: ${block.id} (type=${block.typeShort}) at (${block.x}, ${block.y})`);
        }

        // Prepare message payload
        const messageData = {
          type: "load-diagram",
          payload: model,
          fbTypes: Array.from(fbTypeMap.entries()),
        };

        let messageDisposable: vscode.Disposable | undefined;
        let timeoutHandle: NodeJS.Timeout | undefined;

        /**
         * Message handler - listens for ready handshake from webview
         */
        messageDisposable = panel.webview.onDidReceiveMessage(async (m) => {
          try {
            logger.debug("Message from webview", m);
            if (m?.type === "ready") {
              const testJson = JSON.stringify(messageData);
              logger.debug("Message serializable (on ready)", testJson.length, "bytes");
              panel.webview.postMessage(messageData);
              logger.debug("Message sent to webview on ready");
              
              // Clear fallback timeout if message was received
              if (timeoutHandle) {
                clearTimeout(timeoutHandle);
                timeoutHandle = undefined;
              }
              return;
            } else if (m?.type === "deploy") {
              try {
                // Compute .fboot path next to .sys file
                const sysPath = uri.fsPath;
                const parsed = path.parse(sysPath);
                const systemName = model.systemName || parsed.name;
                const deviceNames = model.devices?.map((d) => d.name) || [];

                const fbootPaths = deviceNames.length
                  ? deviceNames.map((device) => path.join(parsed.dir, `${systemName}_${device}.fboot`))
                  : [path.join(parsed.dir, `${systemName}.fboot`)];

                const missingFiles = fbootPaths.filter((filePath) => !fs.existsSync(filePath));
                if (missingFiles.length > 0) {
                  vscode.window.showErrorMessage(`.fboot файл(ы) не найдены: ${missingFiles.join(", ")}`);
                  return;
                }

                logger.info("Deploy requested", fbootPaths);

                const handler = new OpenFBHandler();
                const deployPromise = fbootPaths.length > 1
                  ? handler.deployMultiple(fbootPaths)
                  : handler.deploy(fbootPaths[0]);

                deployPromise
                  .then(() => {
                    const message = fbootPaths.length > 1
                      ? `Деплой завершён: ${fbootPaths.length} файл(ов)`
                      : `Деплой завершён: ${fbootPaths[0]}`;
                    vscode.window.showInformationMessage(message);
                  })
                  .catch((err) => {
                    logger.error("Deploy failed", err);
                    vscode.window.showErrorMessage(`Не удалось выполнить деплой: ${err}`);
                  });
              } catch (err) {
                logger.error("Error handling deploy message", err);
                vscode.window.showErrorMessage(`Ошибка при деплое: ${err}`);
              }
              return;
            } else if (m?.type === "generateFboot") {
              logger.info("Generate FBOOT requested");

              const fbGenerator = new FBootGenerator(model, uri.fsPath, searchPaths);
              fbGenerator.generate()
                .then((files: string[]) => {
                  const message = `FBOOT создан: ${files.length} файл(ов)`;
                  logger.info(message, files);
                  vscode.window.showInformationMessage(message);
                })
                .catch((err: unknown) => {
                  const errorMsg = `Не удалось создать FBOOT: ${err}`;
                  logger.error(errorMsg, err);
                  vscode.window.showErrorMessage(errorMsg);
                });
              return; 
            } else if (m?.type === "save-sys") {
              try {
                const updatedModel = m.model;
                if (!updatedModel) {
                  logger.warn("save-sys: no model in message");
                  panel.webview.postMessage({ type: "save-sys-result", payload: { success: false, error: "Нет данных модели" } });
                  return;
                }

                const nodes: Array<{ id: string; x: number; y: number }> = m.nodes || [];
                const normParams = m.normParams;

                // --- Ensure all blocks have a mapping entry ---
                const appName = updatedModel.applicationName || "App";
                if (updatedModel.subAppNetwork?.blocks && updatedModel.devices?.length > 0) {
                  const mappings = updatedModel.mappings || [];
                  const mappedInstances = new Set(mappings.map((mp: any) => mp.fbInstance));
                  const defaultDevice = updatedModel.devices[0].name || "FORTE_PC";
                  const defaultResource = updatedModel.devices[0].resources?.[0]?.name || "EMB_RES";

                  for (const block of updatedModel.subAppNetwork.blocks) {
                    const qualifiedName = `${appName}.${block.id}`;
                    if (!mappedInstances.has(qualifiedName)) {
                      mappings.push({
                        fbInstance: qualifiedName,
                        device: defaultDevice,
                        resource: defaultResource,
                      });
                      logger.info(`Auto-mapped new block "${qualifiedName}" -> ${defaultDevice}.${defaultResource}`);
                    }
                  }
                  updatedModel.mappings = mappings;
                }

                // Patch the original XML file preserving all untracked attributes
                const xml = patchSysFile(uri.fsPath, {
                  model: updatedModel,
                  nodes,
                  normParams,
                });

                const defaultUri = vscode.Uri.file(
                  uri.fsPath.replace(/\.sys$/i, "_new.sys")
                );

                const saveUri = await vscode.window.showSaveDialog({
                  defaultUri,
                  filters: { "IEC 61499 System": ["sys"] },
                  title: "Сохранить SYS файл как",
                });

                if (!saveUri) {
                  logger.info("Save cancelled by user");
                  return;
                }

                fs.writeFileSync(saveUri.fsPath, xml, "utf8");
                logger.info("SYS file saved to", saveUri.fsPath);
                vscode.window.showInformationMessage(`Файл сохранён: ${saveUri.fsPath}`);
                panel.webview.postMessage({ type: "save-sys-result", payload: { success: true, filePath: saveUri.fsPath } });
              } catch (err) {
                logger.error("Failed to save SYS file", err);
                vscode.window.showErrorMessage(`Не удалось сохранить файл: ${err}`);
                panel.webview.postMessage({ type: "save-sys-result", payload: { success: false, error: String(err) } });
              }
              return;
            } else if (m?.type === "settings:load") {
              try {
                const settings = readSettingsFromVsCodeConfig();
                panel.webview.postMessage({ type: "settings:loaded", payload: settings });
              } catch (err) {
                logger.error("Failed to load plugin settings", err);
                panel.webview.postMessage({ type: "settings:error", payload: "Не удалось загрузить настройки" });
              }
              return;
            } else if (m?.type === "settings:save") {
              try {
                const { settings, error } = sanitizeAndValidatePluginSettings(m.payload);
                if (!settings) {
                  panel.webview.postMessage({ type: "settings:error", payload: error || "Некорректные настройки" });
                  return;
                }

                const config = vscode.workspace.getConfiguration("openfb");
                await config.update("fbLibraryPaths", settings.fbPaths, vscode.ConfigurationTarget.Global);
                await config.update("host", settings.deploy.host, vscode.ConfigurationTarget.Global);
                await config.update("port", settings.deploy.port, vscode.ConfigurationTarget.Global);
                await config.update("deployTimeoutMs", settings.deploy.timeoutMs, vscode.ConfigurationTarget.Global);
                await config.update("uiLanguage", settings.uiLanguage, vscode.ConfigurationTarget.Global);

                panel.webview.postMessage({ type: "settings:saved", payload: readSettingsFromVsCodeConfig() });
              } catch (err) {
                logger.error("Failed to save plugin settings", err);
                panel.webview.postMessage({ type: "settings:error", payload: "Не удалось сохранить настройки" });
              }
              return;
            } else if (m?.type === "settings:pick-path") {
              try {
                const picks = await vscode.window.showOpenDialog({
                  canSelectFiles: true,
                  canSelectFolders: true,
                  canSelectMany: false,
                  openLabel: "Выбрать",
                  title: "Выберите папку или .fbt файл",
                  filters: {
                    "FBDK Type": ["fbt"],
                  },
                });

                if (!picks || picks.length === 0) {
                  return;
                }

                panel.webview.postMessage({ type: "settings:path-picked", payload: picks[0].fsPath });
              } catch (err) {
                logger.error("Failed to pick settings path", err);
                panel.webview.postMessage({ type: "settings:error", payload: "Не удалось выбрать путь" });
              }
              return;
            } else if (m?.type === "request-all-fb-types") {
              logger.info("Request for all FB types (library palette)");
              try {
                // Use existing searchPaths from diagram loading
                const newRegistry = new FBTypeRegistry(searchPaths);
                const tree = newRegistry.scanAllTypes();
                
                // Collect all FBTypeModels from cache (populated by scanAllTypes)
                const allFbTypes = newRegistry.getAllTypeModels();
                logger.info("Sending FB types tree and models", {
                  rootNodes: tree.length,
                  typeModels: allFbTypes.length,
                });

                panel.webview.postMessage({
                  type: "all-fb-types-loaded",
                  fbTypesTree: tree,
                  fbTypes: allFbTypes,
                });
              } catch (err) {
                logger.error("Failed to scan all FB types", err);
                panel.webview.postMessage({
                  type: "all-fb-types-error",
                  payload: `Не удалось загрузить библиотеку типов: ${err}`,
                });
              }
              return;
            } else if (m?.type === "dirty-state-changed") {
              const isDirty = !!m.isDirty;
              panel.title = isDirty ? `${basePanelTitle} (изм)` : basePanelTitle;
              return;
            } else if (m?.type === "webview-log") {
              // Forward webview logs to the extension OutputChannel
              const level = m.level as string;
              const logMsg = m.message as string;
              const args = m.args as string[] | undefined;
              const full = args?.length ? `[Webview] ${logMsg} ${args.join(" ")}` : `[Webview] ${logMsg}`;
              switch (level) {
                case "debug": logger.debug(full); break;
                case "info":  logger.info(full);  break;
                case "warn":  logger.warn(full);  break;
                case "error": logger.error(full);  break;
                default:      logger.info(full);  break;
              }
              return;
            } else if (m?.type === "create-fb-type") {
              try {
                const fbDef = m.payload as import("./shared/fbtypes").NewFBTypeDefinition;
                if (!fbDef || !fbDef.name) {
                  panel.webview.postMessage({ type: "create-fb-type-result", payload: { success: false, error: "Определение типа отсутствует или не содержит имени" } });
                  return;
                }

                const { serializeNewFBType, getFBTypeFileExtension } = await import("./generators/fbt/fbtSerializer");
                const xml = serializeNewFBType(fbDef);
                const ext = getFBTypeFileExtension(fbDef);

                // Determine TypeLibrary directory next to .sys file
                const sysDir = path.dirname(uri.fsPath);
                const typeLibDir = path.join(sysDir, "TypeLibrary");
                if (!fs.existsSync(typeLibDir)) {
                  fs.mkdirSync(typeLibDir, { recursive: true });
                }

                const targetPath = path.join(typeLibDir, `${fbDef.name}${ext}`);

                // Check if file already exists
                if (fs.existsSync(targetPath)) {
                  const overwrite = await vscode.window.showWarningMessage(
                    `Файл "${fbDef.name}${ext}" уже существует. Перезаписать?`,
                    { modal: true },
                    "Перезаписать"
                  );
                  if (overwrite !== "Перезаписать") {
                    panel.webview.postMessage({ type: "create-fb-type-result", payload: { success: false, error: "Отменено пользователем" } });
                    return;
                  }
                }

                fs.writeFileSync(targetPath, xml, "utf8");
                logger.info("FB type saved", targetPath);
                vscode.window.showInformationMessage(`Тип ФБ сохранён: ${targetPath}`);
                panel.webview.postMessage({ type: "create-fb-type-result", payload: { success: true, filePath: targetPath } });
              } catch (err) {
                logger.error("Failed to create FB type", err);
                vscode.window.showErrorMessage(`Не удалось создать тип ФБ: ${err}`);
                panel.webview.postMessage({ type: "create-fb-type-result", payload: { success: false, error: String(err) } });
              }
              return;
            }
          } catch (err) {
            logger.error("Error handling webview message", err);
          }
        });

        if (messageDisposable) {
          panelDisposables.push(messageDisposable);
        }

        // Fallback: if webview doesn't send ready, send after timeout
        timeoutHandle = setTimeout(() => {
          try {
            const testJson = JSON.stringify(messageData);
            logger.debug("Message serializable (fallback)", testJson.length, "bytes");
            panel.webview.postMessage(messageData);
            logger.info("Message sent to webview (fallback)");
          } catch (error) {
            logger.error("Failed to send message to webview (fallback)", error);
            vscode.window.showErrorMessage(`Не удалось отправить данные вебвью: ${error}`);
          }
        }, 1500);

      } catch (error) {
        logger.error("Error loading diagram", error);
        vscode.window.showErrorMessage(`Ошибка: ${error}`);
        // Dispose panel on error
        panel.dispose();
      }
    },
  );

  // Add to context subscriptions for proper cleanup
  context.subscriptions.push(commandDisposable);
  extensionSubscriptions.push(commandDisposable);
}

/**
 * Called when extension is deactivated
 */
export function deactivate() {
  const logger = getLogger();
  logger.info("OpenFB plugin deactivating, cleaning up resources");
  
  // Dispose all extension-level subscriptions
  extensionSubscriptions.forEach(disposable => {
    try {
      disposable.dispose();
    } catch (err) {
      logger.error("Error disposing subscription", err);
    }
  });
  
  extensionSubscriptions.length = 0;
  
  // Close the logger
  logger.dispose();
}

function getWebviewHtml(webview: vscode.Webview, extUri: vscode.Uri): string {
  const logger = getLogger();
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extUri, "out", "webview", "main.js"),
  );

  logger.debug("Script URI", scriptUri.toString());

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; script-src ${webview.cspSource}; style-src 'unsafe-inline';">
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    
    /* Top full-width toolbar */
    #toolbar {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      height: 48px;
      z-index: 1000;
      display: flex;
      align-items: center;
      background: ${EXTENSION_COLORS.TOOLBAR_BG};
      padding: 0 12px;
      border-top: 1px solid ${EXTENSION_COLORS.TOOLBAR_BORDER};
      border-bottom: 1px solid ${EXTENSION_COLORS.TOOLBAR_BORDER};
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .toolbar-left {
      position: absolute;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-center {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #toolbar button {
      padding: 8px 12px;
      border: 1px solid ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER};
      background: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BG};
      color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_TEXT};
      cursor: pointer;
      border-radius: 4px;
      font-family: Roboto, sans-serif;
    }
    #toolbar button:hover { background: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_HOVER}; }
    #toolbar #settingsBtn, #toolbar #saveAsBtn {
      background: ${EXTENSION_COLORS.TOOLBAR_BUTTON_SECONDARY_BG};
      color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_SECONDARY_TEXT};
      border: 1px solid ${EXTENSION_COLORS.TOOLBAR_BUTTON_SECONDARY_BORDER};
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
    }
    #toolbar #settingsBtn:hover, #toolbar #saveAsBtn:hover {
      background: ${EXTENSION_COLORS.TOOLBAR_BUTTON_SECONDARY_HOVER};
    }
    
    /* Canvas - adjusted for left and right panels */
    #canvas {
      display: block;
      background: ${EXTENSION_COLORS.PANEL_BG};
      position: absolute;
      left: 0;
      top: 48px;
      right: 300px;
      bottom: 0;
    }
    
    /* Left sidepanel for devices */
    #left-sidepanel {
      position: fixed;
      left: 0;
      top: 48px;
      width: 250px;
      height: calc(100vh - 48px);
      background: ${EXTENSION_COLORS.PANEL_BG};
      border-right: 1px solid ${EXTENSION_COLORS.BORDER_DEFAULT};
      overflow-y: auto;
      z-index: 500;
      display: none;
      flex-direction: column;
    }
    
    #left-sidepanel-header {
      padding: 10px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      font-weight: 600;
      font-size: 14px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      position: sticky;
      top: 0;
    }
    
    #left-sidepanel-content {
      flex: 1;
      padding: 8px;
      font-size: 13px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
    }
    
    .device-section {
      margin-bottom: 12px;
      padding: 8px;
      background: ${EXTENSION_COLORS.DEVICE_SECTION_BG};
      border-radius: 4px;
      border-left: 3px solid ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BG};
    }
    
    .device-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    
    .device-name {
      font-weight: 600;
      font-size: 13px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      word-break: break-word;
      flex: 1;
    }
    
    .device-info-container {
      margin-bottom: 8px;
    }
    
    .device-subsection {
      margin-top: 8px;
    }
    
    .device-section-title {
      font-weight: 600;
      font-size: 10px;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
    }
    
    .device-section-title-collapsible {
      font-weight: 600;
      font-size: 10px;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .device-item {
      padding: 2px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }
    
    .device-conns-container .device-item {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .device-label {
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      font-size: 10px;
      min-width: 70px;
    }
    
    .device-conns-container .device-label {
      min-width: auto;
      word-break: break-word;
      font-size: 9px;
    }
    
    .device-value {
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-weight: 500;
      text-align: right;
      word-break: break-word;
      flex: 1;
      margin-left: 8px;
    }
    
    .device-toggle {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      width: 12px;
      height: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      flex-shrink: 0;
    }
    
    .device-toggle:hover {
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
    }
    
    .device-fbs-container {
      padding: 4px 0;
    }
    
    .device-conns-container {
      padding: 4px 0;
    }
    
    .resource-item {
      padding: 1px 0 1px 8px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      font-size: 12px;
    }
    
    /* Right sidepanel */
    #sidepanel {
      position: fixed;
      right: 0;
      top: 48px;
      width: 300px;
      height: calc(100vh - 48px);
      background: ${EXTENSION_COLORS.PANEL_BG};
      border-left: 1px solid ${EXTENSION_COLORS.BORDER_DEFAULT};
      overflow-y: auto;
      z-index: 500;
      display: flex;
      flex-direction: column;
    }
    
    #sidepanel-tabs {
      display: flex;
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_DEFAULT};
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .sidepanel-tab {
      flex: 1;
      padding: 8px 12px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }
    
    .sidepanel-tab:hover {
      background: ${EXTENSION_COLORS.TOOLBAR_BUTTON_SECONDARY_HOVER};
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
    }
    
    .sidepanel-tab.active {
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      border-bottom-color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BG};
      font-weight: 600;
    }
    
    #sidepanel-header {
      padding: 12px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      font-weight: 600;
      font-size: 13px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      position: sticky;
      top: 38px;
    }
    
    #sidepanel-content {
      flex: 1;
      padding: 12px;
      font-size: 12px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
    }
    
    .sidepanel-section {
      margin-bottom: 16px;
    }
    
    .sidepanel-section-title {
      font-weight: 600;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
    }

    .sidepanel-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }

    .sidepanel-label {
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
    }

    .sidepanel-value {
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
    }

    .sidepanel-empty {
      padding: 8px 0;
      text-align: center;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      font-size: 12px;
    }

    .sidepanel-ports-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .port-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 6px;
      vertical-align: middle;
    }
    
    /* Modal overlay */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }
    
    .modal-overlay.visible {
      display: flex;
    }
    
    .modal-content {
      background: ${EXTENSION_COLORS.PANEL_BG};
      width: 600px;
      max-width: 90%;
      max-height: 80vh;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      overflow: auto;
      display: flex;
      flex-direction: column;
    }

    /* Modal widths per wizard step */
    #newfb-modal .modal-content.wizard-step1 {
      width: 300px;
      max-width: 90%;
    }
    #newfb-modal .modal-content.wizard-step2 {
      width: 900px;
      max-height: 85vh;
    }
    #newfb-modal .modal-content.wizard-step3 {
      width: 900px;
      max-height: 85vh;
    }
    #newfb-modal .modal-content.wizard-step3.wizard-simple {
      width: 450px;
      max-width: 90%;
    }

    /* ====== Wizard step 2: split layout ====== */
    .wizard-step2-layout {
      display: flex;
      gap: 12px;
      flex: 1;
      min-height: 280px;
      max-height: 60vh;
      align-items: stretch;
    }
    .wizard-step2-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 4px;
      padding: 8px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .wizard-step2-canvas canvas {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 4px;
    }
    .wizard-step2-form {
      background: transparent;
    }
    .wizard-step2-editor {
      flex: 1;
      overflow-y: auto;
      padding-right: 4px;
    }
    .wizard-step2-tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .wizard-step2-tab {
      padding: 4px 10px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 12px;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-size: 11px;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .wizard-step2-tab.is-active {
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      border-color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER};
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-weight: 700;
    }
    .wizard-step2-editor-pane {
      display: none;
    }
    .wizard-step2-editor-pane.is-active {
      display: block;
    }
    .wizard-step2-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 10px;
    }
    .wizard-step2-status {
      margin-top: 6px;
      text-align: center;
      font-size: 11px;
    }

    /* ====== Interface editor component ====== */
    .ife-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      align-items: start;
    }
    .ife-column {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ife-column-title {
      font-size: 11px;
      font-weight: 700;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: -2px;
    }
    .ife-panel {
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 4px;
      padding: 8px;
      background: transparent;
    }
    .ife-section {
      margin-bottom: 12px;
    }
    .ife-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .ife-section-title {
      font-weight: 600;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ife-add-btn {
      width: 22px;
      height: 22px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 3px;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ife-add-btn:hover {
      background: ${EXTENSION_COLORS.BORDER_LIGHT};
    }
    .ife-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .ife-state-panel {
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 4px;
      padding: 6px;
      background: transparent;
    }
    .ife-inline-label {
      font-size: 9px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .ife-block-label {
      display: block;
      margin: 4px 0 2px;
      font-size: 9px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .ife-field {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .ife-row {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .ife-row.ife-row-internal {
      flex-wrap: wrap;
      align-items: stretch;
    }
    .ife-row.ife-row-event {
      flex-direction: column;
      align-items: stretch;
      gap: 2px;
    }
    .ife-row.ife-row-transition {
      align-items: flex-end;
      gap: 6px;
    }
    .ife-event-row {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .ife-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-left: 2px;
    }
    .basic-ecc-layout {
      display: flex;
      gap: 12px;
    }
    .basic-ecc-panel {
      flex: 1;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 4px;
      padding: 8px;
      overflow: auto;
    }
    .basic-ecc-panel-states {
      flex: 4;
    }
    .basic-ecc-panel-right {
      flex: 3;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .basic-ecc-panel-transitions {
      flex: 3;
    }
    .basic-ecc-tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .basic-ecc-tab {
      padding: 4px 10px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 12px;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-size: 11px;
      cursor: pointer;
    }
    .basic-ecc-tab.is-active {
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      border-color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER};
      font-weight: 700;
    }
    .basic-ecc-tabpane {
      display: none;
      overflow: auto;
      flex: 1;
      /* Removed unused layout classes */
      /* .basic-ecc-panel-transitions {
        flex: 1;
      }
      .basic-ecc-panel-internal {
        flex: 1;
      } */
    }
    .ife-empty-block {
      border: 1px dashed ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 4px;
      padding: 8px;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
    }
    .ife-with {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
      margin-left: 2px;
    }
    .ife-with-label {
      font-size: 10px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      text-transform: lowercase;
    }
    .ife-chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      min-height: 22px;
    }
    .ife-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 10px;
      font-size: 10px;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-family: monospace;
    }
    .ife-chip-remove {
      border: none;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      cursor: pointer;
      padding: 0;
      font-size: 12px;
      line-height: 1;
    }
    .ife-chip-remove:hover {
      color: #e55;
    }
    .ife-chip-empty {
      font-size: 10px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      display: inline-flex;
      align-items: center;
      height: 22px;
      align-self: center;
    }
    .ife-with-add {
      min-width: 110px;
      padding: 2px 4px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 3px;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      background: transparent;
      font-family: monospace;
    }
    .ife-input {
      flex: 1;
      padding: 4px 6px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 3px;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      background: transparent;
      font-family: monospace;
    }
    .ife-input:focus {
      border-color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER};
      outline: none;
    }
    .ife-textarea {
      width: 100%;
      padding: 6px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 3px;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      background: transparent;
      font-family: monospace;
      resize: vertical;
    }
    .ife-select {
      width: 90px;
      padding: 4px 4px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 3px;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      background: transparent;
    }
    .ife-remove-btn {
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
    }
    .ife-remove-btn:hover {
      color: #e55;
      background: rgba(255, 80, 80, 0.1);
    }
    .ife-add-alg-btn {
      padding: 4px 10px;
      border: 1px dashed ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 12px;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-size: 11px;
      cursor: pointer;
    }
    .ife-add-alg-btn:hover {
      border-color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER};
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
    }
    
    #settings-modal-header,
    #newfb-modal-header {
      padding: 12px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      font-weight: 600;
      font-size: 13px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    #settings-modal-body,
    #newfb-modal-body {
      flex: 1;
      padding: 12px;
      font-size: 12px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      overflow-y: auto;
    }

    /* When wizard is on step 2, body becomes flex-column so layout + buttons share space */
    #newfb-modal-body {
      display: flex;
      flex-direction: column;
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <div class="toolbar-left">
      <button id="createBlockBtn" style="padding:8px 12px; border:1px solid ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER}; background:${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BG}; color:${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_TEXT}; cursor:pointer; border-radius:4px; font-family:Roboto,sans-serif;">* Создать FB</button>
      <button id="addBlockBtn" style="padding:8px 12px; border:1px solid ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER}; background:${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BG}; color:${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_TEXT}; cursor:pointer; border-radius:4px; font-family:Roboto,sans-serif;">+ Добавить FB</button>
    </div>
    <div class="toolbar-center">
      <button id="generateFbootBtn">Создать FBOOT</button>
      <button id="deployBtn">Деплой</button>
    </div>
    <div class="toolbar-right">
      <button id="saveAsBtn">Сохранить как</button>
      <button id="settingsBtn" title="Открыть настройки">⚙ Настройки</button>
    </div>
  </div>
  
  <div id="left-sidepanel">
    <div id="left-sidepanel-header">Библиотека типов</div>
    <div id="left-sidepanel-content">
      <div class="sidepanel-empty">Библиотека закрыта</div>
    </div>
  </div>
  
  <canvas id="canvas"></canvas>
  
  <div id="sidepanel">
    <div id="sidepanel-tabs">
      <button id="tab-devices" class="sidepanel-tab active">Устройства</button>
      <button id="tab-blockinfo" class="sidepanel-tab">Информация о блоке</button>
    </div>
    <div id="sidepanel-header">Устройства</div>
    <div id="sidepanel-content">
      <div class="sidepanel-empty">Нет устройств</div>
    </div>
  </div>
  
  <div id="settings-modal" class="modal-overlay">
    <div class="modal-content">
      <div id="settings-modal-header"></div>
      <div id="settings-modal-body"></div>
    </div>
  </div>

  <div id="newfb-modal" class="modal-overlay">
    <div class="modal-content">
      <div id="newfb-modal-header"></div>
      <div id="newfb-modal-body"></div>
    </div>
  </div>
  
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
}
