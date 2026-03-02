import { PluginSettings } from "./pluginSettings";
import { COLORS } from "../../colorScheme";

export interface SettingsPanelState {
  draft: PluginSettings;
  isLoading: boolean;
  loadError?: string;
  dirty: boolean;
  isSaving: boolean;
  statusText: string;
  statusColor: string;
  lockedFbPath?: string;
}

export interface SettingsPanelCallbacks {
  onDraftChange: (nextDraft: PluginSettings) => void;
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
  onAddPath: () => void;
  rerender: () => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cloneDraft(draft: PluginSettings): PluginSettings {
  return {
    ...draft,
    fbPaths: [...draft.fbPaths],
    deploy: { ...draft.deploy },
  };
}

export function renderSettingsPanel(
  sidepanelHeader: HTMLElement | null,
  sidepanelContent: HTMLElement,
  panelState: SettingsPanelState,
  callbacks: SettingsPanelCallbacks
): void {
  if (sidepanelHeader) {
    sidepanelHeader.textContent = "Настройки плагина";
  }

  let settingsContentHtml = "";
  if (panelState.isLoading) {
    settingsContentHtml = '<div class="sidepanel-empty">Загрузка настроек...</div>';
  } else if (panelState.loadError) {
    settingsContentHtml = `<div class="sidepanel-empty" style="color:${COLORS.ERROR_TEXT};">${escapeHtml(panelState.loadError)}</div>`;
  } else {
    const lockedPath = panelState.lockedFbPath;
    const fbPathsHtml = panelState.draft.fbPaths.length > 0
      ? `<div style="display:flex; flex-direction:column; gap:6px;">${panelState.draft.fbPaths.map((pathValue, idx) => {
        const isLocked = lockedPath ? pathValue === lockedPath : false;
        const removeBtn = isLocked
          ? `<button class="settings-remove-path-btn" data-index="${idx}" title="Нельзя удалить" style="width:24px; min-width:24px; padding:4px 0; border:1px solid ${COLORS.UI_BORDER}; background:${COLORS.BUTTON_REMOVE_BG}; border-radius:4px; cursor:not-allowed; font-size:11px; opacity:0.5;" disabled>✗</button>`
          : `<button class="settings-remove-path-btn" data-index="${idx}" title="Удалить путь" style="width:24px; min-width:24px; padding:4px 0; border:1px solid ${COLORS.UI_BORDER}; background:${COLORS.BUTTON_REMOVE_BG}; border-radius:4px; cursor:pointer; font-size:11px;">✗</button>`;
        return `
          <div class="settings-fbpath-row" style="display:flex; gap:6px; align-items:center;">
            <span class="settings-fbpath-label" title="${escapeHtml(pathValue)}" style="flex:1; min-width:0; margin:0; padding:0; border:none; background:transparent; font-size:12px; color:${COLORS.INPUT_TEXT}; line-height:1.35; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(pathValue)}</span>
            ${removeBtn}
          </div>
        `;
      }).join("")}</div>`
      : '<div class="sidepanel-empty">Список путей пуст</div>';

    settingsContentHtml = `
      <div class="sidepanel-section">
        <div class="sidepanel-section-title" style="color:${COLORS.TEXT_PRIMARY}; font-weight:700;">FB Paths</div>
        <div class="sidepanel-item" style="display:block; padding-top:0;">
          <div class="sidepanel-label" style="margin-bottom:6px; color:${COLORS.TEXT_MUTED};">Paths search libraries FB</div>
        </div>
        ${fbPathsHtml}
        <div class="sidepanel-item" style="padding-top:8px; display:flex; justify-content:center;">
          <button id="settingsAddPathBtn" style="margin:0; padding:0; border:none; background:transparent; color:${COLORS.LINK_TEXT}; cursor:pointer; text-decoration:underline; font-size:12px; font-family:inherit;">+ Добавить путь</button>
        </div>
      </div>
      <div class="sidepanel-section">
        <div class="sidepanel-section-title" style="color:${COLORS.TEXT_PRIMARY}; font-weight:700;">Deploy</div>
        <div style="display:flex; gap:8px; align-items:flex-end;">
          <div style="flex:1; display:flex; flex-direction:column;">
            <div class="sidepanel-label" style="margin-bottom:4px; color:${COLORS.TEXT_MUTED};">Host</div>
            <input id="settingsHostInput" value="${escapeHtml(panelState.draft.deploy.host)}" style="width:100%; padding:6px 8px; border:1px solid ${COLORS.INPUT_BORDER}; border-radius:4px; font-size:12px; color:${COLORS.INPUT_TEXT};" />
          </div>
          <div style="flex:0.6; display:flex; flex-direction:column;">
            <div class="sidepanel-label" style="margin-bottom:4px; color:${COLORS.TEXT_MUTED};">Port</div>
            <input id="settingsPortInput" type="number" min="1" max="65535" value="${panelState.draft.deploy.port}" style="width:100%; padding:6px 8px; border:1px solid ${COLORS.INPUT_BORDER}; border-radius:4px; font-size:12px; color:${COLORS.INPUT_TEXT};" />
          </div>
          <div style="flex:0.8; display:flex; flex-direction:column;">
            <div class="sidepanel-label" style="margin-bottom:4px; color:${COLORS.TEXT_MUTED};">Timeout (ms)</div>
            <input id="settingsTimeoutInput" type="number" min="1000" step="1000" value="${panelState.draft.deploy.timeoutMs}" style="width:100%; padding:6px 8px; border:1px solid ${COLORS.INPUT_BORDER}; border-radius:4px; font-size:12px; color:${COLORS.INPUT_TEXT};" />
          </div>
        </div>
      </div>
      <div class="sidepanel-section">
        <div class="sidepanel-section-title" style="color:${COLORS.TEXT_PRIMARY}; font-weight:700;">Language</div>
        <div class="sidepanel-item" style="display:block;">
          <select id="settingsLangSelect" style="width:100%; padding:6px 8px; border:1px solid ${COLORS.INPUT_BORDER}; border-radius:4px; font-size:12px; color:${COLORS.INPUT_TEXT};">
            <option value="ru" ${panelState.draft.uiLanguage === "ru" ? "selected" : ""}>Русский</option>
            <option value="en" ${panelState.draft.uiLanguage === "en" ? "selected" : ""}>English</option>
          </select>
        </div>
      </div>
    `;
  }

  sidepanelContent.innerHTML = `${settingsContentHtml}
    <div class="sidepanel-section" style="display:flex; justify-content:center; gap:12px; margin-top:16px;">
      <button id="settingsSaveBtn" ${!panelState.dirty || panelState.isSaving ? "disabled" : ""} style="min-width:120px; padding:8px 16px; border:1px solid ${COLORS.SUCCESS_TEXT}; border-radius:4px; background:${!panelState.dirty || panelState.isSaving ? COLORS.BUTTON_DISABLED_BG : COLORS.BUTTON_PRIMARY_BG}; color:${COLORS.BUTTON_TEXT_WHITE}; cursor:${!panelState.dirty || panelState.isSaving ? "not-allowed" : "pointer"}; font-weight: 500; font-size:13px;">${panelState.isSaving ? "Сохранение..." : "Сохранить"}</button>
      <button id="settingsCancelBtn" ${panelState.isSaving ? "disabled" : ""} style="min-width:120px; padding:8px 16px; border:1px solid ${COLORS.UI_BORDER}; border-radius:4px; background:${COLORS.BUTTON_SECONDARY_BG}; cursor:${panelState.isSaving ? "not-allowed" : "pointer"}; font-size:13px;">Отмена</button>
    </div>
    <div class="sidepanel-section">
      <div id="settingsStatus" class="sidepanel-label" style="margin-top:8px; color:${panelState.statusColor}; text-align:center;">${escapeHtml(panelState.statusText)}</div>
    </div>`;

  const removeButtons = sidepanelContent.querySelectorAll<HTMLButtonElement>(".settings-remove-path-btn");
  removeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      if (!Number.isFinite(idx) || idx < 0 || idx >= panelState.draft.fbPaths.length) {
        return;
      }

      if (panelState.lockedFbPath && panelState.draft.fbPaths[idx] === panelState.lockedFbPath) {
        return;
      }

      const nextDraft = cloneDraft(panelState.draft);
      nextDraft.fbPaths.splice(idx, 1);
      callbacks.onDraftChange(nextDraft);
      callbacks.onDirtyChange(true);
      callbacks.rerender();
    });
  });

  const addPathBtn = sidepanelContent.querySelector<HTMLButtonElement>("#settingsAddPathBtn");
  if (addPathBtn) {
    addPathBtn.addEventListener("click", () => {
      callbacks.onAddPath();
    });
  }

  const hostInput = sidepanelContent.querySelector<HTMLInputElement>("#settingsHostInput");
  if (hostInput) {
    hostInput.addEventListener("input", () => {
      const nextDraft = cloneDraft(panelState.draft);
      nextDraft.deploy.host = hostInput.value;
      callbacks.onDraftChange(nextDraft);
      callbacks.onDirtyChange(true);
      callbacks.rerender();
    });
  }

  const portInput = sidepanelContent.querySelector<HTMLInputElement>("#settingsPortInput");
  if (portInput) {
    portInput.addEventListener("input", () => {
      const nextDraft = cloneDraft(panelState.draft);
      nextDraft.deploy.port = Number(portInput.value);
      callbacks.onDraftChange(nextDraft);
      callbacks.onDirtyChange(true);
      callbacks.rerender();
    });
  }

  const timeoutInput = sidepanelContent.querySelector<HTMLInputElement>("#settingsTimeoutInput");
  if (timeoutInput) {
    timeoutInput.addEventListener("input", () => {
      const nextDraft = cloneDraft(panelState.draft);
      nextDraft.deploy.timeoutMs = Number(timeoutInput.value);
      callbacks.onDraftChange(nextDraft);
      callbacks.onDirtyChange(true);
      callbacks.rerender();
    });
  }

  const langSelect = sidepanelContent.querySelector<HTMLSelectElement>("#settingsLangSelect");
  if (langSelect) {
    langSelect.addEventListener("change", () => {
      const nextDraft = cloneDraft(panelState.draft);
      nextDraft.uiLanguage = langSelect.value === "en" ? "en" : "ru";
      callbacks.onDraftChange(nextDraft);
      callbacks.onDirtyChange(true);
      callbacks.rerender();
    });
  }

  const saveBtn = sidepanelContent.querySelector<HTMLButtonElement>("#settingsSaveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (!panelState.dirty || panelState.isSaving) return;
      callbacks.onSave();
    });
  }

  const cancelBtn = sidepanelContent.querySelector<HTMLButtonElement>("#settingsCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (panelState.isSaving) return;
      callbacks.onCancel();
    });
  }
}
