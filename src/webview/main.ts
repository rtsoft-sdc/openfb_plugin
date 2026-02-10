import { EditorState } from "./editorState";
import { CanvasRenderer } from "./canvasRenderer";
import { InteractionEngine } from "./interactionEngine";
import { FBTypeModel } from "../domain/fbtModel";
import { initializeWebviewLogger } from "./logging";

declare const acquireVsCodeApi: () => {
  postMessage(message: any): void;
};

const logger = initializeWebviewLogger();
logger.info("main.ts starting...");

let vscode: any;
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
new InteractionEngine(canvas, state, renderer);

function resize() {
  canvas.width = window.innerWidth;
  // If toolbar present at bottom, subtract its height so canvas is not covered
  const tb = document.getElementById("toolbar");
  const tbHeight = tb ? tb.offsetHeight : 0;
  canvas.height = Math.max(0, window.innerHeight - tbHeight);
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
      if (typeof vscode !== "undefined" && vscode.postMessage) {
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

// Register message handler BEFORE anything else
logger.info("Registering message handler...");
const messageHandler = (event: MessageEvent) => {
  logger.debug("=== MESSAGE RECEIVED ===");
  logger.debug("event.data type", typeof event.data);
  logger.debug("event.data keys", Object.keys(event.data || {}));
  logger.debug("event.data", event.data);

  if (event.data?.type === "load-diagram") {
    logger.info("Processing load-diagram message");
    const fbTypes = new Map<string, FBTypeModel>(event.data.fbTypes || []);
    logger.info("FB Types count", fbTypes.size);
    logger.debug("Diagram blocks", event.data.payload?.blocks);
    
    // Log each block's position
    for (const block of (event.data.payload?.blocks || [])) {
      logger.debug(`Block: ${block.id} (type=${block.type}) at (${block.x}, ${block.y})`);
    }

    state.loadFromDiagram(event.data.payload, fbTypes);
    logger.info("Loaded nodes", state.nodes.length);
    logger.debug("State nodes data", state.nodes);
    logger.info("Loaded connections", state.connections.length);

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
  if (typeof vscode !== "undefined" && vscode.postMessage) {
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
