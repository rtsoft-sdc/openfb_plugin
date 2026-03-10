import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { DeployAbortedByUserError, OpenFBHandler } from "../deploy/handler";
import { FBootGenerator } from "../generation/fbootGenerator";
import type { WebviewMessage, MessageContext } from "../messageRouter";

function toFileNames(paths: string[]): string[] {
  return paths.map((filePath) => path.basename(filePath));
}

function getExpectedFbootPaths(ctx: MessageContext): string[] {
  if (!ctx.shared.model) return [];

  const sysPath = ctx.uri.fsPath;
  const parsed = path.parse(sysPath);
  const systemName = ctx.shared.model.systemName || parsed.name;
  const deviceNames = ctx.shared.model.devices?.map((d) => d.name) || [];

  return deviceNames.length
    ? deviceNames.map((device: string | undefined) => path.join(parsed.dir, `${systemName}_${device}.fboot`))
    : [path.join(parsed.dir, `${systemName}.fboot`)];
}

async function generateFbootFiles(ctx: MessageContext, showSuccessNotification: boolean): Promise<string[]> {
  const fbGenerator = new FBootGenerator(ctx.shared.model!, ctx.uri.fsPath, ctx.shared.searchPaths);
  const files = await fbGenerator.generate();
  const fileNames = toFileNames(files);
  const message = fileNames.length > 1
    ? `Файлы ${fileNames.join(", ")} созданы`
    : `Файл ${fileNames[0]} создан`;
  ctx.logger.info(message, files);
  if (showSuccessNotification) {
    await vscode.window.showInformationMessage(
      message,
      { modal: true },
      "ОК",
    );
  }
  return files;
}

export function handleDeploy(_m: WebviewMessage, ctx: MessageContext): boolean {
  if (!ctx.shared.model) {
    ctx.logger.error("Cannot deploy: model not loaded yet");
    return true;
  }
  (async () => {
    try {
      const fbootPaths = getExpectedFbootPaths(ctx);
      let missingFiles = fbootPaths.filter((filePath: string) => !fs.existsSync(filePath));

      if (missingFiles.length > 0) {
        const missingNames = toFileNames(missingFiles);
        const promptMsg = `.fboot файл(ы) не найдены: ${missingNames.join(", ")}. Создать сейчас?`;
        const createOption: vscode.MessageItem = { title: "Создать" };
        const cancelOption: vscode.MessageItem = { title: "Отмена", isCloseAffordance: true };
        const choice = await vscode.window.showWarningMessage(
          promptMsg,
          { modal: true },
          createOption,
          cancelOption,
        );

        if (choice?.title !== createOption.title) {
          ctx.logger.info("Deploy cancelled: user declined FBOOT generation");
          return;
        }

        await generateFbootFiles(ctx, true);
        missingFiles = fbootPaths.filter((filePath: string) => !fs.existsSync(filePath));
        if (missingFiles.length > 0) {
          const missingNamesAfterGenerate = toFileNames(missingFiles);
          vscode.window.showErrorMessage(`Не удалось создать .fboot файл(ы): ${missingNamesAfterGenerate.join(", ")}`);
          return;
        }
      }

      ctx.logger.info("Deploy requested", fbootPaths);

      const handler = new OpenFBHandler();
      if (fbootPaths.length > 1) {
        await handler.deployMultiple(fbootPaths);
      } else {
        await handler.deploy(fbootPaths[0]);
      }

      const deployedNames = toFileNames(fbootPaths);
      const message = deployedNames.length > 1
        ? `Деплой завершён: ${deployedNames.join(", ")}`
        : `Деплой завершён: ${deployedNames[0]}`;
      vscode.window.showInformationMessage(message);
    } catch (err) {
      if (err instanceof DeployAbortedByUserError) {
        vscode.window.showInformationMessage(err.message);
        return;
      }
      ctx.logger.error("Deploy failed", err);
      vscode.window.showErrorMessage(`Не удалось выполнить деплой: ${err}`);
    }
  })().catch((err) => {
    ctx.logger.error("Error handling deploy message", err);
    vscode.window.showErrorMessage(`Ошибка при деплое: ${err}`);
  });

  return true;
}

export function handleGenerateFboot(_m: WebviewMessage, ctx: MessageContext): boolean {
  ctx.logger.info("Generate FBOOT requested");
  if (!ctx.shared.model) {
    ctx.logger.error("Cannot generate FBOOT: model not loaded yet");
    return true;
  }

  (async () => {
    try {
      const fbootPaths = getExpectedFbootPaths(ctx);
      const existing = fbootPaths.filter((filePath) => fs.existsSync(filePath));

      if (existing.length > 0) {
        const promptMsg = "Файл .fboot уже существуют в данном проекте. Перезаписать его?";
        const overwriteOption: vscode.MessageItem = { title: "Перезаписать" };
        const cancelOption: vscode.MessageItem = { title: "Отмена", isCloseAffordance: true };
        const choice = await vscode.window.showWarningMessage(
          promptMsg,
          { modal: true },
          overwriteOption,
          cancelOption,
        );

        if (choice?.title !== overwriteOption.title) {
          ctx.logger.info("Generate FBOOT cancelled by user");
          return;
        }
      }

      await generateFbootFiles(ctx, true);
    } catch (err: unknown) {
      const errorMsg = `Не удалось создать FBOOT: ${err}`;
      ctx.logger.error(errorMsg, err);
      vscode.window.showErrorMessage(errorMsg);
    }
  })();

  return true;
}
