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
  
  // Get FB type info
  const fbType = state.fbTypes?.get(node.type);
  
  // Build map of node parameters for quick lookup
  const nodeParamMap = new Map<string, string>();
  if (state.model && state.model.parameters) {
    state.model.parameters
      .filter((p: any) => p.fbName === node.id)
      .forEach((p: any) => {
        nodeParamMap.set(p.name, p.value);
      });
  }
  
  // Build HTML content
  let html = '';
  
  // Block name and type
  html += `<div class="sidepanel-section">`;
  html += `<div class="sidepanel-item"><span class="sidepanel-label">Имя:</span><span class="sidepanel-value">${node.id}</span></div>`;
  html += `<div class="sidepanel-item"><span class="sidepanel-label">Тип:</span><span class="sidepanel-value">${node.type}</span></div>`;
  html += `</div>`;
  
  // Position (compact - single line)
  html += `<div class="sidepanel-section">`;
  html += `<div class="sidepanel-item"><span class="sidepanel-label">Позиция:</span><span class="sidepanel-value">X: ${node.x.toFixed(0)}, Y: ${node.y.toFixed(0)}</span></div>`;
  html += `</div>`;
  
  // Input Ports
  if (fbType && fbType.ports && fbType.ports.length > 0) {
    const inputPorts = fbType.ports.filter(p => p.direction === 'input');
    if (inputPorts.length > 0) {
      html += `<div class="sidepanel-section">`;
      html += `<div class="sidepanel-section-title">Входы (${inputPorts.length})</div>`;
      for (const port of inputPorts) {
        const portColor = port.kind === 'event' ? '#22DD22' : '#2255FF';
        const paramValue = nodeParamMap.get(port.name);
        html += `<div class="sidepanel-item">`;
        html += `<span class="sidepanel-label"><span class="port-dot" style="background-color: ${portColor}"></span>${port.name}</span>`;
        if (paramValue) {
          html += `<span class="sidepanel-value" style="font-size: 11px;">${paramValue}</span>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }
  }
  
  // Output Ports
  if (fbType && fbType.ports && fbType.ports.length > 0) {
    const outputPorts = fbType.ports.filter(p => p.direction === 'output');
    if (outputPorts.length > 0) {
      html += `<div class="sidepanel-section">`;
      html += `<div class="sidepanel-section-title">Выходы (${outputPorts.length})</div>`;
      for (const port of outputPorts) {
        const portColor = port.kind === 'event' ? '#22DD22' : '#2255FF';
        const paramValue = nodeParamMap.get(port.name);
        html += `<div class="sidepanel-item">`;
        html += `<span class="sidepanel-label"><span class="port-dot" style="background-color: ${portColor}"></span>${port.name}</span>`;
        if (paramValue) {
          html += `<span class="sidepanel-value" style="font-size: 11px;">${paramValue}</span>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }
  }
  
  sidepanelContent.innerHTML = html;
}

// Subscribe to state changes
const originalSelectNode = state.selectNode.bind(state);
state.selectNode = function(nodeId?: string) {
  originalSelectNode(nodeId);
  updateSidepanel();
};

function resize() {
  canvas.width = window.innerWidth - 300; // Account for right panel
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
    
    logger.debug("Diagram blocks", event.data.payload.blocks);
    logger.info("Diagram connections count", event.data.payload.connections?.length || 0);
    if (event.data.payload.connections && event.data.payload.connections.length > 0) {
      logger.debug("Diagram connections", event.data.payload.connections);
    }
    
    // Log each block's position
    for (const block of event.data.payload.blocks) {
      logger.debug(`Block: ${block.id} (type=${block.type}) at (${block.x}, ${block.y})`);
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
