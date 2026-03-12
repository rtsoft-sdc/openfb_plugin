import * as vscode from "vscode";
import { applyLockedPath } from "../../shared/pluginSettings";
import { sanitizeAndValidatePluginSettings, readSettingsFromVsCodeConfig, stripTypeLibraryPaths } from "../settingsManager";
import type { WebviewMessage, MessageContext } from "../messageRouter";
import { buildLoadDiagramMessage } from "../messageRouter";
import { t } from "../../shared/i18n";

export function handleSettingsLoad(ctx: MessageContext): boolean {
  try {
    const settings = readSettingsFromVsCodeConfig();
    const lockedPath = ctx.resolveTypeLibraryPath();
    const nextSettings = applyLockedPath(settings, lockedPath);
    ctx.panel.webview.postMessage({ type: "settings:loaded", payload: { settings: nextSettings, lockedPath } });
  } catch (err) {
    ctx.logger.error("Failed to load plugin settings", err);
    ctx.panel.webview.postMessage({ type: "settings:error", payload: t(readSettingsFromVsCodeConfig().uiLanguage, "settings.loadError") });
  }
  return true;
}

export async function handleSettingsSave(m: WebviewMessage & { type: "settings:save" }, ctx: MessageContext): Promise<boolean> {
  try {
    const { settings, error } = sanitizeAndValidatePluginSettings(m.payload);
    if (!settings) {
      ctx.panel.webview.postMessage({ type: "settings:error", payload: error || t(readSettingsFromVsCodeConfig().uiLanguage, "settings.invalid") });
      return true;
    }

    const lockedPath = ctx.resolveTypeLibraryPath();
    const nextSettings = applyLockedPath(settings, lockedPath);
    const persistedFbPaths = stripTypeLibraryPaths(nextSettings.fbPaths);

    const config = vscode.workspace.getConfiguration("openfb");
    await config.update("fbLibraryPaths", persistedFbPaths, vscode.ConfigurationTarget.Global);
    await config.update("host", nextSettings.deploy.host, vscode.ConfigurationTarget.Global);
    await config.update("port", nextSettings.deploy.port, vscode.ConfigurationTarget.Global);
    await config.update("deployTimeoutMs", nextSettings.deploy.timeoutMs, vscode.ConfigurationTarget.Global);
    await config.update("uiLanguage", nextSettings.uiLanguage, vscode.ConfigurationTarget.Global);

    await ctx.loadDiagramData();
    if (!ctx.shared.model) {
      ctx.logger.error("Model not available after reload");
      ctx.panel.webview.postMessage({ type: "settings:error", payload: t(readSettingsFromVsCodeConfig().uiLanguage, "host.modelLoadError") });
      return true;
    }
    ctx.panel.webview.postMessage({ type: "settings:saved", payload: { settings: nextSettings, lockedPath } });
    ctx.panel.webview.postMessage(buildLoadDiagramMessage(ctx.shared));
  } catch (err) {
    ctx.logger.error("Failed to save plugin settings", err);
    ctx.panel.webview.postMessage({ type: "settings:error", payload: t(readSettingsFromVsCodeConfig().uiLanguage, "settings.saveFailed") });
  }
  return true;
}

export async function handleSettingsPickPath(ctx: MessageContext): Promise<boolean> {
  try {
    const picks = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: t(readSettingsFromVsCodeConfig().uiLanguage, "settings.pickPathLabel"),
      title: t(readSettingsFromVsCodeConfig().uiLanguage, "settings.pickPathTitle"),
      filters: {
        "FBDK Type": ["fbt"],
      },
    });

    if (!picks || picks.length === 0) {
      return true;
    }

    ctx.panel.webview.postMessage({ type: "settings:path-picked", payload: picks[0].fsPath });
  } catch (err) {
    ctx.logger.error("Failed to pick settings path", err);
    ctx.panel.webview.postMessage({ type: "settings:error", payload: t(readSettingsFromVsCodeConfig().uiLanguage, "settings.pickPathError") });
  }
  return true;
}
