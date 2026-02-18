import { PluginSettings } from "./pluginSettings";

export interface SettingsPanelState {
  draft: PluginSettings;
  isLoading: boolean;
  loadError?: string;
  dirty: boolean;
  isSaving: boolean;
  statusText: string;
  statusColor: string;
}

export interface SettingsPanelCallbacks {
  onDraftChange: (nextDraft: PluginSettings) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBack: () => void;
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
    settingsContentHtml = `<div class="sidepanel-empty" style="color:#b00020;">${escapeHtml(panelState.loadError)}</div>`;
  } else {
    const fbPathsHtml = panelState.draft.fbPaths.length > 0
      ? `<div style="display:flex; flex-direction:column; gap:6px;">${panelState.draft.fbPaths.map((pathValue, idx) => `
          <div class="settings-fbpath-row" style="display:flex; gap:6px; align-items:center;">
            <span class="settings-fbpath-label" title="${escapeHtml(pathValue)}" style="flex:1; min-width:0; margin:0; padding:0; border:none; background:transparent; font-size:12px; color:#6f6f6f; line-height:1.35; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(pathValue)}</span>
            <button class="settings-remove-path-btn" data-index="${idx}" title="Удалить путь" style="width:24px; min-width:24px; padding:4px 0; border:1px solid #bbb; background:#f7f7f7; border-radius:4px; cursor:pointer; font-size:11px;">✕</button>
          </div>
        `).join("")}</div>`
      : '<div class="sidepanel-empty">Список путей пуст</div>';

    settingsContentHtml = `
      <div class="sidepanel-section">
        <div class="sidepanel-section-title" style="color:#2b2b2b; font-weight:700;">FB Paths</div>
        <div class="sidepanel-item" style="display:block; padding-top:0;">
          <div class="sidepanel-label" style="margin-bottom:6px; color:#7b7b7b;">Пути поиска библиотек FB</div>
        </div>
        ${fbPathsHtml}
        <div class="sidepanel-item" style="padding-top:8px; display:flex; justify-content:center;">
          <button id="settingsAddPathBtn" style="margin:0; padding:0; border:none; background:transparent; color:#0066cc; cursor:pointer; text-decoration:underline; font-size:12px; font-family:inherit;">+ Добавить путь</button>
        </div>
      </div>
      <div class="sidepanel-section">
        <div class="sidepanel-section-title" style="color:#2b2b2b; font-weight:700;">Deploy</div>
        <div style="display:flex; gap:8px; align-items:flex-end;">
          <div style="flex:1; display:flex; flex-direction:column;">
            <div class="sidepanel-label" style="margin-bottom:4px; color:#7b7b7b;">Host</div>
            <input id="settingsHostInput" value="${escapeHtml(panelState.draft.deploy.host)}" style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px; color:#6f6f6f;" />
          </div>
          <div style="flex:0.6; display:flex; flex-direction:column;">
            <div class="sidepanel-label" style="margin-bottom:4px; color:#7b7b7b;">Port</div>
            <input id="settingsPortInput" type="number" min="1" max="65535" value="${panelState.draft.deploy.port}" style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px; color:#6f6f6f;" />
          </div>
          <div style="flex:0.8; display:flex; flex-direction:column;">
            <div class="sidepanel-label" style="margin-bottom:4px; color:#7b7b7b;">Timeout (ms)</div>
            <input id="settingsTimeoutInput" type="number" min="1000" step="1000" value="${panelState.draft.deploy.timeoutMs}" style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px; color:#6f6f6f;" />
          </div>
        </div>
      </div>
      <div class="sidepanel-section">
        <div class="sidepanel-section-title" style="color:#2b2b2b; font-weight:700;">Language</div>
        <div class="sidepanel-item" style="display:block;">
          <select id="settingsLangSelect" style="width:100%; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px; color:#6f6f6f;">
            <option value="ru" ${panelState.draft.uiLanguage === "ru" ? "selected" : ""}>Русский</option>
            <option value="en" ${panelState.draft.uiLanguage === "en" ? "selected" : ""}>English</option>
          </select>
        </div>
      </div>
    `;
  }

  sidepanelContent.innerHTML = `${settingsContentHtml}
    <div class="sidepanel-section">
      <button id="settingsSaveBtn" ${panelState.isSaving ? "disabled" : ""} style="width:100%; padding:8px 10px; border:1px solid #1a8a2f; border-radius:4px; background:${panelState.isSaving ? "#7bbd88" : "#28a745"}; color:#fff; cursor:${panelState.isSaving ? "default" : "pointer"};">${panelState.isSaving ? "Сохранение..." : "Save"}</button>
      <div id="settingsStatus" class="sidepanel-label" style="margin-top:8px; color:${panelState.statusColor}; text-align:center;">${escapeHtml(panelState.statusText)}</div>
    </div>
    <div class="sidepanel-section">
      <button id="settingsBackBtn" style="width:100%; padding:8px 10px; border:1px solid #bbb; border-radius:4px; background:#f1f1f1; cursor:pointer;">← Назад к информации о блоке</button>
    </div>`;

  const removeButtons = sidepanelContent.querySelectorAll<HTMLButtonElement>(".settings-remove-path-btn");
  removeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      if (!Number.isFinite(idx) || idx < 0 || idx >= panelState.draft.fbPaths.length) {
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
    });
  }

  const portInput = sidepanelContent.querySelector<HTMLInputElement>("#settingsPortInput");
  if (portInput) {
    portInput.addEventListener("input", () => {
      const nextDraft = cloneDraft(panelState.draft);
      nextDraft.deploy.port = Number(portInput.value);
      callbacks.onDraftChange(nextDraft);
      callbacks.onDirtyChange(true);
    });
  }

  const timeoutInput = sidepanelContent.querySelector<HTMLInputElement>("#settingsTimeoutInput");
  if (timeoutInput) {
    timeoutInput.addEventListener("input", () => {
      const nextDraft = cloneDraft(panelState.draft);
      nextDraft.deploy.timeoutMs = Number(timeoutInput.value);
      callbacks.onDraftChange(nextDraft);
      callbacks.onDirtyChange(true);
    });
  }

  const langSelect = sidepanelContent.querySelector<HTMLSelectElement>("#settingsLangSelect");
  if (langSelect) {
    langSelect.addEventListener("change", () => {
      const nextDraft = cloneDraft(panelState.draft);
      nextDraft.uiLanguage = langSelect.value === "en" ? "en" : "ru";
      callbacks.onDraftChange(nextDraft);
      callbacks.onDirtyChange(true);
    });
  }

  const saveBtn = sidepanelContent.querySelector<HTMLButtonElement>("#settingsSaveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      callbacks.onSave();
    });
  }

  const backBtn = sidepanelContent.querySelector<HTMLButtonElement>("#settingsBackBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      callbacks.onBack();
    });
  }
}