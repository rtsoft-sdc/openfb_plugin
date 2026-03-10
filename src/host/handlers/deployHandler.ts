import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { DeployAbortedByUserError, OpenFBHandler } from "../deploy/handler";
import { FBootGenerator } from "../generation/fbootGenerator";
import type { WebviewMessage, MessageContext } from "../messageRouter";

export function handleDeploy(_m: WebviewMessage, ctx: MessageContext): boolean {
  if (!ctx.shared.model) {
    ctx.logger.error("Cannot deploy: model not loaded yet");
    return true;
  }
  try {
    const sysPath = ctx.uri.fsPath;
    const parsed = path.parse(sysPath);
    const systemName = ctx.shared.model.systemName || parsed.name;
    const deviceNames = ctx.shared.model.devices?.map((d) => d.name) || [];

    const fbootPaths = deviceNames.length
      ? deviceNames.map((device: string | undefined) => path.join(parsed.dir, `${systemName}_${device}.fboot`))
      : [path.join(parsed.dir, `${systemName}.fboot`)];

    const missingFiles = fbootPaths.filter((filePath: string) => !fs.existsSync(filePath));
    if (missingFiles.length > 0) {
      vscode.window.showErrorMessage(`.fboot файл(ы) не найдены: ${missingFiles.join(", ")}`);
      return true;
    }

    ctx.logger.info("Deploy requested", fbootPaths);

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
        if (err instanceof DeployAbortedByUserError) {
          vscode.window.showInformationMessage(err.message);
          return;
        }
        ctx.logger.error("Deploy failed", err);
        vscode.window.showErrorMessage(`Не удалось выполнить деплой: ${err}`);
      });
  } catch (err) {
    ctx.logger.error("Error handling deploy message", err);
    vscode.window.showErrorMessage(`Ошибка при деплое: ${err}`);
  }
  return true;
}

export function handleGenerateFboot(_m: WebviewMessage, ctx: MessageContext): boolean {
  ctx.logger.info("Generate FBOOT requested");
  if (!ctx.shared.model) {
    ctx.logger.error("Cannot generate FBOOT: model not loaded yet");
    return true;
  }

  const fbGenerator = new FBootGenerator(ctx.shared.model, ctx.uri.fsPath, ctx.shared.searchPaths);
  fbGenerator.generate()
    .then((files: string[]) => {
      const message = `FBOOT создан: ${files.length} файл(ов)`;
      ctx.logger.info(message, files);
      vscode.window.showInformationMessage(message);
    })
    .catch((err: unknown) => {
      const errorMsg = `Не удалось создать FBOOT: ${err}`;
      ctx.logger.error(errorMsg, err);
      vscode.window.showErrorMessage(errorMsg);
    });
  return true;
}
