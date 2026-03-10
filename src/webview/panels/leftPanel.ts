import type { WebviewLogger } from "../logging";
import { createFbtTreePanelController, type TreeNode, type FbtTreePanelController } from "./fbtTreePanel";

export type { TreeNode, FbtTreePanelController };

export interface LeftPanelController {
  openPalettePanel: () => void;
  getDraggedBlockType: () => string | null;
  clearDraggedBlockType: () => void;
  handleAllFbTypesLoaded: (tree: TreeNode[]) => void;
  handleAllFbTypesError: (message?: string) => void;
  isPaletteOpen: () => boolean;
}

interface LeftPanelOptions {
  logger: WebviewLogger;
  requestAllFbTypes: () => boolean;
}

export function createLeftPanelController(options: LeftPanelOptions): LeftPanelController {
  const { logger, requestAllFbTypes } = options;

  function setLeftPanelVisible(visible: boolean): void {
    const leftPanel = document.getElementById("left-sidepanel");
    if (leftPanel) {
      leftPanel.style.display = visible ? "flex" : "none";
    }
  }

  const fbtTreeController = createFbtTreePanelController({
    logger,
    onClose: () => {
      setLeftPanelVisible(false);
    },
  });

  function openPalettePanel(): void {
    setLeftPanelVisible(true);
    fbtTreeController.openFbtTreePanel();
    if (!requestAllFbTypes()) {
      fbtTreeController.handleAllFbTypesError("Host API недоступен");
    }
  }

  setLeftPanelVisible(false);

  return {
    openPalettePanel,
    getDraggedBlockType: () => fbtTreeController.getDraggedBlockType(),
    clearDraggedBlockType: () => fbtTreeController.clearDraggedBlockType(),
    handleAllFbTypesLoaded: (tree: TreeNode[]) => fbtTreeController.handleAllFbTypesLoaded(tree),
    handleAllFbTypesError: (message?: string) => fbtTreeController.handleAllFbTypesError(message),
    isPaletteOpen: () => fbtTreeController.isFbtTreeOpen(),
  };
}
