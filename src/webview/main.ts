import { EditorState } from "./editorState";
import { CanvasRenderer } from "./canvasRenderer";
import { CanvasInputManager } from "./canvasInputManager";
import { FBTypeModel } from "../domain/fbtModel";
import { initializeWebviewLogger } from "./logging";

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
    const borderColor = (device as any).color ? `rgb(${(device as any).color})` : '#28a745';
    
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
    const portColor = port.kind === 'event' ? '#22DD22' : '#2255FF';
    const paramValue = nodeParamMap.get(port.name);
    const portType = (port as any).type ? ` <span style="color: #999; font-size: 11px;">(${(port as any).type})</span>` : '';

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

/**
 * Update sidepanel with selected block data.
 * Displays block information, ports (inputs/outputs), and parameters.
 */
function updateSidepanel() {
  const sidepanelContent = document.getElementById("sidepanel-content");
  if (!sidepanelContent) return;
  
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

// Register message handler BEFORE anything else
logger.info("Registering message handler...");
const messageHandler = (event: MessageEvent<ExtensionMessage>) => {
  logger.debug("=== MESSAGE RECEIVED ===");
  logger.debug("event.data type", typeof event.data);
  logger.debug("event.data keys", Object.keys(event.data || {}));
  logger.debug("event.data", event.data);

  if (event.data?.type === "load-diagram") {
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

    // Update device panel
    updateDevicePanel();

    renderer.render(state);
    logger.info("Rendered");
  } else {
    logger.debug("Message type not load-diagram", event.data?.type);
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
