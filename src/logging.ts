import * as vscode from "vscode";

export type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = "info";

  constructor(
    private name: string,
    outputChannel?: vscode.OutputChannel
  ) {
    this.outputChannel =
      outputChannel || vscode.window.createOutputChannel(name);
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private getTimestamp(): string {
    return new Date().toISOString().split("T")[1].slice(0, 12);
  }

  private formatMessage(level: LogLevel, message: string): string {
    return `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  debug(message: string, ...args: any[]) {
    if (!this.shouldLog("debug")) return;
    const msg = `${message} ${args.map((a) => JSON.stringify(a)).join(" ")}`;
    this.outputChannel.appendLine(this.formatMessage("debug", msg));
  }

  info(message: string, ...args: any[]) {
    if (!this.shouldLog("info")) return;
    const msg = `${message} ${args.map((a) => JSON.stringify(a)).join(" ")}`;
    this.outputChannel.appendLine(this.formatMessage("info", msg));
  }

  warn(message: string, ...args: any[]) {
    if (!this.shouldLog("warn")) return;
    const msg = `${message} ${args.map((a) => JSON.stringify(a)).join(" ")}`;
    this.outputChannel.appendLine(this.formatMessage("warn", msg));
  }

  error(message: string, error?: Error | any) {
    if (!this.shouldLog("error")) return;
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
