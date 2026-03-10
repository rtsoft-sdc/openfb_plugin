import * as vscode from "vscode";
import { getLogger } from "./logging";
import { EXTENSION_COLORS } from "../shared/colorScheme";
import { buildLayoutStyles } from "./webviewStyles/layoutStyles";
import { buildModalStyles } from "./webviewStyles/modalStyles";
import { buildComponentStyles } from "./webviewStyles/componentStyles";

/**
 * Generate the full HTML document for the webview panel.
 * Contains all CSS styles and the skeleton DOM structure.
 */
export function getWebviewHtml(webview: vscode.Webview, extUri: vscode.Uri): string {
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
${buildStyles()}
  </style>
</head>
<body>
${buildBodyHtml(scriptUri)}
</body>
</html>`;
}

function buildStyles(): string {
  return [
    buildLayoutStyles(),
    buildModalStyles(),
    buildComponentStyles(),
  ].join("\n");
}

function buildBodyHtml(scriptUri: vscode.Uri): string {
  return `
  <div id="toolbar">
    <div class="toolbar-left">
      <button id="createBlockBtn" style="padding:8px 12px; border:1px solid ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER}; background:${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BG}; color:${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_TEXT}; cursor:pointer; border-radius:4px; font-family:Roboto,sans-serif;">* Создать FB</button>
      <button id="addBlockBtn" style="padding:8px 12px; border:1px solid ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER}; background:${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BG}; color:${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_TEXT}; cursor:pointer; border-radius:4px; font-family:Roboto,sans-serif;">+ Добавить FB</button>
    </div>
    <div class="toolbar-center">
      <button id="generateFbootBtn">Создать FBOOT</button>
      <button id="deployBtn">Деплой</button>
    </div>
    <div class="toolbar-right">
      <button id="saveAsBtn">Сохранить как</button>
      <button id="settingsBtn" title="Открыть настройки">⚙ Настройки</button>
    </div>
  </div>
  
  <div id="left-sidepanel">
    <div id="left-sidepanel-header">Библиотека типов</div>
    <div id="left-sidepanel-content">
      <div class="sidepanel-empty">Библиотека закрыта</div>
    </div>
  </div>
  
  <canvas id="canvas"></canvas>
  
  <div id="sidepanel">
    <div id="sidepanel-tabs">
      <button id="tab-devices" class="sidepanel-tab active">Устройства</button>
      <button id="tab-blockinfo" class="sidepanel-tab">Информация о блоке</button>
    </div>
    <div id="sidepanel-header">Устройства</div>
    <div id="sidepanel-content">
      <div class="sidepanel-empty">Нет устройств</div>
    </div>
  </div>
  
  <div id="settings-modal" class="modal-overlay">
    <div class="modal-content">
      <div id="settings-modal-header"></div>
      <div id="settings-modal-body"></div>
    </div>
  </div>

  <div id="newfb-modal" class="modal-overlay">
    <div class="modal-content">
      <div id="newfb-modal-header"></div>
      <div id="newfb-modal-body"></div>
    </div>
  </div>
  
  <script type="module" src="${scriptUri}"></script>`;
}
