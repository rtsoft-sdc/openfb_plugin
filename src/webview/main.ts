import { EditorState } from "./editorState";
import { CanvasRenderer } from "./canvasRenderer";
import { CanvasInputManager } from "./canvasInputManager";
import { FBTypeModel } from "../domain/fbtModel";
import { initializeWebviewLogger } from "./logging";
import { DEFAULT_PLUGIN_SETTINGS, PluginSettings } from "./pluginSettings";
import { renderSettingsPanel } from "./settingsPanel";
import { COLORS, CANVAS_COLORS } from "../colorScheme";

/**
 * VS Code Webview API for communication with the extension host
 */
interface VsCodeApi {
  postMessage(message: unknown): void;
}

/**
 * Message from extension host to webview
 */
interface ExtensionMessage {
  type: string;
  payload?: any;  // Can be DiagramModel or its superset with additional properties
  fbTypes?: [string, FBTypeModel][];
  fbTypesTree?: TreeNode[];
}

/**
 * Hierarchical tree node for FB palette
 */
interface TreeNode {
  name: string;
  type: "folder" | "type";
  children?: TreeNode[];
  sourcePath?: string;
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

type SidePanelMode = "info" | "settings";
let sidePanelMode: SidePanelMode = "info";

type LeftPanelMode = "devices" | "palette";
let leftPanelMode: LeftPanelMode = "devices";
let draggedBlockType: string | null = null;

// FB types tree (lazy loaded from extension when palette is opened)
let fbTypesTree: TreeNode[] | null = null;
let fbTypesTreeLoading = false;
let fbTypesNodeExpanded: Map<string, boolean> = new Map(); // Track expanded folders in palette

let pluginSettings: PluginSettings = DEFAULT_PLUGIN_SETTINGS;
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
 * Build generic device subsection HTML with collapsible content.
 */
function buildDeviceCollapsibleSectionHtml(
  sectionId: string,
  title: string,
  toggleTitle: string,
  containerClass: string,
  itemsCount: number,
  contentHtml: string
): string {
  if (itemsCount === 0) return '';

  let html = '<div class="device-subsection">';
  html += '<div class="device-section-title-collapsible">';
  html += `<button class="device-toggle" data-device-id="${sectionId}" title="${toggleTitle}">▶</button>`;
  html += `<span>${title} (${itemsCount})</span>`;
  html += '</div>';
  html += `<div class="${containerClass}" id="${sectionId}" style="display: none;">`;
  html += contentHtml;
  html += '</div></div>';

  return html;
}

/**
 * Build HTML for device parameters section (collapsible).
 */
function buildDeviceParametersHtml(deviceId: string, device: any): string {
  if (!device.parameters || device.parameters.length === 0) return '';

  const paramsId = `${deviceId}-params`;
  let contentHtml = '';
  for (const param of device.parameters) {
    contentHtml += `<div class="device-item"><span class="device-label">${param.name}</span><span class="device-value">${param.value}</span></div>`;
  }

  return buildDeviceCollapsibleSectionHtml(
    paramsId,
    'Параметры',
    'Раскрыть/скрыть параметры',
    'device-params-container',
    device.parameters.length,
    contentHtml
  );
}

/**
 * Build HTML for device resources section (collapsible).
 */
function buildDeviceResourcesHtml(deviceId: string, device: any): string {
  if (!device.resources || device.resources.length === 0) return '';

  const resId = `${deviceId}-resources`;
  let contentHtml = '';
  for (const resource of device.resources) {
    contentHtml += `<div class="device-item"><span class="device-label">${resource.name}</span></div>`;
  }

  return buildDeviceCollapsibleSectionHtml(
    resId,
    'Ресурсы',
    'Раскрыть/скрыть ресурсы',
    'device-resources-container',
    device.resources.length,
    contentHtml
  );
}

/**
 * Build HTML for device function blocks section (collapsible).
 */
function buildDeviceFBsHtml(deviceId: string, uniqueFBs: string[]): string {
  if (uniqueFBs.length === 0) return '';

  const fbListId = `${deviceId}-fbs`;
  let contentHtml = '';
  for (const fb of uniqueFBs) {
    contentHtml += `<div class="device-item"><span class="device-label">${fb}</span></div>`;
  }

  return buildDeviceCollapsibleSectionHtml(
    fbListId,
    'Function Blocks',
    'Раскрыть/скрыть список FB',
    'device-fbs-container',
    uniqueFBs.length,
    contentHtml
  );
}

/**
 * Build HTML for device connections section (collapsible).
 */
function buildDeviceConnectionsHtml(deviceId: string, deviceConnections: any[]): string {
  if (deviceConnections.length === 0) return '';

  const connListId = `${deviceId}-conns`;
  let contentHtml = '';
  for (const conn of deviceConnections) {
    const connLabel = `${conn.fromBlock}.${conn.fromPort} → ${conn.toBlock}.${conn.toPort}`;
    const connType = conn.type ? ` [${conn.type}]` : '';
    contentHtml += `<div class="device-item"><span class="device-label" title="${connLabel}">${connLabel}${connType}</span></div>`;
  }

  return buildDeviceCollapsibleSectionHtml(
    connListId,
    'Connections',
    'Раскрыть/скрыть список соединений',
    'device-conns-container',
    deviceConnections.length,
    contentHtml
  );
}

/**
 * Update left panel with devices information.
 * Displays device hierarchy: parameters, resources, function blocks, and connections.
 */
function updateDevicePanel() {
  const leftSidepanelContent = document.getElementById("left-sidepanel-content");
  if (!leftSidepanelContent) return;
  
  // Get devices from model
  if (!state.model || !state.model.devices || state.model.devices.length === 0) {
    leftSidepanelContent.innerHTML = '<div class="sidepanel-empty">Нет устройств</div>';
    return;
  }
  
  let html = '';
  
  for (const device of state.model.devices) {
    // Collect device FBs and connections
    const deviceFBs = state.model?.mappings?.filter((m: any) => m.device === device.name) || [];
    const uniqueFBs = Array.from(new Set(deviceFBs.map((m: any) => m.fbInstance))) as string[];
    
    const deviceConnections = state.model?.connections?.filter((conn: any) => {
      const fromBlockInDevice = uniqueFBs.some(fb => conn.fromBlock.startsWith(fb));
      const toBlockInDevice = uniqueFBs.some(fb => conn.toBlock.startsWith(fb));
      return fromBlockInDevice && toBlockInDevice;
    }) || [];
    
    const deviceId = `device-${device.name.replace(/\s+/g, '_')}`;
    const borderColor = (device as any).color ? `rgb(${(device as any).color})` : COLORS.BUTTON_PRIMARY_BG;
    
    // Build device section
    html += `<div class="device-section" style="border-left: 3px solid ${borderColor}">`;
    html += '<div class="device-header">';
    html += `<div class="device-name">${device.name}</div>`;
    html += '</div>';
    
    // Device info
    html += '<div class="device-info-container">';
    if (device.type) {
      html += `<div class="device-item"><span class="device-label">Тип:</span><span class="device-value">${device.type}</span></div>`;
    }
    html += '</div>';
    
    // Build subsections using helper methods
    html += buildDeviceParametersHtml(deviceId, device);
    html += buildDeviceResourcesHtml(deviceId, device);
    html += buildDeviceFBsHtml(deviceId, uniqueFBs);
    html += buildDeviceConnectionsHtml(deviceId, deviceConnections);
    
    html += '</div>';
  }
  
  leftSidepanelContent.innerHTML = html;
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

/**
 * Build HTML for block information section (name, type, kind, position).
 */
function buildBlockInfoHtml(node: any): string {
  let html = '<div class="sidepanel-section">';
  html += `<div class="sidepanel-item"><span class="sidepanel-label">Имя:</span><span class="sidepanel-value">${node.id}</span></div>`;
  html += `<div class="sidepanel-item"><span class="sidepanel-label">Тип:</span><span class="sidepanel-value">${node.type}</span></div>`;
  
  if (node.fbKind) {
    const kindLabels: Record<string,string> = {
      BASIC: "Basic",
      COMPOSITE: "Composite",
      ADAPTER: "Adapter",
      SUBAPP: "Sub-app",
      SERVICE: "Service",
      UNKNOWN: "Unknown"
    };
    const kindLabel = kindLabels[String(node.fbKind)] || String(node.fbKind);
    html += `<div class="sidepanel-item"><span class="sidepanel-label">Класс:</span><span class="sidepanel-value">${kindLabel}</span></div>`;
  }
  html += '</div>';
  
  // Position
  html += '<div class="sidepanel-section">';
  html += `<div class="sidepanel-item"><span class="sidepanel-label">Позиция:</span><span class="sidepanel-value">X: ${node.x.toFixed(0)}, Y: ${node.y.toFixed(0)}</span></div>`;
  html += '</div>';
  
  return html;
}

/**
 * Build HTML for ports section (inputs and outputs, collapsible).
 */
function buildPortSectionHtml(
  nodeId: string,
  sectionIdSuffix: string,
  title: string,
  toggleTitle: string,
  ports: any[],
  nodeParamMap: Map<string, string>,
  showValueWhenTruthyOnly: boolean
): string {
  if (ports.length === 0) return '';

  const sectionId = `node-${nodeId}-${sectionIdSuffix}`;
  let html = '<div class="sidepanel-section">';
  html += '<div class="device-section-title-collapsible">';
  html += `<button class="device-toggle side-toggle" data-device-id="${sectionId}" title="${toggleTitle}">▶</button>`;
  html += `<span>${title} (${ports.length})</span>`;
  html += '</div>';
  html += `<div class="sidepanel-ports-container" id="${sectionId}" style="display: none;">`;

  for (const port of ports) {
    const portColor = port.kind === "event"
      ? CANVAS_COLORS.EVENT_PORT_COLOR
      : CANVAS_COLORS.DATA_PORT_COLOR;
    const paramValue = nodeParamMap.get(port.name);
    const portType = (port as any).type ? ` <span style="color: ${COLORS.TEXT_MUTED}; font-size: 11px;">(${(port as any).type})</span>` : '';

    html += '<div class="sidepanel-item">';
    html += `<span class="sidepanel-label"><span class="port-dot" style="background-color: ${portColor}"></span>${port.name}${portType}</span>`;

    if (showValueWhenTruthyOnly ? !!paramValue : paramValue !== undefined) {
      html += `<span class="sidepanel-value" style="font-size: 11px;">${paramValue}</span>`;
    }

    html += '</div>';
  }

  html += '</div></div>';
  return html;
}

function buildPortsHtml(nodeId: string, ports: any[], nodeParamMap: Map<string, string>): string {
  if (ports.length === 0) return '';
  
  let html = '';
  
  // Input ports
  const inputPorts = ports.filter(p => p.direction === 'input');
  html += buildPortSectionHtml(
    nodeId,
    'inputs',
    'Входы',
    'Раскрыть/скрыть входы',
    inputPorts,
    nodeParamMap,
    false
  );
  
  // Output ports
  const outputPorts = ports.filter(p => p.direction === 'output');
  html += buildPortSectionHtml(
    nodeId,
    'outputs',
    'Выходы',
    'Раскрыть/скрыть выходы',
    outputPorts,
    nodeParamMap,
    true
  );
  
  return html;
}

function openSettingsPanel() {
  sidePanelMode = "settings";
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
  updateSidepanel();
}

function openInfoPanel() {
  sidePanelMode = "info";
  updateSidepanel();
}

function openPalettePanel() {
  leftPanelMode = "palette";
  fbTypesTreeLoading = true;
  fbTypesNodeExpanded.clear();
  
  // Update left panel header
  const leftHeader = document.getElementById("left-sidepanel-header");
  if (leftHeader) {
    leftHeader.textContent = "Библиотека типов";
  }
  
  updateLeftPanel();
  
  // Request all FB types from extension (lazy load)
  if (vscode) {
    logger.debug("Requesting all FB types tree from extension");
    vscode.postMessage({ type: "request-all-fb-types" });
  } else {
    fbTypesTreeLoading = false;
    updateLeftPanel();
  }
}

function closePalettePanel() {
  leftPanelMode = "devices";
  draggedBlockType = null;
  
  // Restore left panel header
  const leftHeader = document.getElementById("left-sidepanel-header");
  if (leftHeader) {
    leftHeader.textContent = "Устройства";
  }
  
  updateDevicePanel();
}

function renderBlockPalette() {
  const leftContent = document.getElementById("left-sidepanel-content");
  if (!leftContent) return;

  // Show loading indicator if tree is being fetched
  if (fbTypesTreeLoading) {
    leftContent.innerHTML = `<div style="padding:12px; text-align:center; color:${COLORS.TEXT_LIGHT}; font-size:12px;">Загружаю библиотеку типов...</div>`;
    return;
  }

  // Show error or empty state if no tree
  if (!fbTypesTree || fbTypesTree.length === 0) {
    leftContent.innerHTML = '<div class="sidepanel-empty" style="padding:12px; text-align:center; color:' + COLORS.TEXT_LIGHT + '; font-size:12px;">Нет доступных типов блоков</div>';
    return;
  }

  // Helper function to generate unique node identifier
  const getNodePath = (node: TreeNode, parentPath: string = ""): string => {
    return parentPath ? `${parentPath}/${node.name}` : node.name;
  };

  // Recursive function to render tree node
  const renderNode = (node: TreeNode, depth: number = 0, parentPath: string = "", libraryIndex?: number): string => {
    const nodePath = getNodePath(node, parentPath);
    const indent = depth * 16;
    
    if (node.type === "type") {
      // Render as draggable item
      const fbName = node.name || "Unknown";
      // Icon options: ◻ (outline box) | ◼ (filled box) | 🟦 (blue square) | ⬜ (white square) | ⬛ (black square) | ▪ (small square)
      const blockIcon = "◻";
      return `
        <div class="palette-block-item" draggable="true" data-fb-type="${fbName}" style="
          padding:4px 6px;
          margin-left:${indent}px;
          border:none;
          background:${COLORS.PALETTE_BLOCK_BG_TRANSPARENT};
          cursor:grab;
          user-select:none;
          font-size:12px;
          color:${COLORS.TEXT_PRIMARY};
          display:flex;
          align-items:center;
          gap:6px;
          border-radius:3px;
          transition:background-color 0.15s ease;
        ">
          <span style="font-size:14px; flex-shrink:0;">${blockIcon}</span>
          ${fbName}
        </div>
      `;
    } else {
      // Render as folder
      const isExpanded = fbTypesNodeExpanded.get(nodePath) ?? false; // Default collapsed
      const arrowIcon = isExpanded ? "▼" : "▶";
      const childCount = node.children?.length || 0;
      
      // Root level (depth 0) libraries get TypeLibrary name with path in tooltip
      const displayName = depth === 0 ? `TypeLibrary${libraryIndex}` : node.name;
      const titleAttr = depth === 0 ? ` title="${node.name}"` : "";
      
      // Styles differ based on depth: root level has full styling, nested levels are minimal
      const folderStyle = depth === 0 ? `
          padding:8px;
          background:${COLORS.PALETTE_LIB_HEADER_BG};
          border:1px solid ${COLORS.PALETTE_LIB_HEADER_BORDER};
          border-radius:3px;
        ` : `
          padding:4px 0;
          background:none;
          border:none;
        `;
      
      let html = `
        <div class="palette-folder-header" data-node-path="${nodePath}"${titleAttr} style="
          ${folderStyle}
          margin-left:${indent}px;
          cursor:pointer;
          user-select:none;
          font-size:12px;
          font-weight:bold;
          color:${COLORS.TEXT_PRIMARY};
          display:flex;
          align-items:center;
          gap:6px;
        ">
          <span class="folder-arrow" style="display:inline-block; width:12px; text-align:center;">${arrowIcon}</span>
          <span>📦 ${displayName} (${childCount})</span>
        </div>
      `;
      
      if (isExpanded && node.children) {
        for (const child of node.children) {
          html += renderNode(child, depth + 1, nodePath);
        }
      }
      
      return html;
    }
  };

  // Build tree HTML
  let html = `<div style="display:flex; flex-direction:column; gap:2px; padding:4px 0;">`;
  
  fbTypesTree.forEach((node, libIndex) => {
    html += renderNode(node, 0, "", libIndex + 1);
  });
  
  html += `<div style="padding:8px 0; border-top:1px solid ${COLORS.BORDER_COLOR}; margin-top:8px;">
    <button id="closePaletteBtn" style="width:100%; padding:6px 8px; border:1px solid ${COLORS.UI_BORDER}; background:${COLORS.UI_ACTIVE_BG}; border-radius:3px; cursor:pointer; font-size:12px;">Назад к устройствам</button>
  </div></div>`;

  leftContent.innerHTML = html;

  // Attach folder click handlers for expand/collapse
  const folderHeaders = leftContent.querySelectorAll(".palette-folder-header");
  folderHeaders.forEach(header => {
    header.addEventListener("click", () => {
      const nodePath = (header as any)["dataset"]["nodePath"];
      const currentState = fbTypesNodeExpanded.get(nodePath) ?? false; // Default collapsed
      fbTypesNodeExpanded.set(nodePath, !currentState);
      renderBlockPalette(); // Re-render to show/hide children
    });
  });

  // Attach drag events to palette items
  const paletteItems = leftContent.querySelectorAll(".palette-block-item");
  paletteItems.forEach(item => {
    item.addEventListener("dragstart", (e: any) => {
      draggedBlockType = e.currentTarget.dataset.fbType;
      logger.debug(`Drag started: block type ${draggedBlockType}`);
    });
    item.addEventListener("dragend", () => {
      draggedBlockType = null;
    });
    
    // Add hover effect
    item.addEventListener("mouseenter", () => {
      (item as HTMLElement).style.backgroundColor = COLORS.PALETTE_BLOCK_BG_HOVER;
    });
    item.addEventListener("mouseleave", () => {
      (item as HTMLElement).style.backgroundColor = COLORS.PALETTE_BLOCK_BG_TRANSPARENT;
    });
  });

  // Attach cancel button
  const closeBtn = leftContent.querySelector("#closePaletteBtn") as HTMLButtonElement | null;
  if (closeBtn) {
    closeBtn.addEventListener("click", closePalettePanel);
  }
}

function updateLeftPanel() {
  if (leftPanelMode === "palette") {
    renderBlockPalette();
  } else {
    updateDevicePanel();
  }
}

/**
 * Update sidepanel with selected block data.
 * Displays block information, ports (inputs/outputs), and parameters.
 */
function updateSidepanel() {
  const sidepanelHeader = document.getElementById("sidepanel-header");
  const sidepanelContent = document.getElementById("sidepanel-content");
  if (!sidepanelContent) return;

  if (sidePanelMode === "settings") {
    renderSettingsPanel(sidepanelHeader, sidepanelContent, {
      draft: settingsDraft,
      isLoading: isSettingsLoading,
      loadError: settingsLoadError,
      dirty: settingsDirty,
      isSaving: isSettingsSaving,
      statusText: settingsStatusText,
      statusColor: settingsStatusColor,
    }, {
      onDraftChange: (nextDraft) => {
        settingsDraft = nextDraft;
      },
      onDirtyChange: updateSettingsDirtyState,
      onBack: openInfoPanel,
      onSave: saveSettingsDraft,
      onAddPath: requestSettingsPathPick,
      rerender: updateSidepanel,
    });
    return;
  }

  if (sidepanelHeader) {
    sidepanelHeader.textContent = "Информация о блоке";
  }
  
  const selectedNodeId = state.selection.nodeId;
  
  if (!selectedNodeId) {
    sidepanelContent.innerHTML = '<div class="sidepanel-empty">Выберите блок на диаграмме</div>';
    return;
  }
  
  const node = state.nodes.find(n => n.id === selectedNodeId);
  if (!node) {
    sidepanelContent.innerHTML = '<div class="sidepanel-empty">Блок не найден</div>';
    return;
  }
  
  // Build parameter map for quick lookup
  const nodeParamMap = new Map<string, string>();
  const diagramBlock = state.model?.subAppNetwork?.blocks?.find((b: any) => b.id === node.id);
  if (diagramBlock?.parameters) {
    for (const p of diagramBlock.parameters) {
      nodeParamMap.set(p.name, p.value);
    }
  }
  
  // Build HTML using helper methods
  let html = '';
  html += buildBlockInfoHtml(node);
  html += buildPortsHtml(selectedNodeId, node.ports || [], nodeParamMap);
  
  sidepanelContent.innerHTML = html;
}

// UI reacts to store updates via subscription (instead of monkey-patching state methods).
state.subscribe(() => {
  updateSidepanel();
});
updateSidepanel();

// Setup event delegation for toggle buttons (optimization #1)
setupToggleButtonDelegation();

function resize() {
  canvas.width = window.innerWidth - 480; // Account for left (250px) and right (300px) panels
  // If toolbar present at top, subtract its height so canvas is not covered
  const tb = document.getElementById("toolbar");
  const tbHeight = tb ? tb.offsetHeight : 0;
  canvas.height = Math.max(0, window.innerHeight - tbHeight);
  
  logger.debug(`Canvas resized to ${canvas.width}x${canvas.height} (toolbar ${tbHeight}px)`);
  renderer.render(state);
}

function centerDiagramInCanvas() {
  if (!state.nodes || state.nodes.length === 0) {
    renderer.camera.offsetX = 0;
    renderer.camera.offsetY = 0;
    const resetDx = -state.view.offsetX;
    const resetDy = -state.view.offsetY;
    if (resetDx !== 0 || resetDy !== 0) {
      state.dispatch({ type: "PAN", dx: resetDx, dy: resetDy });
    }
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of state.nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  const diagramCenterX = (minX + maxX) / 2;
  const diagramCenterY = (minY + maxY) / 2;
  const targetOffsetX = canvas.width / 2 - diagramCenterX;
  const targetOffsetY = canvas.height / 2 - diagramCenterY;

  renderer.camera.offsetX = targetOffsetX;
  renderer.camera.offsetY = targetOffsetY;

  const dx = targetOffsetX - state.view.offsetX;
  const dy = targetOffsetY - state.view.offsetY;
  if (dx !== 0 || dy !== 0) {
    state.dispatch({ type: "PAN", dx, dy });
  }
}

window.addEventListener("resize", resize);
resize();

// Toolbar button handlers
const deployBtn = document.getElementById("deployBtn") as HTMLButtonElement | null;
if (deployBtn) {
  deployBtn.addEventListener("click", () => {
    logger.info("Deploy button clicked");
    try {
      if (vscode) {
        vscode.postMessage({ type: "deploy" });
      } else {
        logger.warn("vscode.postMessage not available for deploy");
      }
    } catch (err) {
      logger.error("Failed to post deploy message", err);
    }
  });
} else {
  logger.warn("Deploy button not found in DOM");
}

const generateFbootBtn = document.getElementById("generateFbootBtn") as HTMLButtonElement | null;
if (generateFbootBtn) {
  generateFbootBtn.addEventListener("click", () => {
    logger.info("generateFbootBtn button clicked");
    try {
      if (vscode) {
        vscode.postMessage({ type: "generateFboot" });
      } else {
        logger.warn("vscode.postMessage not available for deploy");
      }
    } catch (err) {
      logger.error("Failed to post generateFboot message", err);
    }
  });
} else {
  logger.warn("generateFboot button not found in DOM");
}

const settingsBtn = document.getElementById("settingsBtn") as HTMLButtonElement | null;
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    logger.info("settingsBtn button clicked");
    openSettingsPanel();
  });
} else {
  logger.warn("settings button not found in DOM");
}

