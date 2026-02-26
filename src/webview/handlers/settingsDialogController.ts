import { COLORS } from "../../colorScheme";
import { createSettingsModalController } from "../panels/settingsModal";
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings } from "../../shared/pluginSettings";

interface HostApi {
  postMessage(message: unknown): void;
}

interface SettingsDialogControllerOptions {
  vscode?: HostApi;
}

export interface SettingsDialogController {
  openSettingsModal: () => void;
  updateSettingsModal: () => void;
  closeSettingsModal: () => void;
  setUpdateSidepanel: (fn: () => void) => void;
  getSettingsDraft: () => PluginSettings;
  setSettingsDraft: (next: PluginSettings) => void;
  getIsSettingsLoading: () => boolean;
  setIsSettingsLoading: (next: boolean) => void;
  getIsSettingsSaving: () => boolean;
  setIsSettingsSaving: (next: boolean) => void;
  setSettingsLoadError: (message?: string) => void;
  setSettingsDirty: (dirty: boolean) => void;
  clonePluginSettings: (settings: PluginSettings) => PluginSettings;
  updateSettingsDirtyState: (dirty: boolean) => void;
  setSettingsStatus: (text: string, color: string) => void;
}

export function createSettingsDialogController(
  options: SettingsDialogControllerOptions,
): SettingsDialogController {
  const { vscode } = options;

  let settingsDraft: PluginSettings = {
    ...DEFAULT_PLUGIN_SETTINGS,
    fbPaths: [...DEFAULT_PLUGIN_SETTINGS.fbPaths],
    deploy: { ...DEFAULT_PLUGIN_SETTINGS.deploy },
  };
  let isSettingsLoading = false;
  let settingsLoadError: string | undefined;
  let settingsDirty = false;
  let isSettingsSaving = false;
  let settingsStatusText = "Сохранено";
  let settingsStatusColor: string = COLORS.SUCCESS_TEXT;
  let updateSidepanel = () => {};

  function clonePluginSettings(settings: PluginSettings): PluginSettings {
    return {
      ...settings,
      fbPaths: [...settings.fbPaths],
      deploy: { ...settings.deploy },
    };
  }

  function updateSettingsDirtyState(dirty: boolean): void {
    settingsDirty = dirty;
    if (dirty) {
      settingsStatusText = "Есть несохранённые изменения";
      settingsStatusColor = COLORS.WARNING_TEXT;
    }
  }

  function setSettingsStatus(text: string, color: string): void {
    settingsStatusText = text;
    settingsStatusColor = color;
  }

  function normalizeAndValidateSettingsDraft(draft: PluginSettings): { ok: true; settings: PluginSettings } | { ok: false; error: string } {
    const host = draft.deploy.host.trim();
    if (!host) {
      return { ok: false, error: "Host не должен быть пустым" };
    }

    const port = Math.trunc(draft.deploy.port);
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      return { ok: false, error: "Port должен быть от 1 до 65535" };
    }

    const timeoutMs = Math.trunc(draft.deploy.timeoutMs);
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
      return { ok: false, error: "Timeout должен быть не меньше 1000 мс" };
    }

    const uniquePaths = new Set<string>();
    const fbPaths: string[] = [];
    for (const pathValue of draft.fbPaths) {
      const normalizedPath = pathValue.trim();
      if (!normalizedPath || uniquePaths.has(normalizedPath)) {
        continue;
      }
      uniquePaths.add(normalizedPath);
      fbPaths.push(normalizedPath);
    }

    return {
      ok: true,
      settings: {
        fbPaths,
        deploy: {
          host,
          port,
          timeoutMs,
        },
        uiLanguage: draft.uiLanguage === "en" ? "en" : "ru",
      },
    };
  }

  function saveSettingsDraft(): void {
    if (!vscode || isSettingsSaving) {
      return;
    }

    const validation = normalizeAndValidateSettingsDraft(settingsDraft);
    if (!validation.ok) {
      setSettingsStatus(validation.error, COLORS.ERROR_TEXT);
      updateSidepanel();
      return;
    }

    settingsDraft = clonePluginSettings(validation.settings);
    isSettingsSaving = true;
    setSettingsStatus("Сохранение...", COLORS.STATUS_SAVING);
    updateSidepanel();
    vscode.postMessage({ type: "settings:save", payload: validation.settings });
  }

  function requestSettingsPathPick(): void {
    if (!vscode) {
      setSettingsStatus("Host API недоступен", COLORS.ERROR_TEXT);
      updateSidepanel();
      return;
    }

    vscode.postMessage({ type: "settings:pick-path" });
  }

  const settingsModal = createSettingsModalController({
    getSettingsPanelState: () => ({
      draft: settingsDraft,
      isLoading: isSettingsLoading,
      loadError: settingsLoadError,
      dirty: settingsDirty,
      isSaving: isSettingsSaving,
      statusText: settingsStatusText,
      statusColor: settingsStatusColor,
    }),
    onDraftChange: (nextDraft) => {
      settingsDraft = nextDraft;
    },
    onDirtyChange: updateSettingsDirtyState,
    onSave: saveSettingsDraft,
    onAddPath: requestSettingsPathPick,
  });

  function openSettingsModal(): void {
    isSettingsLoading = true;
    isSettingsSaving = false;
    settingsLoadError = undefined;
    if (!settingsDirty) {
      setSettingsStatus("Сохранено", COLORS.SUCCESS_TEXT);
    }
    if (vscode) {
      vscode.postMessage({ type: "settings:load" });
    } else {
      isSettingsLoading = false;
      settingsLoadError = "Host API недоступен";
    }
    settingsModal.openModal();
  }

  return {
    openSettingsModal,
    updateSettingsModal: () => settingsModal.updateModal(),
    closeSettingsModal: () => settingsModal.closeModal(),
    setUpdateSidepanel: (fn: () => void) => {
      updateSidepanel = fn;
    },
    getSettingsDraft: () => settingsDraft,
    setSettingsDraft: (next: PluginSettings) => {
      settingsDraft = next;
    },
    getIsSettingsLoading: () => isSettingsLoading,
    setIsSettingsLoading: (next: boolean) => {
      isSettingsLoading = next;
    },
    getIsSettingsSaving: () => isSettingsSaving,
    setIsSettingsSaving: (next: boolean) => {
      isSettingsSaving = next;
    },
    setSettingsLoadError: (message?: string) => {
      settingsLoadError = message;
    },
    setSettingsDirty: (dirty: boolean) => {
      settingsDirty = dirty;
    },
    clonePluginSettings,
    updateSettingsDirtyState,
    setSettingsStatus,
  };
}
