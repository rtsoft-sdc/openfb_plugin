import { EditorState, DiagramModel } from "./editorState";
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
 * Update left panel with devices information
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
    // Find FB blocks mapped to this device
    const deviceFBs = state.model?.mappings?.filter((m: any) => m.device === device.name) || [];
    const uniqueFBs = Array.from(new Set(deviceFBs.map((m: any) => m.fbInstance)));
    const deviceFBSet = new Set(uniqueFBs);
    
    // Find connections within this device (both blocks are in this device)
    const deviceConnections = state.model?.connections?.filter((conn: any) => {
      const fromBlockInDevice = uniqueFBs.some(fb => conn.fromBlock.startsWith(fb));
      const toBlockInDevice = uniqueFBs.some(fb => conn.toBlock.startsWith(fb));
      return fromBlockInDevice && toBlockInDevice;
    }) || [];
    
    const deviceId = `device-${device.name.replace(/\s+/g, '_')}`;
    const fbListId = `${deviceId}-fbs`;
    const connListId = `${deviceId}-conns`;
    
    // Use device color if available, otherwise use default green
    const borderColor = (device as any).color ? `rgb(${(device as any).color})` : '#28a745';
    html += `<div class="device-section" style="border-left: 3px solid ${borderColor}">`;
    html += `<div class="device-header">`;
    html += `<div class="device-name">${device.name}</div>`;
    html += `</div>`;
    
    // Device info
    html += `<div class="device-info-container">`;
    if (device.type) {
      html += `<div class="device-item"><span class="device-label">Тип:</span><span class="device-value">${device.type}</span></div>`;
    }
    html += `</div>`;
    
    // Parameters section (collapsible)
    if (device.parameters && device.parameters.length > 0) {
      const paramsId = `${deviceId}-params`;
      html += `<div class="device-subsection">`;
      html += `<div class="device-section-title-collapsible">`;
      html += `<button class="device-toggle" data-device-id="${paramsId}" title="Раскрыть/скрыть параметры">▶</button>`;
      html += `<span>Параметры (${device.parameters.length})</span>`;
      html += `</div>`;
      html += `<div class="device-params-container" id="${paramsId}" style="display: none;">`;
      for (const param of device.parameters) {
        html += `<div class="device-item"><span class="device-label">${param.name}</span><span class="device-value">${param.value}</span></div>`;
      }
      html += `</div>`;
      html += `</div>`;
    }
    
    // Resources section (collapsible)
    if (device.resources && device.resources.length > 0) {
      const resId = `${deviceId}-resources`;
      html += `<div class="device-subsection">`;
      html += `<div class="device-section-title-collapsible">`;
      html += `<button class="device-toggle" data-device-id="${resId}" title="Раскрыть/скрыть ресурсы">▶</button>`;
      html += `<span>Ресурсы (${device.resources.length})</span>`;
      html += `</div>`;
      html += `<div class="device-resources-container" id="${resId}" style="display: none;">`;
      for (const resource of device.resources) {
        html += `<div class="device-item"><span class="device-label">${resource.name}</span></div>`;
      }
      html += `</div>`;
      html += `</div>`;
    }
    
    // Function blocks section (collapsible)
    if (uniqueFBs.length > 0) {
      html += `<div class="device-subsection">`;
      html += `<div class="device-section-title-collapsible">`;
      html += `<button class="device-toggle" data-device-id="${fbListId}" title="Раскрыть/скрыть список FB">▶</button>`;
      html += `<span>Function Blocks (${uniqueFBs.length})</span>`;
      html += `</div>`;
      html += `<div class="device-fbs-container" id="${fbListId}" style="display: none;">`;
      for (const fb of uniqueFBs) {
        html += `<div class="device-item"><span class="device-label">${fb}</span></div>`;
      }
      html += `</div>`;
      html += `</div>`;
    }
    
    // Connections section (collapsible)
    if (deviceConnections.length > 0) {
      html += `<div class="device-subsection">`;
      html += `<div class="device-section-title-collapsible">`;
      html += `<button class="device-toggle" data-device-id="${connListId}" title="Раскрыть/скрыть список соединений">▶</button>`;
      html += `<span>Connections (${deviceConnections.length})</span>`;
      html += `</div>`;
      html += `<div class="device-conns-container" id="${connListId}" style="display: none;">`;
      for (const conn of deviceConnections) {
        const connLabel = `${conn.fromBlock}.${conn.fromPort} → ${conn.toBlock}.${conn.toPort}`;
        const connType = conn.type ? ` [${conn.type}]` : '';
        html += `<div class="device-item"><span class="device-label" title="${connLabel}">${connLabel}${connType}</span></div>`;
      }
      html += `</div>`;
      html += `</div>`;
    }
    
    html += `</div>`;
  }
  
  leftSidepanelContent.innerHTML = html;
  
  // Setup toggle buttons
  document.querySelectorAll('.device-toggle').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const deviceIdAttr = (button as HTMLButtonElement).getAttribute('data-device-id');
      if (deviceIdAttr) {
        const container = document.getElementById(deviceIdAttr);
        if (container) {
          const isHidden = container.style.display === 'none';
          container.style.display = isHidden ? 'block' : 'none';
          button.textContent = isHidden ? '▼' : '▶';
        }
      }
    });
  });
}

