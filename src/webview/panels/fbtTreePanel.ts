import type { WebviewLogger } from "../logging";
import { renderTreeHtml, attachTreeHandlers } from "./components/treeView";
import { renderButton } from "./components/button";

export type { TreeNode } from "./components/treeView";
import type { TreeNode } from "./components/treeView";

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
      leftContent.innerHTML = `<div class="fbt-loading">Загружаю библиотеку типов...</div>`;
      return;
    }

    if (fbTypesTreeError) {
      leftContent.innerHTML = `<div class="fbt-error"><strong>Ошибка:</strong> ${fbTypesTreeError}</div>`;
      return;
    }

    if (!fbTypesTree || fbTypesTree.length === 0) {
      leftContent.innerHTML = '<div class="sidepanel-empty">Нет доступных типов блоков</div>';
      return;
    }

    const treeOptions = { expandedState: fbTypesNodeExpanded };
    let html = renderTreeHtml(fbTypesTree, treeOptions);

    html += `<div class="fbt-tree-footer">
    ${renderButton({ id: "closeFbtTreeBtn", label: "Закрыть", style: "secondary", fullWidth: true, extraCss: "font-size:12px; padding:8px 10px;" })}
  </div>`;

    leftContent.innerHTML = html;

    attachTreeHandlers(leftContent, {
      onToggle: (nodePath) => {
        const currentState = fbTypesNodeExpanded.get(nodePath) ?? false;
        fbTypesNodeExpanded.set(nodePath, !currentState);
        renderFbtTree();
      },
      onDragStart: (fbType) => {
        draggedBlockType = fbType;
        logger.debug(`Drag started: block type ${draggedBlockType}`);
      },
      onDragEnd: () => {
        draggedBlockType = null;
      },
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
