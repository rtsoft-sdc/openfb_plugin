import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { FBTypeRegistry } from "../fbTypeRegistry";
import type { WebviewMessage, MessageContext } from "../messageRouter";
import { readSettingsFromVsCodeConfig } from "../settingsManager";
import { t } from "../../shared/i18n";

export function handleRequestAllFbTypes(ctx: MessageContext): boolean {
  ctx.logger.info("Request for all FB types (library palette)");
  try {
    const newRegistry = new FBTypeRegistry(ctx.shared.searchPaths);
    const tree = newRegistry.scanAllTypes();
    const allFbTypes = newRegistry.getAllTypeModels();
    ctx.logger.info("Sending FB types tree and models", {
      rootNodes: tree.length,
      typeModels: allFbTypes.length,
    });

    ctx.panel.webview.postMessage({
      type: "all-fb-types-loaded",
      fbTypesTree: tree,
      fbTypes: allFbTypes,
    });
  } catch (err) {
    ctx.logger.error("Failed to scan all FB types", err);
    ctx.panel.webview.postMessage({
      type: "all-fb-types-error",
      payload: t(readSettingsFromVsCodeConfig().uiLanguage, "fbType.libraryLoadFailed", { error: String(err) }),
    });
  }
  return true;
}

export async function handleCreateFbType(m: WebviewMessage & { type: "create-fb-type" }, ctx: MessageContext): Promise<boolean> {
  try {
    const fbDef = m.payload as import("../../shared/fbtypes").NewFBTypeDefinition;
    if (!fbDef || !fbDef.name) {
      ctx.panel.webview.postMessage({ type: "create-fb-type-result", payload: { success: false, error: t(readSettingsFromVsCodeConfig().uiLanguage, "fbType.noDefinition") } });
      return true;
    }

    const { serializeNewFBType, getFBTypeFileExtension } = await import("../serialization/fbtSerializer");
    const xml = serializeNewFBType(fbDef);
    const ext = getFBTypeFileExtension(fbDef);

    const sysDir = path.dirname(ctx.uri.fsPath);
    const typeLibDir = path.join(sysDir, "Type Library");
    if (!fs.existsSync(typeLibDir)) {
      fs.mkdirSync(typeLibDir, { recursive: true });
    }

    const targetPath = path.join(typeLibDir, `${fbDef.name}${ext}`);

    if (fs.existsSync(targetPath)) {
      const lang = readSettingsFromVsCodeConfig().uiLanguage;
      const overwriteLabel = t(lang, "common.overwrite");
      const overwrite = await vscode.window.showWarningMessage(
        t(lang, "fbType.fileExists", { fileName: `${fbDef.name}${ext}` }),
        { modal: true },
        overwriteLabel
      );
      if (overwrite !== overwriteLabel) {
        ctx.panel.webview.postMessage({ type: "create-fb-type-result", payload: { success: false, error: t(lang, "fbType.cancelledByUser") } });
        return true;
      }
    }

    fs.writeFileSync(targetPath, xml, "utf8");
    ctx.logger.info("FB type saved", targetPath);
    vscode.window.showInformationMessage(t(readSettingsFromVsCodeConfig().uiLanguage, "fbType.saved", { filePath: targetPath }));
    ctx.panel.webview.postMessage({ type: "create-fb-type-result", payload: { success: true, filePath: targetPath } });
  } catch (err) {
    ctx.logger.error("Failed to create FB type", err);
    vscode.window.showErrorMessage(t(readSettingsFromVsCodeConfig().uiLanguage, "fbType.createFailed") + ": " + String(err));
    ctx.panel.webview.postMessage({ type: "create-fb-type-result", payload: { success: false, error: String(err) } });
  }
  return true;
}
