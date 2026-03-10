import type { WebviewLogger } from "../logging";

interface HostApi {
  postMessage(message: unknown): void;
}

interface ToolbarHandlersDeps {
  logger: WebviewLogger;
  vscode?: HostApi;
  openSettingsPanel: () => void;
  openNewFBDialog: () => void;
  openPalettePanel: () => void;
  getSaveData: () => { model: any; nodes: any[]; normParams: any } | undefined;
}

export function setupToolbarHandlers(deps: ToolbarHandlersDeps): void {
  const { logger, vscode, openSettingsPanel, openNewFBDialog, openPalettePanel, getSaveData } = deps;

  /** Bind a button to post a simple message to the extension host. */
  function bindMessageButton(id: string, messageType: string): void {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (!btn) { logger.warn(`${id} not found in DOM`); return; }
    btn.addEventListener("click", () => {
      logger.debug(`${id} clicked`);
      try {
        if (vscode) {
          vscode.postMessage({ type: messageType });
        } else {
          logger.warn(`vscode.postMessage not available for ${messageType}`);
        }
      } catch (err) {
        logger.error(`Failed to post ${messageType} message`, err);
      }
    });
  }

  /** Bind a button to a simple callback. */
  function bindCallbackButton(id: string, callback: () => void): void {
    const btn = document.getElementById(id) as HTMLButtonElement | null;
    if (!btn) { logger.warn(`${id} not found in DOM`); return; }
    btn.addEventListener("click", () => {
      logger.debug(`${id} clicked`);
      callback();
    });
  }

  bindMessageButton("deployBtn", "deploy");
  bindMessageButton("generateFbootBtn", "generateFboot");
  bindCallbackButton("settingsBtn", openSettingsPanel);
  bindCallbackButton("createBlockBtn", openNewFBDialog);
  bindCallbackButton("addBlockBtn", openPalettePanel);

  const saveAsBtn = document.getElementById("saveAsBtn") as HTMLButtonElement | null;
  if (saveAsBtn) {
    saveAsBtn.addEventListener("click", () => {
      logger.debug("Save As button clicked");
      try {
        if (vscode) {
          const saveData = getSaveData();
          if (!saveData) {
            logger.warn("No model available for saving");
            return;
          }
          vscode.postMessage({
            type: "save-sys",
            model: saveData.model,
            nodes: saveData.nodes,
            normParams: saveData.normParams,
          });
        } else {
          logger.warn("vscode.postMessage not available for save");
        }
      } catch (err) {
        logger.error("Failed to post save-sys message", err);
      }
    });
  } else {
    logger.warn("saveAsBtn button not found in DOM");
  }
}