/**
 * Update sidepanel with selected block data
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
  
  const nodePorts = node.ports || [];
  
  // Build map of node parameters for quick lookup
  const nodeParamMap = new Map<string, string>();
  const diagramBlock = state.model?.subAppNetwork?.blocks?.find((b: any) => b.id === node.id);
  if (diagramBlock?.parameters) {
    for (const p of diagramBlock.parameters) {
      nodeParamMap.set(p.name, p.value);
    }
  }
  
  // Build HTML content
  let html = '';
  
  // Block name and type
  html += `<div class="sidepanel-section">`;
  html += `<div class="sidepanel-item"><span class="sidepanel-label">Имя:</span><span class="sidepanel-value">${node.id}</span></div>`;
  html += `<div class="sidepanel-item"><span class="sidepanel-label">Тип:</span><span class="sidepanel-value">${node.type}</span></div>`;
  // Display detected FB kind if present
  const nodeAny: any = node;
  if (nodeAny.fbKind) {
    const kindLabels: Record<string,string> = {
      BASIC: "Basic",
      COMPOSITE: "Composite",
      ADAPTER: "Adapter",
      SUBAPP: "Sub-app",
      SERVICE: "Service",
      UNKNOWN: "Unknown"
    };
    const kindLabel = kindLabels[String(nodeAny.fbKind)] || String(nodeAny.fbKind);
    html += `<div class="sidepanel-item"><span class="sidepanel-label">Класс:</span><span class="sidepanel-value">${kindLabel}</span></div>`;
  }
  html += `</div>`;
  
  // Position (compact - single line)
  html += `<div class="sidepanel-section">`;
  html += `<div class="sidepanel-item"><span class="sidepanel-label">Позиция:</span><span class="sidepanel-value">X: ${node.x.toFixed(0)}, Y: ${node.y.toFixed(0)}</span></div>`;
  html += `</div>`;
  
  // Input Ports (collapsible)
  if (nodePorts.length > 0) {
    const inputPorts = nodePorts.filter(p => p.direction === 'input');
    if (inputPorts.length > 0) {
      const inputsId = `node-${selectedNodeId}-inputs`;
      html += `<div class="sidepanel-section">`;
      html += `<div class="device-section-title-collapsible">`;
      html += `<button class="device-toggle side-toggle" data-device-id="${inputsId}" title="Раскрыть/скрыть входы">▶</button>`;
      html += `<span>Входы (${inputPorts.length})</span>`;
      html += `</div>`;
      html += `<div class="sidepanel-ports-container" id="${inputsId}" style="display: none;">`;
      for (const port of inputPorts) {
        const portColor = port.kind === 'event' ? '#22DD22' : '#2255FF';
        const paramValue = nodeParamMap.get(port.name);
        const portType = (port as any).type ? ` <span style="color: #999; font-size: 11px;">(${(port as any).type})</span>` : '';
        html += `<div class="sidepanel-item">`;
        html += `<span class="sidepanel-label"><span class="port-dot" style="background-color: ${portColor}"></span>${port.name}${portType}</span>`;
        if (paramValue !== undefined) {
          html += `<span class="sidepanel-value" style="font-size: 11px;">${paramValue}</span>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
      html += `</div>`;
    }
  }
  
  // Output Ports (collapsible)
  if (nodePorts.length > 0) {
    const outputPorts = nodePorts.filter(p => p.direction === 'output');
    if (outputPorts.length > 0) {
      const outputsId = `node-${selectedNodeId}-outputs`;
      html += `<div class="sidepanel-section">`;
      html += `<div class="device-section-title-collapsible">`;
      html += `<button class="device-toggle side-toggle" data-device-id="${outputsId}" title="Раскрыть/скрыть выходы">▶</button>`;
      html += `<span>Выходы (${outputPorts.length})</span>`;
      html += `</div>`;
      html += `<div class="sidepanel-ports-container" id="${outputsId}" style="display: none;">`;
      for (const port of outputPorts) {
        const portColor = port.kind === 'event' ? '#22DD22' : '#2255FF';
        const paramValue = nodeParamMap.get(port.name);
        const portType = (port as any).type ? ` <span style="color: #999; font-size: 11px;">(${(port as any).type})</span>` : '';
        html += `<div class="sidepanel-item">`;
        html += `<span class="sidepanel-label"><span class="port-dot" style="background-color: ${portColor}"></span>${port.name}${portType}</span>`;
        if (paramValue) {
          html += `<span class="sidepanel-value" style="font-size: 11px;">${paramValue}</span>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
      html += `</div>`;
    }
  }
  
  sidepanelContent.innerHTML = html;

  // Setup sidepanel toggles
  document.querySelectorAll('.side-toggle').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (button as HTMLButtonElement).getAttribute('data-device-id');
      if (id) {
        const container = document.getElementById(id);
        if (container) {
          const isHidden = container.style.display === 'none';
          container.style.display = isHidden ? 'block' : 'none';
          button.textContent = isHidden ? '▼' : '▶';
        }
      }
    });
  });
}

// Subscribe to state changes
const originalSelectNode = state.selectNode.bind(state);
state.selectNode = function(nodeId?: string) {
  originalSelectNode(nodeId);
  updateSidepanel();
};

function resize() {
  canvas.width = window.innerWidth - 480; // Account for left (250px) and right (300px) panels
  // If toolbar present at top, subtract its height so canvas is not covered
  const tb = document.getElementById("toolbar");
  const tbHeight = tb ? tb.offsetHeight : 0;
  canvas.height = Math.max(0, window.innerHeight - tbHeight);
  
  // Update renderer with toolbar height for fitToView calculations
  renderer.setToolbarHeight(tbHeight);
  
  logger.debug(`Canvas resized to ${canvas.width}x${canvas.height} (toolbar ${tbHeight}px)`);
  renderer.render(state);
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
    logger.info("Loaded nodes", state.nodes.length);
    logger.debug("State nodes data", state.nodes);
    logger.info("Loaded connections", state.connections.length);

    // Fit diagram to view on first load
    const tb = document.getElementById("toolbar");
    const tbHeight = tb ? tb.offsetHeight : 0;
    state.fitToView(canvas.width, canvas.height, tbHeight);

    // Also fit the camera to nodes for proper centering
    renderer.fitCameraToNodes(state.nodes, canvas.width, canvas.height, tbHeight);

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
