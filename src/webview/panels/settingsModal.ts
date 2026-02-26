import { renderSettingsPanel, type SettingsPanelState } from "./settingsPanel";
import type { PluginSettings } from "./pluginSettings";

export interface SettingsModalController {
  openModal: () => void;
  closeModal: () => void;
  updateModal: () => void;
}

interface SettingsModalOptions {
  getSettingsPanelState: () => SettingsPanelState;
  onDraftChange: (nextDraft: PluginSettings) => void;
  onDirtyChange: (dirty: boolean) => void;
  onSave: () => void;
  onAddPath: () => void;
}

export function createSettingsModalController(options: SettingsModalOptions): SettingsModalController {
  const modalOverlay = document.getElementById("settings-modal");
  const modalHeader = document.getElementById("settings-modal-header");
  const modalBody = document.getElementById("settings-modal-body");

  function handleEscapeKey(event: KeyboardEvent): void {
    if (event.key === "Escape" && modalOverlay?.classList.contains("visible")) {
      closeModal();
    }
  }

  function openModal(): void {
    if (modalOverlay) {
      modalOverlay.classList.add("visible");
      document.addEventListener("keydown", handleEscapeKey);
    }
    updateModal();
  }

  function closeModal(): void {
    if (modalOverlay) {
      modalOverlay.classList.remove("visible");
      document.removeEventListener("keydown", handleEscapeKey);
    }
  }

  function updateModal(): void {
    if (!modalBody) return;

    renderSettingsPanel(
      modalHeader,
      modalBody,
      options.getSettingsPanelState(),
      {
        onDraftChange: options.onDraftChange,
        onDirtyChange: options.onDirtyChange,
        onCancel: closeModal,
        onSave: options.onSave,
        onAddPath: options.onAddPath,
        rerender: updateModal,
      }
    );
  }

  return {
    openModal,
    closeModal,
    updateModal,
  };
}
