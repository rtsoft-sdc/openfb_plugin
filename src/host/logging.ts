import * as vscode from "vscode";
import { LogLevel, shouldLog, getTimestamp } from "../shared/logLevel";

export type { LogLevel } from "../shared/logLevel";

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = "info";

  constructor(
    name: string,
    outputChannel?: vscode.OutputChannel
  ) {
    this.outputChannel =
      outputChannel || vscode.window.createOutputChannel(name);
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private formatMessage(level: LogLevel, message: string): string {
    return `[${getTimestamp()}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, ...args: unknown[]) {
    if (!shouldLog("debug", this.logLevel)) return;
    const msg = `${message} ${args.map((a) => JSON.stringify(a)).join(" ")}`;
    this.outputChannel.appendLine(this.formatMessage("debug", msg));
  }

  info(message: string, ...args: unknown[]) {
    if (!shouldLog("info", this.logLevel)) return;
    const msg = `${message} ${args.map((a) => JSON.stringify(a)).join(" ")}`;
    this.outputChannel.appendLine(this.formatMessage("info", msg));
  }

  warn(message: string, ...args: unknown[]) {
    if (!shouldLog("warn", this.logLevel)) return;
    const msg = `${message} ${args.map((a) => JSON.stringify(a)).join(" ")}`;
    this.outputChannel.appendLine(this.formatMessage("warn", msg));
  }

  error(message: string, error?: Error | unknown) {
    if (!shouldLog("error", this.logLevel)) return;
    const errorStr =
      error instanceof Error
        ? `${error.message}\n${error.stack}`
        : JSON.stringify(error);
    const msg = `${message}\n${errorStr}`;
    this.outputChannel.appendLine(this.formatMessage("error", msg));
  }

  /**
   * Shows the output channel in VS Code
   */
  show() {
    this.outputChannel.show();
  }

  /**
   * Clears the output channel
   */
  clear() {
    this.outputChannel.clear();
  }

  /**
   * Disposes the output channel
   */
  dispose() {
    this.outputChannel.dispose();
  }
}

// Global logger instance for the extension
let globalLogger: Logger;

export function initializeLogger(outputChannel?: vscode.OutputChannel): Logger {
  globalLogger = new Logger("OpenFB", outputChannel);
  // Set default log level to info (can be increased to debug for development)
  if (process.env.OPENFB_DEBUG === "true") {
    globalLogger.setLogLevel("debug");
  }
  return globalLogger;
}

export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger("OpenFB");
  }
  return globalLogger;
}
