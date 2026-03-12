import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { DeployAbortedByUserError, OpenFBHandler } from "../deploy/handler";
import { FBootGenerator } from "../generation/fbootGenerator";
import type { WebviewMessage, MessageContext } from "../messageRouter";
import { readSettingsFromVsCodeConfig } from "../settingsManager";
import { t } from "../../shared/i18n";

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
  const lang = readSettingsFromVsCodeConfig().uiLanguage;
  const fileNames = toFileNames(files);
  const message = fileNames.length > 1
    ? t(lang, "deploy.createdMany", { names: fileNames.join(", ") })
    : t(lang, "deploy.createdOne", { name: fileNames[0] });
  ctx.logger.info(message, files);
  if (showSuccessNotification) {
    await vscode.window.showInformationMessage(
      message,
      { modal: true },
      t(lang, "common.ok"),
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
        const lang = readSettingsFromVsCodeConfig().uiLanguage;
        const missingNames = toFileNames(missingFiles);
        const promptMsg = t(lang, "deploy.missingPrompt", { names: missingNames.join(", ") });
        const createOption: vscode.MessageItem = { title: t(lang, "common.create") };
        const cancelOption: vscode.MessageItem = { title: t(lang, "common.cancel"), isCloseAffordance: true };
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
          vscode.window.showErrorMessage(t(lang, "deploy.missingAfterGenerate", { names: missingNamesAfterGenerate.join(", ") }));
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
      const dLang = readSettingsFromVsCodeConfig().uiLanguage;
      const message = deployedNames.length > 1
        ? t(dLang, "deploy.completedMany", { names: deployedNames.join(", ") })
        : t(dLang, "deploy.completedOne", { name: deployedNames[0] });
      vscode.window.showInformationMessage(message);
    } catch (err) {
      if (err instanceof DeployAbortedByUserError) {
        vscode.window.showInformationMessage(err.message);
        return;
      }
      ctx.logger.error("Deploy failed", err);
      vscode.window.showErrorMessage(t(readSettingsFromVsCodeConfig().uiLanguage, "deploy.failed", { error: String(err) }));
    }
  })().catch((err) => {
    ctx.logger.error("Error handling deploy message", err);
    vscode.window.showErrorMessage(t(readSettingsFromVsCodeConfig().uiLanguage, "deploy.error", { error: String(err) }));
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
        const gLang = readSettingsFromVsCodeConfig().uiLanguage;
        const promptMsg = t(gLang, "deploy.overwritePrompt");
        const overwriteOption: vscode.MessageItem = { title: t(gLang, "common.overwrite") };
        const cancelOption: vscode.MessageItem = { title: t(gLang, "common.cancel"), isCloseAffordance: true };
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
      const errorMsg = t(readSettingsFromVsCodeConfig().uiLanguage, "deploy.generateFailed", { error: String(err) });
      ctx.logger.error(errorMsg, err);
      vscode.window.showErrorMessage(errorMsg);
    }
  })();

  return true;
}
