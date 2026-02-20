import { COLORS } from "../../colorScheme";
import type { WebviewLogger } from "../logging";

export interface TreeNode {
  name: string;
  type: "folder" | "type";
  children?: TreeNode[];
  sourcePath?: string;
}

export interface FbtTreePanelController {
  openFbtTreePanel: () => void;
  closeFbtTreePanel: () => void;
  renderFbtTree: () => void;
  handleAllFbTypesLoaded: (tree: TreeNode[]) => void;
  handleAllFbTypesError: (message?: string) => void;
  getDraggedBlockType: () => string | null;
  clearDraggedBlockType: () => void;
  isFbtTreeOpen: () => boolean;
}

interface FbtTreePanelOptions {
  logger: WebviewLogger;
  onClose: () => void;
}

export function createFbtTreePanelController(options: FbtTreePanelOptions): FbtTreePanelController {
  const { logger, onClose } = options;

  let draggedBlockType: string | null = null;
  let fbTypesTree: TreeNode[] | null = null;
  let fbTypesTreeLoading = false;
  let fbTypesTreeError: string | undefined;
  let fbTypesNodeExpanded: Map<string, boolean> = new Map();
  let isFbtTreeOpened = false;

  function renderFbtTree(): void {
    const leftContent = document.getElementById("left-sidepanel-content");
    if (!leftContent) return;

    if (fbTypesTreeLoading) {
      leftContent.innerHTML = `<div style="padding:12px; text-align:center; color:${COLORS.TEXT_LIGHT}; font-size:12px;">Загружаю библиотеку типов...</div>`;
      return;
    }

    if (fbTypesTreeError) {
      leftContent.innerHTML = `<div style="padding:12px; color:${COLORS.ERROR_TEXT}; font-size:12px;"><strong>Ошибка:</strong> ${fbTypesTreeError}</div>`;
      return;
    }

    if (!fbTypesTree || fbTypesTree.length === 0) {
      leftContent.innerHTML = '<div class="sidepanel-empty" style="padding:12px; text-align:center; color:' + COLORS.TEXT_LIGHT + '; font-size:12px;">Нет доступных типов блоков</div>';
      return;
    }

    const getNodePath = (node: TreeNode, parentPath: string = ""): string => {
      return parentPath ? `${parentPath}/${node.name}` : node.name;
    };

    const renderNode = (node: TreeNode, depth: number = 0, parentPath: string = "", libraryIndex?: number): string => {
      const nodePath = getNodePath(node, parentPath);
      const indent = depth * 16;

      if (node.type === "type") {
        const fbName = node.name || "Unknown";
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
      }

      const isExpanded = fbTypesNodeExpanded.get(nodePath) ?? false;
      const arrowIcon = isExpanded ? "▼" : "▶";
      const childCount = node.children?.length || 0;

      const displayName = depth === 0 ? `TypeLibrary${libraryIndex}` : node.name;
      const titleAttr = depth === 0 ? ` title="${node.name}"` : "";

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
    };

    let html = `<div style="display:flex; flex-direction:column; gap:2px; padding:4px 0;">`;

    fbTypesTree.forEach((node, libIndex) => {
      html += renderNode(node, 0, "", libIndex + 1);
    });

    html += `<div style="padding:8px 0; border-top:1px solid ${COLORS.BORDER_COLOR}; margin-top:8px;">
    <button id="closeFbtTreeBtn" style="width:100%; padding:8px 10px; border:1px solid ${COLORS.UI_BORDER}; border-radius:4px; background:${COLORS.BUTTON_SECONDARY_BG}; cursor:pointer; font-size:12px;">Закрыть</button>
  </div></div>`;

    leftContent.innerHTML = html;

    const folderHeaders = leftContent.querySelectorAll(".palette-folder-header");
    folderHeaders.forEach((header) => {
      header.addEventListener("click", () => {
        const nodePath = (header as any)["dataset"]["nodePath"];
        const currentState = fbTypesNodeExpanded.get(nodePath) ?? false;
        fbTypesNodeExpanded.set(nodePath, !currentState);
        renderFbtTree();
      });
    });

    const paletteItems = leftContent.querySelectorAll(".palette-block-item");
    paletteItems.forEach((item) => {
      item.addEventListener("dragstart", (e: any) => {
        draggedBlockType = e.currentTarget.dataset.fbType;
        logger.debug(`Drag started: block type ${draggedBlockType}`);
      });
      item.addEventListener("dragend", () => {
        draggedBlockType = null;
      });

      item.addEventListener("mouseenter", () => {
        (item as HTMLElement).style.backgroundColor = COLORS.PALETTE_BLOCK_BG_HOVER;
      });
      item.addEventListener("mouseleave", () => {
        (item as HTMLElement).style.backgroundColor = COLORS.PALETTE_BLOCK_BG_TRANSPARENT;
      });
    });

    const closeBtn = leftContent.querySelector("#closeFbtTreeBtn") as HTMLButtonElement | null;
    if (closeBtn) {
      closeBtn.addEventListener("click", closeFbtTreePanel);
    }
  }

  function openFbtTreePanel(): void {
    isFbtTreeOpened = true;
    fbTypesTreeLoading = true;
    fbTypesTreeError = undefined;
    fbTypesNodeExpanded.clear();

    renderFbtTree();
  }

  function closeFbtTreePanel(): void {
    isFbtTreeOpened = false;
    draggedBlockType = null;
    onClose();
  }

  function handleAllFbTypesLoaded(tree: TreeNode[]): void {
    fbTypesTree = tree;
    fbTypesTreeLoading = false;
    fbTypesTreeError = undefined;

    if (isFbtTreeOpened) {
      renderFbtTree();
    }
  }

  function handleAllFbTypesError(message?: string): void {
    fbTypesTree = [];
    fbTypesTreeLoading = false;
    fbTypesTreeError = message || "Не удалось загрузить типы";

    if (isFbtTreeOpened) {
      renderFbtTree();
    }
  }

  return {
    openFbtTreePanel,
    closeFbtTreePanel,
    renderFbtTree,
    handleAllFbTypesLoaded,
    handleAllFbTypesError,
    getDraggedBlockType: () => draggedBlockType,
    clearDraggedBlockType: () => {
      draggedBlockType = null;
    },
    isFbtTreeOpen: () => isFbtTreeOpened,
  };
}
