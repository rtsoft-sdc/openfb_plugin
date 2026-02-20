import { EditorState } from "./editorState";
import { CanvasRenderer } from "./rendering/canvasRenderer";
import { CanvasInputManager } from "./input/canvasInputManager";
import { initializeWebviewLogger } from "./logging";
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings } from "./panels/pluginSettings";
import { COLORS } from "../colorScheme";
import { createLeftPanelController } from "./panels/leftPanel";
import { createRightPanelController } from "./panels/rightPanel";
import { createSettingsModalController } from "./panels/settingsModal";
import { createMessageHandler } from "./handlers/messageHandler";
import { setupToolbarHandlers } from "./handlers/toolbarHandlers";
import { setupCanvasDnd } from "./handlers/canvasDnd";
import { createCanvasLayout } from "./layout/canvasLayout";
import { screenToWorld } from "./layout/transformUtils";

/**
 * VS Code Webview API for communication with the extension host
 */
interface VsCodeApi {
  postMessage(message: unknown): void;
}

declare const acquireVsCodeApi: () => VsCodeApi;

const logger = initializeWebviewLogger();
logger.info("main.ts starting...");

let vscode: VsCodeApi | undefined;
try {
  vscode = acquireVsCodeApi();
  logger.info("acquireVsCodeApi success");
} catch (error) {
  logger.error("acquireVsCodeApi failed", error);
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (!canvas) {
  logger.error("Canvas not found!");
} else {
  logger.info("Canvas found, initializing...");
}

const state = new EditorState();
const renderer = new CanvasRenderer(canvas);
new CanvasInputManager(canvas, state, renderer);

const requestAllFbTypes = (): boolean => {
  if (!vscode) {
    return false;
  }
  vscode.postMessage({ type: "request-all-fb-types" });
  return true;
};

const leftPanel = createLeftPanelController({
  logger,
  requestAllFbTypes,
});

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

function updateSettingsDirtyState(dirty: boolean) {
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

/**
 * Global event delegation handler for toggle buttons.
 * Handles both device-toggle and side-toggle buttons efficiently.
 */
function setupToggleButtonDelegation() {
  document.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest('.device-toggle, .side-toggle');
    if (!button) return;
    
    e.stopPropagation();
    const dataIdAttr = (button as HTMLButtonElement).getAttribute('data-device-id');
    if (dataIdAttr) {
      const container = document.getElementById(dataIdAttr);
      if (container) {
        const isHidden = container.style.display === 'none';
        container.style.display = isHidden ? 'block' : 'none';
        button.textContent = isHidden ? '▼' : '▶';
      }
    }
  });
}

function openSettingsModal() {
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

const rightPanel = createRightPanelController({
  state,
});

updateSidepanel = rightPanel.updateSidepanel;

// UI reacts to store updates via subscription (instead of monkey-patching state methods).
state.subscribe((newState) => {
  // Re-render canvas on every state change (single source of render triggers)
  renderer.render(state);

  // Hybrid auto-switch: switch to block info tab only if currently on devices tab
  if (newState.ui.selection.nodeId && rightPanel.getDiagramTab() === "devices") {
    rightPanel.setDiagramTab("blockinfo"); // this already calls updateSidepanel()
    return;
  }
  updateSidepanel();
});
updateSidepanel();

// Setup diagram tab click handlers
const tabDevices = document.getElementById("tab-devices");
const tabBlockinfo = document.getElementById("tab-blockinfo");

if (tabDevices) {
  tabDevices.addEventListener("click", () => {
    rightPanel.setDiagramTab("devices");
  });
}

if (tabBlockinfo) {
  tabBlockinfo.addEventListener("click", () => {
    rightPanel.setDiagramTab("blockinfo");
  });
}

// Setup event delegation for toggle buttons (optimization #1)
setupToggleButtonDelegation();

const canvasLayout = createCanvasLayout({
  canvas,
  state,
  renderer,
  logger,
});

window.addEventListener("resize", canvasLayout.resize);
canvasLayout.resize();

setupToolbarHandlers({
  logger,
  vscode,
  openSettingsPanel: openSettingsModal,
  openPalettePanel: () => leftPanel.openPalettePanel(),
});

setupCanvasDnd({
  canvas,
  leftPanel,
  logger,
  onDropBlockType: (blockType: string, event: DragEvent) => {
    // Convert drop screen coordinates to world coordinates
    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const worldPos = screenToWorld(canvas, renderer.camera, state.view.zoom, screenX, screenY);

    state.addNode(blockType, worldPos.x, worldPos.y);
  },
});

// Register message handler BEFORE anything else
logger.info("Registering message handler...");
const messageHandler = createMessageHandler({
  logger,
  state,
  leftPanel,
  centerDiagramInCanvas: canvasLayout.centerDiagramInCanvas,
  updateSidepanel,
  updateSettingsModal: () => settingsModal.updateModal(),
  closeSettingsModal: () => settingsModal.closeModal(),
  getSettingsDraft: () => settingsDraft,
  setSettingsDraft: (next) => {
    settingsDraft = next;
  },
  getIsSettingsLoading: () => isSettingsLoading,
  setIsSettingsLoading: (next) => {
    isSettingsLoading = next;
  },
  getIsSettingsSaving: () => isSettingsSaving,
  setIsSettingsSaving: (next) => {
    isSettingsSaving = next;
  },
  setSettingsLoadError: (message) => {
    settingsLoadError = message;
  },
  setSettingsDirty: (dirty) => {
    settingsDirty = dirty;
  },
  clonePluginSettings,
  updateSettingsDirtyState,
  setSettingsStatus,
});

window.addEventListener("message", messageHandler);
logger.info("Message handler registered");

// Send ready handshake to extension host
try {
  if (vscode) {
    logger.info("Posting ready to extension host");
    vscode.postMessage({ type: "ready" });
  } else {
    logger.debug("vscode.postMessage not available yet");
  }
} catch (err) {
  logger.error("Failed to post ready message", err);
}

// Global error handler
window.onerror = (msg, url, lineNo, columnNo, error) => {
  logger.error("GLOBAL ERROR", { msg, url, lineNo, columnNo, error });
  return false;
};

logger.info("Webview script loaded");
