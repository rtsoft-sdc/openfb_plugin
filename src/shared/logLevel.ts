/** Log-level strings shared between host and webview loggers. */
export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"] as const;

/** Returns true when `level` should be emitted given the current `threshold`. */
export function shouldLog(level: LogLevel, threshold: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(threshold);
}

/** ISO-style HH:MM:SS.sss timestamp fragment. */
export function getTimestamp(): string {
  return new Date().toISOString().split("T")[1].slice(0, 12);
}
