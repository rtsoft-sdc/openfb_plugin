import { COLORS } from "../../shared/colorScheme";
import { createSettingsModalController } from "../panels/settingsModal";
import {
  DEFAULT_PLUGIN_SETTINGS,
  PluginSettings,
  clonePluginSettings,
  validatePluginSettings,
  applyLockedPath as applyLockedPathToSettings,
} from "../../shared/pluginSettings";
import { tr } from "../i18nService";

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
  setLockedFbPath: (pathValue?: string) => void;
  getLockedFbPath: () => string | undefined;
  getSettingsDraft: () => PluginSettings;
  setSettingsDraft: (next: PluginSettings) => void;
  getIsSettingsLoading: () => boolean;
  setIsSettingsLoading: (next: boolean) => void;
  getIsSettingsSaving: () => boolean;
  setIsSettingsSaving: (next: boolean) => void;
  setSettingsLoadError: (message?: string) => void;
  setSettingsDirty: (dirty: boolean) => void;
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
  let settingsStatusText = tr("settings.saved");
  let settingsStatusColor: string = COLORS.SUCCESS_TEXT;
  let updateSidepanel = () => {};
  let lockedFbPath: string | undefined;

  function normalizeAndValidateSettingsDraft(draft: PluginSettings): { ok: true; settings: PluginSettings } | { ok: false; error: string } {
    const result = validatePluginSettings(draft);
    if (result.error !== undefined) {
      return { ok: false, error: result.error };
    }
    const settings = applyLockedPathToSettings(result.settings, lockedFbPath);
    return { ok: true, settings };
  }

  function updateSettingsDirtyState(dirty: boolean): void {
    settingsDirty = dirty;
    if (dirty) {
      settingsStatusText = tr("settings.unsavedChanges");
      settingsStatusColor = COLORS.WARNING_TEXT;
    }
  }

  function setSettingsStatus(text: string, color: string): void {
    settingsStatusText = text;
    settingsStatusColor = color;
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
    setSettingsStatus(tr("settings.saving"), COLORS.STATUS_SAVING);
    updateSidepanel();
    vscode.postMessage({ type: "settings:save", payload: validation.settings });
  }

  function requestSettingsPathPick(): void {
    if (!vscode) {
      setSettingsStatus(tr("settings.hostApiUnavailable"), COLORS.ERROR_TEXT);
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
      lockedFbPath,
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
      setSettingsStatus(tr("settings.saved"), COLORS.SUCCESS_TEXT);
    }
    if (vscode) {
      vscode.postMessage({ type: "settings:load" });
    } else {
      isSettingsLoading = false;
      settingsLoadError = tr("settings.hostApiUnavailable");
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
    setLockedFbPath: (pathValue?: string) => {
      lockedFbPath = pathValue && pathValue.trim() ? pathValue.trim() : undefined;
    },
    getLockedFbPath: () => lockedFbPath,
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
    updateSettingsDirtyState,
    setSettingsStatus,
  };
}
