import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { OpenFBHandler } from "./openfb/handler";
import { parseSysFile } from "./domain/sysParser";
import { FBTypeRegistry } from "./fbTypeRegistry";
import { initializeLogger, getLogger } from "./logging";

// Store subscriptions for cleanup on deactivation
const extensionSubscriptions: vscode.Disposable[] = [];

export function activate(context: vscode.ExtensionContext) {
  const logger = initializeLogger();
  logger.info("OpenFB plugin activated");
  
  const commandDisposable = vscode.commands.registerCommand(
    "openfb.plugin.showSysDiagram",
    async (uri: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage("No SYS file selected");
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
        logger.info("Loading SYS file", uri.fsPath);
        const model = parseSysFile(uri.fsPath);
        logger.info("Loaded SYS model blocks", model.blocks.map((b) => `${b.id}(${b.type})`));
        logger.info("Loaded SYS model connections", model.connections.length);

        // Load FBType definitions from .fbt files
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
          vscode.window.showErrorMessage("File is not in a workspace");
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
        const registry = new FBTypeRegistry(searchPaths);
        registry.scan();
        const allTypes = registry.getAllTypes();
        logger.info("Found FB types", allTypes.map((t) => t.name));

        const fbTypeMap = new Map();
        for (const type of allTypes) {
          const fbModel = registry.getTypeModel(type.name);
          if (fbModel) {
            fbTypeMap.set(type.name, fbModel);
            logger.debug(
              `Type "${type.name}" ports:`,
              fbModel.ports.map((p) => `${p.name}(${p.direction}/${p.kind})`)
            );
          }
        }

        logger.debug(
          "Sending to webview",
          {
            diagramBlocks: model.blocks.length,
            fbTypesCount: fbTypeMap.size,
            connections: model.connections.length,
          }
        );
        
        // Log detailed block info
        logger.debug("Detailed block info");
        for (const block of model.blocks) {
          logger.debug(`Block: ${block.id} (type=${block.type}) at (${block.x}, ${block.y})`);
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
                  vscode.window.showErrorMessage(`.fboot file not found: ${fbootPath}`);
                  return;
                }

                const handler = new OpenFBHandler();
                handler.deploy(fbootPath)
                  .then(() => {
                    vscode.window.showInformationMessage(`Deploy completed: ${fbootPath}`);
                  })
                  .catch((err) => {
                    logger.error("Deploy failed", err);
                    vscode.window.showErrorMessage(`Deploy failed: ${err}`);
                  });
              } catch (err) {
                logger.error("Error handling deploy message", err);
                vscode.window.showErrorMessage(`Error during deploy: ${err}`);
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
            vscode.window.showErrorMessage(`Failed to send to webview: ${error}`);
          }
        }, 1500);

      } catch (error) {
        logger.error("Error loading diagram", error);
        vscode.window.showErrorMessage(`Error: ${error}`);
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
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    canvas { display: block; background: #ffffff; }
    /* Toolbar styles */
    /* Bottom full-width toolbar */
    #toolbar {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 48px;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: #f3f3f3;
      padding: 0 12px;
      border-top: 1px solid #ddd;
      box-shadow: 0 -1px 4px rgba(0,0,0,0.06);
      font-family: sans-serif;
    }
    #toolbar button {
      padding: 8px 12px;
      border: 1px solid #bbb;
      background: #fff;
      cursor: pointer;
      border-radius: 4px;
    }
    #toolbar button:hover { background: #eee; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="toolbar">
    <button id="deployBtn">Деплой</button>
  </div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
}
