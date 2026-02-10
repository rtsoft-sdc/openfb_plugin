import * as vscode from "vscode";

export function setupMessaging(
  panel: vscode.WebviewPanel,
  onMessage: (msg: any) => void
) {
  panel.webview.onDidReceiveMessage(msg => {
    onMessage(msg);
  });
}

export function postMessage(
  panel: vscode.WebviewPanel,
  type: string,
  payload?: any
) {
  panel.webview.postMessage({
    type,
    payload
  });
}