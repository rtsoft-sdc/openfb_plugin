import { t } from "./i18n";

export type UiLanguage = "ru" | "en";

export interface DeploySettings {
  host: string;
  port: number;
  timeoutMs: number;
}

export interface PluginSettings {
  fbPaths: string[];
  deploy: DeploySettings;
  uiLanguage: UiLanguage;
}

export const DEFAULT_PLUGIN_SETTINGS: PluginSettings = {
  fbPaths: [],
  deploy: {
    host: "127.0.0.1",
    port: 61499,
    timeoutMs: 30000,
  },
  uiLanguage: "en",
};

/** Deep-clone a PluginSettings object (one-level nesting). */
export function clonePluginSettings(settings: PluginSettings): PluginSettings {
  return {
    ...settings,
    fbPaths: [...settings.fbPaths],
    deploy: { ...settings.deploy },
  };
}

/**
 * Validate PluginSettings fields.
 * Returns sanitised settings on success, or an error string.
 * Pure function — no vscode dependency.
 */
export function validatePluginSettings(
  settings: PluginSettings,
  language?: UiLanguage,
): { settings: PluginSettings; error?: undefined } | { settings?: undefined; error: string } {
  const lang = language ?? settings.uiLanguage;
  const host = settings.deploy.host.trim();
  if (!host) {
    return { error: t(lang, "validation.hostRequired") };
  }

  const port = Math.trunc(settings.deploy.port);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return { error: t(lang, "validation.portRange") };
  }

  const timeoutMs = Math.trunc(settings.deploy.timeoutMs);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
    return { error: t(lang, "validation.timeoutMin") };
  }

  const uniquePaths = new Set<string>();
  const fbPaths: string[] = [];
  for (const pathValue of settings.fbPaths) {
    const normalizedPath = pathValue.trim();
    if (!normalizedPath || uniquePaths.has(normalizedPath)) {
      continue;
    }
    uniquePaths.add(normalizedPath);
    fbPaths.push(normalizedPath);
  }

  return {
    settings: {
      fbPaths,
      deploy: { host, port, timeoutMs },
      uiLanguage: settings.uiLanguage,
    },
  };
}

/** Prepend a locked path to settings.fbPaths, removing duplicates. */
export function applyLockedPath(settings: PluginSettings, lockedPath?: string): PluginSettings {
  if (!lockedPath) return settings;
  const normalized = lockedPath.trim();
  if (!normalized) return settings;
  return {
    ...settings,
    fbPaths: [normalized, ...settings.fbPaths.filter((p) => p !== normalized)],
    deploy: { ...settings.deploy },
  };
}
