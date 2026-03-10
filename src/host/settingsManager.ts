import * as vscode from "vscode";
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings, UiLanguage, validatePluginSettings } from "../shared/pluginSettings";

function isTypeLibraryPath(pathValue: string): boolean {
  const normalized = pathValue.replace(/[\\/]+$/, "").toLowerCase();
  return normalized.endsWith("type library");
}

export function stripTypeLibraryPaths(paths: string[]): string[] {
  return paths.filter((pathValue) => !isTypeLibraryPath(pathValue.trim()));
}

export function isUiLanguage(value: unknown): value is UiLanguage {
  return value === "ru" || value === "en";
}

export function mergePluginSettings(raw: unknown): PluginSettings {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_PLUGIN_SETTINGS;
  }

  const candidate = raw as Partial<PluginSettings>;
  const fbPaths = Array.isArray(candidate.fbPaths)
    ? candidate.fbPaths.filter((pathValue): pathValue is string => typeof pathValue === "string")
    : DEFAULT_PLUGIN_SETTINGS.fbPaths;

  const deployCandidate = candidate.deploy;
  const deploy = {
    ...DEFAULT_PLUGIN_SETTINGS.deploy,
    ...(deployCandidate && typeof deployCandidate === "object" ? deployCandidate : {}),
  };

  return {
    fbPaths,
    deploy: {
      host: typeof deploy.host === "string" ? deploy.host : DEFAULT_PLUGIN_SETTINGS.deploy.host,
      port: typeof deploy.port === "number" ? deploy.port : DEFAULT_PLUGIN_SETTINGS.deploy.port,
      timeoutMs: typeof deploy.timeoutMs === "number" ? deploy.timeoutMs : DEFAULT_PLUGIN_SETTINGS.deploy.timeoutMs,
    },
    uiLanguage: isUiLanguage(candidate.uiLanguage) ? candidate.uiLanguage : DEFAULT_PLUGIN_SETTINGS.uiLanguage,
  };
}

export function sanitizeAndValidatePluginSettings(raw: unknown): { settings?: PluginSettings; error?: string } {
  const merged = mergePluginSettings(raw);
  return validatePluginSettings(merged);
}

export function readSettingsFromVsCodeConfig(): PluginSettings {
  const config = vscode.workspace.getConfiguration("openfb");

  const fbPaths = config.get<string[]>("fbLibraryPaths");
  const host = config.get<string>("host");
  const port = config.get<number>("port");
  const timeoutMs = config.get<number>("deployTimeoutMs");
  const uiLanguage = config.get<string>("uiLanguage");

  const normalizedFbPaths = Array.isArray(fbPaths)
    ? fbPaths.filter((pathValue): pathValue is string => typeof pathValue === "string")
    : DEFAULT_PLUGIN_SETTINGS.fbPaths;

  return {
    // Type Library should be resolved per-opened .sys, not stored globally.
    fbPaths: stripTypeLibraryPaths(normalizedFbPaths),
    deploy: {
      host: typeof host === "string" ? host : DEFAULT_PLUGIN_SETTINGS.deploy.host,
      port: typeof port === "number" ? port : DEFAULT_PLUGIN_SETTINGS.deploy.port,
      timeoutMs: typeof timeoutMs === "number" ? timeoutMs : DEFAULT_PLUGIN_SETTINGS.deploy.timeoutMs,
    },
    uiLanguage: isUiLanguage(uiLanguage) ? uiLanguage : DEFAULT_PLUGIN_SETTINGS.uiLanguage,
  };
}
