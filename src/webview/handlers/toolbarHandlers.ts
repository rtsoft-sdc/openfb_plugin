import type { WebviewLogger } from "../logging";

interface HostApi {
  postMessage(message: unknown): void;
}

interface ToolbarHandlersDeps {
  logger: WebviewLogger;
  vscode?: HostApi;
  openSettingsPanel: () => void;
  openPalettePanel: () => void;
  getSaveData: () => { model: any; nodes: any[]; normParams: any } | undefined;
}

export function setupToolbarHandlers(deps: ToolbarHandlersDeps): void {
  const { logger, vscode, openSettingsPanel, openPalettePanel, getSaveData } = deps;

  const deployBtn = document.getElementById("deployBtn") as HTMLButtonElement | null;
  if (deployBtn) {
    deployBtn.addEventListener("click", () => {
      logger.debug("Deploy button clicked");
      try {
        if (vscode) {
          vscode.postMessage({ type: "deploy" });
        } else {
          logger.warn("vscode.postMessage not available for deploy");
        }
      } catch (err) {
        logger.error("Failed to post deploy message", err);
      }
    });
  } else {
    logger.warn("Deploy button not found in DOM");
  }

  const generateFbootBtn = document.getElementById("generateFbootBtn") as HTMLButtonElement | null;
  if (generateFbootBtn) {
    generateFbootBtn.addEventListener("click", () => {
      logger.debug("generateFbootBtn button clicked");
      try {
        if (vscode) {
          vscode.postMessage({ type: "generateFboot" });
        } else {
          logger.warn("vscode.postMessage not available for deploy");
        }
      } catch (err) {
        logger.error("Failed to post generateFboot message", err);
      }
    });
  } else {
    logger.warn("generateFboot button not found in DOM");
  }

  const settingsBtn = document.getElementById("settingsBtn") as HTMLButtonElement | null;
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      logger.debug("settingsBtn button clicked");
      openSettingsPanel();
    });
  } else {
    logger.warn("settings button not found in DOM");
  }

  const addBlockBtn = document.getElementById("addBlockBtn") as HTMLButtonElement | null;
  if (addBlockBtn) {
    addBlockBtn.addEventListener("click", () => {
      logger.debug("addBlockBtn button clicked");
      openPalettePanel();
    });
  } else {
    logger.warn("addBlockBtn button not found in DOM");
  }

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
