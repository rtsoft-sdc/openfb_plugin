import * as vscode from "vscode";
import * as fs from "fs";
import { patchSysFile } from "../parsing/sysPatcher";
import type { WebviewMessage, MessageContext } from "../messageRouter";

export async function handleSaveSys(m: WebviewMessage & { type: "save-sys" }, ctx: MessageContext): Promise<boolean> {
  try {
    const updatedModel = m.model;
    if (!updatedModel) {
      ctx.logger.warn("save-sys: no model in message");
      ctx.panel.webview.postMessage({ type: "save-sys-result", payload: { success: false, error: "Нет данных модели" } });
      return true;
    }

    const nodes: Array<{ id: string; x: number; y: number }> = m.nodes || [];
    const normParams = m.normParams;

    // Ensure all blocks have a mapping entry
    const appName = updatedModel.applicationName || "App";
    if (updatedModel.subAppNetwork?.blocks && updatedModel.devices?.length > 0) {
      const mappings = updatedModel.mappings || [];
      const mappedInstances = new Set(mappings.map((mp) => mp.fbInstance));
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
          ctx.logger.info(`Auto-mapped new block "${qualifiedName}" -> ${defaultDevice}.${defaultResource}`);
        }
      }
      updatedModel.mappings = mappings;
    }

    const xml = patchSysFile(ctx.uri.fsPath, {
      model: updatedModel,
      nodes,
      normParams,
    });

    const defaultUri = vscode.Uri.file(
      ctx.uri.fsPath.replace(/\.sys$/i, "_new.sys")
    );

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { "IEC 61499 System": ["sys"] },
      title: "Сохранить SYS файл как",
    });

    if (!saveUri) {
      ctx.logger.info("Save cancelled by user");
      return true;
    }

    fs.writeFileSync(saveUri.fsPath, xml, "utf8");
    ctx.logger.info("SYS file saved to", saveUri.fsPath);
    vscode.window.showInformationMessage(`Файл сохранён: ${saveUri.fsPath}`);
    ctx.panel.webview.postMessage({ type: "save-sys-result", payload: { success: true, filePath: saveUri.fsPath } });
  } catch (err) {
    ctx.logger.error("Failed to save SYS file", err);
    vscode.window.showErrorMessage(`Не удалось сохранить файл: ${err}`);
    ctx.panel.webview.postMessage({ type: "save-sys-result", payload: { success: false, error: String(err) } });
  }
  return true;
}
