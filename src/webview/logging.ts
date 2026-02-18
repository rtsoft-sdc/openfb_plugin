import { COLOR_SCHEME } from "../colorScheme";

export type LogLevel = "debug" | "info" | "warn" | "error";

export class WebviewLogger {
  private logLevel: LogLevel = "info";

  constructor(private name: string) {}

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private getTimestamp(): string {
    return new Date().toISOString().split("T")[1].slice(0, 12);
  }

  private formatMessage(level: LogLevel, message: string): string {
    return `%c[${this.getTimestamp()}] [${this.name}] [${level.toUpperCase()}]%c ${message}`;
  }

  private getColorStyle(level: LogLevel): string[] {
    switch (level) {
      case "debug":
        return [`color: ${COLOR_SCHEME.UI.LOG_DEBUG}; font-weight: bold;`, `color: ${COLOR_SCHEME.UI.LOG_DEBUG};`];
      case "info":
        return [`color: ${COLOR_SCHEME.UI.LOG_INFO}; font-weight: bold;`, `color: ${COLOR_SCHEME.UI.LOG_INFO};`];
      case "warn":
        return [`color: ${COLOR_SCHEME.UI.LOG_WARN}; font-weight: bold;`, `color: ${COLOR_SCHEME.UI.LOG_WARN};`];
      case "error":
        return [`color: ${COLOR_SCHEME.UI.LOG_ERROR}; font-weight: bold;`, `color: ${COLOR_SCHEME.UI.LOG_ERROR};`];
      default:
        return ["", ""];
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  debug(message: string, ...args: any[]) {
    if (!this.shouldLog("debug")) return;
    const [style1, style2] = this.getColorStyle("debug");
    const msg = this.formatMessage("debug", message);
    console.log(msg, style1, style2, ...args);
  }

  info(message: string, ...args: any[]) {
    if (!this.shouldLog("info")) return;
    const [style1, style2] = this.getColorStyle("info");
    const msg = this.formatMessage("info", message);
    console.log(msg, style1, style2, ...args);
  }

  warn(message: string, ...args: any[]) {
    if (!this.shouldLog("warn")) return;
    const [style1, style2] = this.getColorStyle("warn");
    const msg = this.formatMessage("warn", message);
    console.warn(msg, style1, style2, ...args);
  }

  error(message: string, error?: Error | any) {
    if (!this.shouldLog("error")) return;
    const [style1, style2] = this.getColorStyle("error");
    const msg = this.formatMessage("error", message);
    if (error instanceof Error) {
      console.error(msg, style1, style2, error.message, error.stack);
    } else {
      console.error(msg, style1, style2, error);
    }
  }
}

// Global logger instance for webview
let globalLogger: WebviewLogger;

export function initializeWebviewLogger(): WebviewLogger {
  globalLogger = new WebviewLogger("OpenFB Webview");
  // Set default log level to info (can be increased to debug for development)
  if ((window as any).OPENFB_DEBUG === true) {
    globalLogger.setLogLevel("debug");
  }
  return globalLogger;
}

export function getWebviewLogger(): WebviewLogger {
  if (!globalLogger) {
    globalLogger = new WebviewLogger("OpenFB Webview");
  }
  return globalLogger;
}
