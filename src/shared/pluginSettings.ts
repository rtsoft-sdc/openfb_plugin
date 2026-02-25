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
  uiLanguage: "ru",
};
