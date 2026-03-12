import { PluginSettings, clonePluginSettings } from "./pluginSettings";
import { escapeXml } from "../../shared/utils/xmlEscape";
import { renderButton } from "./components/button";
import { tr } from "../i18nService";

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

const escapeHtml = escapeXml;

export function renderSettingsPanel(
  sidepanelHeader: HTMLElement | null,
  sidepanelContent: HTMLElement,
  panelState: SettingsPanelState,
  callbacks: SettingsPanelCallbacks
): void {
  if (sidepanelHeader) {
    sidepanelHeader.textContent = tr("panel.settings.title");
  }

  let settingsContentHtml = "";
  if (panelState.isLoading) {
    settingsContentHtml = `<div class="sidepanel-empty">${tr("common.loading")}</div>`;
  } else if (panelState.loadError) {
    settingsContentHtml = `<div class="sidepanel-empty fbt-error">${escapeHtml(panelState.loadError)}</div>`;
  } else {
    const lockedPath = panelState.lockedFbPath;
    const fbPathsHtml = panelState.draft.fbPaths.length > 0
      ? `<div class="settings-paths-list">${panelState.draft.fbPaths.map((pathValue, idx) => {
        const isLocked = lockedPath ? pathValue === lockedPath : false;
        const removeBtn = isLocked
          ? `<button class="settings-remove-path-btn" data-index="${idx}" title="${tr("panel.settings.pathLocked")}" disabled>✗</button>`
          : `<button class="settings-remove-path-btn" data-index="${idx}" title="${tr("panel.settings.pathDelete")}">✗</button>`;
        return `
          <div class="settings-fbpath-row">
            <span class="settings-fbpath-label" title="${escapeHtml(pathValue)}">${escapeHtml(pathValue)}</span>
            ${removeBtn}
          </div>
        `;
      }).join("")}</div>`
      : `<div class="sidepanel-empty">${tr("panel.settings.emptyPaths")}</div>`;

    settingsContentHtml = `
      <div class="sidepanel-section">
        <div class="sidepanel-section-title form-section-title">FB Paths</div>
        <div class="sidepanel-item form-field-block--flush">
          <div class="sidepanel-label form-label" style="margin-bottom:6px;">Paths search libraries FB</div>
        </div>
        ${fbPathsHtml}
        <div class="sidepanel-item" style="padding-top:8px; display:flex; justify-content:center;">
          <button id="settingsAddPathBtn" class="settings-add-path-btn">${tr("panel.settings.addPath")}</button>
        </div>
      </div>
      <div class="sidepanel-section">
        <div class="sidepanel-section-title form-section-title">Deploy</div>
        <div class="settings-deploy-row">
          <div class="settings-field settings-field--flex1">
            <div class="sidepanel-label form-label">Host</div>
            <input id="settingsHostInput" class="form-input" value="${escapeHtml(panelState.draft.deploy.host)}" />
          </div>
          <div class="settings-field settings-field--flex06">
            <div class="sidepanel-label form-label">Port</div>
            <input id="settingsPortInput" class="form-input" type="number" min="1" max="65535" value="${panelState.draft.deploy.port}" />
          </div>
          <div class="settings-field settings-field--flex08">
            <div class="sidepanel-label form-label">Timeout (ms)</div>
            <input id="settingsTimeoutInput" class="form-input" type="number" min="1000" step="1000" value="${panelState.draft.deploy.timeoutMs}" />
          </div>
        </div>
      </div>
      <div class="sidepanel-section">
        <div class="sidepanel-section-title form-section-title">${tr("field.language")}</div>
        <div class="sidepanel-item form-field-block">
          <select id="settingsLangSelect" class="form-input">
            <option value="ru" ${panelState.draft.uiLanguage === "ru" ? "selected" : ""}>Русский</option>
            <option value="en" ${panelState.draft.uiLanguage === "en" ? "selected" : ""}>English</option>
          </select>
        </div>
      </div>
    `;
  }

  sidepanelContent.innerHTML = `${settingsContentHtml}
    <div class="sidepanel-section btn-row" style="margin-top:16px;">
      ${renderButton({ id: "settingsSaveBtn", label: panelState.isSaving ? tr("settings.saving") : tr("common.save"), style: "primary", disabled: !panelState.dirty || panelState.isSaving })}
      ${renderButton({ id: "settingsCancelBtn", label: tr("common.cancel"), disabled: panelState.isSaving })}
    </div>
    <div class="sidepanel-section">
      <div id="settingsStatus" class="sidepanel-label form-status" style="color:${panelState.statusColor};">${escapeHtml(panelState.statusText)}</div>
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

      const nextDraft = clonePluginSettings(panelState.draft);
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
      const nextDraft = clonePluginSettings(panelState.draft);
      nextDraft.deploy.host = hostInput.value;
      callbacks.onDraftChange(nextDraft);
      callbacks.onDirtyChange(true);
      callbacks.rerender();
    });
  }

  const portInput = sidepanelContent.querySelector<HTMLInputElement>("#settingsPortInput");
  if (portInput) {
    portInput.addEventListener("input", () => {
      const nextDraft = clonePluginSettings(panelState.draft);
      nextDraft.deploy.port = Number(portInput.value);
      callbacks.onDraftChange(nextDraft);
      callbacks.onDirtyChange(true);
      callbacks.rerender();
    });
  }

  const timeoutInput = sidepanelContent.querySelector<HTMLInputElement>("#settingsTimeoutInput");
  if (timeoutInput) {
    timeoutInput.addEventListener("input", () => {
      const nextDraft = clonePluginSettings(panelState.draft);
      nextDraft.deploy.timeoutMs = Number(timeoutInput.value);
      callbacks.onDraftChange(nextDraft);
      callbacks.onDirtyChange(true);
      callbacks.rerender();
    });
  }

  const langSelect = sidepanelContent.querySelector<HTMLSelectElement>("#settingsLangSelect");
  if (langSelect) {
    langSelect.addEventListener("change", () => {
      const nextDraft = clonePluginSettings(panelState.draft);
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