const addBlockBtn = document.getElementById("addBlockBtn") as HTMLButtonElement | null;
if (addBlockBtn) {
  addBlockBtn.addEventListener("click", () => {
    logger.info("addBlockBtn button clicked");
    openPalettePanel();
  });
} else {
  logger.warn("addBlockBtn button not found in DOM");
}

// Setup drag & drop on canvas
canvas.addEventListener("dragover", (e: DragEvent) => {
  if (draggedBlockType) {
    e.preventDefault();
    canvas.style.opacity = "0.8";
  }
});

canvas.addEventListener("dragleave", () => {
  canvas.style.opacity = "1";
});

canvas.addEventListener("drop", (e: DragEvent) => {
  e.preventDefault();
  canvas.style.opacity = "1";
  
  if (!draggedBlockType) return;
  
 logger.info(`Dropped block type: ${draggedBlockType}`);
  // TODO:CreateNode action here
});

// Register message handler BEFORE anything else
logger.info("Registering message handler...");
const messageHandler = (event: MessageEvent<ExtensionMessage>) => {
  logger.debug("=== MESSAGE RECEIVED ===");
  logger.debug("event.data type", typeof event.data);
  logger.debug("event.data keys", Object.keys(event.data || {}));
  logger.debug("event.data", event.data);

  if (event.data?.type === "settings:loaded") {
    if (event.data.payload) {
      pluginSettings = event.data.payload as PluginSettings;
      settingsDraft = clonePluginSettings(pluginSettings);
      isSettingsLoading = false;
      isSettingsSaving = false;
      settingsLoadError = undefined;
      settingsDirty = false;
      setSettingsStatus("Сохранено", COLORS.SUCCESS_TEXT);
      if (sidePanelMode === "settings") {
        updateSidepanel();
      }
    }
  } else if (event.data?.type === "settings:path-picked") {
    const selectedPath = typeof event.data.payload === "string" ? event.data.payload.trim() : "";
    if (!selectedPath) {
      return;
    }

    if (settingsDraft.fbPaths.includes(selectedPath)) {
      setSettingsStatus("Путь уже добавлен", COLORS.WARNING_TEXT);
      if (sidePanelMode === "settings") {
        updateSidepanel();
      }
      return;
    }

    const nextDraft = clonePluginSettings(settingsDraft);
    nextDraft.fbPaths.push(selectedPath);
    settingsDraft = nextDraft;
    updateSettingsDirtyState(true);
    if (sidePanelMode === "settings") {
      updateSidepanel();
    }
  } else if (event.data?.type === "settings:saved") {
    if (event.data.payload) {
      pluginSettings = event.data.payload as PluginSettings;
      settingsDraft = clonePluginSettings(pluginSettings);
    }

    isSettingsSaving = false;
    settingsDirty = false;
    setSettingsStatus("Сохранено", COLORS.SUCCESS_TEXT);
    if (sidePanelMode === "settings") {
      updateSidepanel();
    }
  } else if (event.data?.type === "settings:error") {
    const message = typeof event.data.payload === "string" ? event.data.payload : "Ошибка загрузки настроек";

    if (isSettingsLoading) {
      settingsLoadError = message;
      isSettingsLoading = false;
    }

    if (isSettingsSaving) {
      isSettingsSaving = false;
      setSettingsStatus(message, COLORS.ERROR_TEXT);
    }

    if (sidePanelMode === "settings") {
      updateSidepanel();
    }
  } else if (event.data?.type === "load-diagram") {
    logger.info("Processing load-diagram message");
    const fbTypes = new Map<string, FBTypeModel>(event.data.fbTypes || []);
    logger.info("FB Types count", fbTypes.size);
    
    if (!event.data.payload) {
      logger.error("No payload in load-diagram message");
      return;
    }
    
    logger.debug("Diagram blocks", event.data.payload.subAppNetwork?.blocks);
    logger.info(
      "Diagram connections count",
      event.data.payload.subAppNetwork?.connections?.length || 0
    );
    if (event.data.payload.subAppNetwork?.connections && event.data.payload.subAppNetwork.connections.length > 0) {
      logger.debug("Diagram connections", event.data.payload.subAppNetwork.connections);
    }
    
    // Log each block's position
    for (const block of event.data.payload.subAppNetwork.blocks) {
      logger.debug(`Block: ${block.id} (type=${block.typeShort}) at (${block.x}, ${block.y})`);
    }

    state.loadFromDiagram(event.data.payload, fbTypes);
    centerDiagramInCanvas();
    logger.info("Loaded nodes", state.nodes.length);
    logger.debug("State nodes data", state.nodes);
    logger.info("Loaded connections", state.connections.length);

    // Update left panel (devices or palette)
    updateLeftPanel();

    renderer.render(state);
    logger.info("Rendered");
  } else if (event.data?.type === "all-fb-types-loaded") {
    logger.info("Received all FB types tree from extension");
    fbTypesTree = event.data.fbTypesTree || [];
    fbTypesTreeLoading = false;
    
    logger.debug("FB types tree received", {
      rootNodes: fbTypesTree.length,
    });
    
    // Re-render palette with received tree
    if (leftPanelMode === "palette") {
      renderBlockPalette();
    }
  } else if (event.data?.type === "all-fb-types-error") {
    logger.error("Error loading FB types tree", event.data.payload);
    fbTypesTree = [];
    fbTypesTreeLoading = false;
    
    // Show error in palette
    if (leftPanelMode === "palette") {
      const leftContent = document.getElementById("left-sidepanel-content");
      if (leftContent) {
        leftContent.innerHTML = `<div style="padding:12px; color:${COLORS.ERROR_TEXT}; font-size:12px;"><strong>Ошибка:</strong> ${event.data.payload || "Не удалось загрузить типы"}</div>`;
      }
    }
  } else {
    logger.debug("Message type not recognized", event.data?.type);
  }
};

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
