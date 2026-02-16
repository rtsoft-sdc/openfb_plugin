import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { OpenFBHandler, setResponsesChannel } from "./openfb/handler";
import { parseSysFile } from "./domain/sysParser";
import { loadFbt } from "./domain/fbtParser";
import { FBTypeRegistry } from "./fbTypeRegistry";
import { initializeLogger, getLogger } from "./logging";

// Store subscriptions for cleanup on deactivation
const extensionSubscriptions: vscode.Disposable[] = [];

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

      const panel = vscode.window.createWebviewPanel(
        "openfbEditor",
        "OpenFB Editor",
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
        //logger.info("Loaded SYS model blocks", model.blocks.map((b) => `${b.id}(${b.type})`));
        //logger.info("Loaded SYS model connections", model.connections.length);

        // Load FBType definitions from .fbt/.sub files
        
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
            //connections: model.connections.length,
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
        messageDisposable = panel.webview.onDidReceiveMessage((m) => {
          try {
            logger.debug("Message from webview", m);
            if (m?.type === "ready") {
              const testJson = JSON.stringify(messageData);
              logger.debug("Message serializable (on ready)", testJson.length, "bytes");
              panel.webview.postMessage(messageData);
              logger.info("Message sent to webview on ready");
              
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
                const fbootPath = path.join(parsed.dir, parsed.name + ".fboot");
                logger.info("Deploy requested", fbootPath);

                if (!fs.existsSync(fbootPath)) {
                  vscode.window.showErrorMessage(`.fboot файл не найден: ${fbootPath}`);
                  return;
                }

                const handler = new OpenFBHandler();
                handler.deploy(fbootPath)
                  .then(() => {
                    vscode.window.showInformationMessage(`Деплой завершён: ${fbootPath}`);
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

              /* const fbGenerator = new FBootGenerator(model, uri.fsPath);
              fbGenerator.generate()
                .then((files) => {
                  const message = `FBOOT создан: ${files.length} файл(ов)`;
                  logger.info(message, files);
                  vscode.window.showInformationMessage(message);
                })
                .catch((err) => {
                  const errorMsg = `Не удалось создать FBOOT: ${err}`;
                  logger.error(errorMsg, err);
                  vscode.window.showErrorMessage(errorMsg);
                });
              return; */
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
      justify-content: center;
      gap: 12px;
      background: #f3f3f3;
      padding: 0 12px;
      border-top: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    #toolbar button {
      padding: 8px 12px;
      border: 1px solid #bbb;
      background: #28a745;
      color: #fff;
      cursor: pointer;
      border-radius: 4px;
      font-family: Roboto, sans-serif;
    }
    #toolbar button:hover { background: #218838; }
    
    /* Canvas - adjusted for left and right panels */
    canvas {
      display: block;
      background: #ffffff;
      position: absolute;
      left: 250px;
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
      background: #ffffff;
      border-right: 1px solid #ddd;
      overflow-y: auto;
      z-index: 500;
      display: flex;
      flex-direction: column;
    }
    
    #left-sidepanel-header {
      padding: 10px;
      border-bottom: 1px solid #eee;
      background: #f3f3f3;
      font-weight: 600;
      font-size: 14px;
      color: #333;
      position: sticky;
      top: 0;
    }
    
    #left-sidepanel-content {
      flex: 1;
      padding: 8px;
      font-size: 13px;
      color: #555;
    }
    
    .device-section {
      margin-bottom: 12px;
      padding: 8px;
      background: #f9f9f9;
      border-radius: 4px;
      border-left: 3px solid #28a745;
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
      color: #333;
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
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px solid #eee;
    }
    
    .device-section-title-collapsible {
      font-weight: 600;
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px solid #eee;
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
      color: #666;
      font-size: 10px;
      min-width: 70px;
    }
    
    .device-conns-container .device-label {
      min-width: auto;
      word-break: break-word;
      font-size: 9px;
    }
    
    .device-value {
      color: #333;
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
      color: #666;
      flex-shrink: 0;
    }
    
    .device-toggle:hover {
      color: #333;
    }
    
    .device-fbs-container {
      padding: 4px 0;
    }
    
    .device-conns-container {
      padding: 4px 0;
    }
    
    .resource-item {
      padding: 1px 0 1px 8px;
      color: #555;
      font-size: 12px;
    }
    
    /* Right sidepanel */
    #sidepanel {
      position: fixed;
      right: 0;
      top: 48px;
      width: 300px;
      height: calc(100vh - 48px);
      background: #ffffff;
      border-left: 1px solid #ddd;
      overflow-y: auto;
      z-index: 500;
      display: flex;
      flex-direction: column;
    }
    
    #sidepanel-header {
      padding: 12px;
      border-bottom: 1px solid #eee;
      background: #f3f3f3;
      font-weight: 600;
      font-size: 13px;
      color: #333;
      position: sticky;
      top: 0;
    }
    
    #sidepanel-content {
      flex: 1;
      padding: 12px;
      font-size: 12px;
      color: #555;
    }
    
    .sidepanel-section {
      margin-bottom: 16px;
    }
    
    .sidepanel-section-title {
      font-weight: 600;
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid #eee;
    }
    
    .sidepanel-item {
      padding: 4px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .sidepanel-label {
      color: #666;
      font-size: 11px;
    }
    
    .sidepanel-value {
      color: #333;
      font-weight: 500;
      word-break: break-word;
      text-align: right;
      flex: 1;
      margin-left: 8px;
    }
    
    .sidepanel-empty {
      color: #999;
      font-style: italic;
      padding: 12px 8px;
      text-align: center;
      font-size: 13px;
    }
    
    .port-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <button id="generateFbootBtn">Создать FBOOT</button>
    <button id="deployBtn">Деплой</button>
  </div>
  
  <div id="left-sidepanel">
    <div id="left-sidepanel-header">Устройства</div>
    <div id="left-sidepanel-content">
      <div class="sidepanel-empty">Нет устройств</div>
    </div>
  </div>
  
  <canvas id="canvas"></canvas>
  
  <div id="sidepanel">
    <div id="sidepanel-header">Информация о блоке</div>
    <div id="sidepanel-content">
      <div class="sidepanel-empty">Выберите блок на диаграмме</div>
    </div>
  </div>
  
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
}
