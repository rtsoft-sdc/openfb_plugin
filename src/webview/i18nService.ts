import { t, resolveLanguage } from "../shared/i18n";
import type { I18nParams } from "../shared/i18n";
import type { UiLanguage } from "../shared/pluginSettings";

let currentLanguage: UiLanguage = resolveLanguage(
  document.documentElement.dataset.lang,
);

export function tr(key: string, params?: I18nParams): string {
  return t(currentLanguage, key, params);
}

export function getLanguage(): UiLanguage {
  return currentLanguage;
}

export function setLanguage(lang: UiLanguage): void {
  currentLanguage = lang;
}
