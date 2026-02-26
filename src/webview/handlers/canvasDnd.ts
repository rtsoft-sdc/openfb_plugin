import type { WebviewLogger } from "../logging";

interface LeftPanelDndDeps {
  getDraggedBlockType: () => string | null;
}

interface CanvasDndDeps {
  canvas: HTMLCanvasElement;
  leftPanel: LeftPanelDndDeps;
  logger: WebviewLogger;
  onDropBlockType?: (blockType: string, event: DragEvent) => void;
}

export function setupCanvasDnd(deps: CanvasDndDeps): void {
  const { canvas, leftPanel, logger, onDropBlockType } = deps;

  canvas.addEventListener("dragover", (e: DragEvent) => {
    if (leftPanel.getDraggedBlockType()) {
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

    const draggedBlockType = leftPanel.getDraggedBlockType();
    if (!draggedBlockType) return;

    logger.info(`Dropped block type: ${draggedBlockType}`);
    onDropBlockType?.(draggedBlockType, e);
  });
}
