/**
 * Reusable tree view component for rendering hierarchical folder/item trees.
 * Styling is driven by CSS classes defined in webviewTemplate.ts:
 *   .palette-tree-container, .palette-block-item, .palette-block-icon,
 *   .palette-folder-header, .palette-folder-header--root/--nested, .folder-arrow
 */

import { COLORS } from "../../../shared/colorScheme";

/**
 * A node in the tree hierarchy — either a folder or a leaf item.
 */
export interface TreeNode {
  name: string;
  type: "folder" | "type";
  children?: TreeNode[];
  sourcePath?: string;
}

export interface TreeViewOptions {
  /** Map of node path → expanded state */
  expandedState: Map<string, boolean>;
  /** Indent per depth level in px (default: 16) */
  indentPx?: number;
}

export interface TreeViewCallbacks {
  /** Called when a folder header is clicked to toggle expansion */
  onToggle: (nodePath: string) => void;
  /** Called when drag starts on a leaf item */
  onDragStart?: (fbType: string) => void;
  /** Called when drag ends */
  onDragEnd?: () => void;
}

// ── HTML generation ──────────────────────────────────────────────

function getNodePath(node: TreeNode, parentPath: string): string {
  return parentPath ? `${parentPath}/${node.name}` : node.name;
}

function renderLeafNode(node: TreeNode, indent: number): string {
  const fbName = node.name || "Unknown";
  const blockIcon = "◻";
  return `
    <div class="palette-block-item" draggable="true" data-fb-type="${fbName}" style="margin-left:${indent}px;">
      <span class="palette-block-icon">${blockIcon}</span>
      ${fbName}
    </div>
  `;
}

function renderFolderNode(
  node: TreeNode,
  depth: number,
  indent: number,
  isExpanded: boolean,
  nodePath: string,
  libraryIndex?: number,
): string {
  const arrowIcon = isExpanded ? "▼" : "▶";
  const childCount = node.children?.length || 0;

  const displayName = depth === 0 ? `TypeLibrary${libraryIndex}` : node.name;
  const titleAttr = depth === 0 ? ` title="${node.name}"` : "";

  const depthClass = depth === 0 ? "palette-folder-header--root" : "palette-folder-header--nested";

  return `
    <div class="palette-folder-header ${depthClass}" data-node-path="${nodePath}"${titleAttr} style="margin-left:${indent}px;">
      <span class="folder-arrow">${arrowIcon}</span>
      <span>📦 ${displayName} (${childCount})</span>
    </div>
  `;
}

function renderNodeRecursive(
  node: TreeNode,
  options: TreeViewOptions,
  depth: number,
  parentPath: string,
  libraryIndex?: number,
): string {
  const nodePath = getNodePath(node, parentPath);
  const indentPx = options.indentPx ?? 16;
  const indent = depth * indentPx;

  if (node.type === "type") {
    return renderLeafNode(node, indent);
  }

  const isExpanded = options.expandedState.get(nodePath) ?? false;

  let html = renderFolderNode(node, depth, indent, isExpanded, nodePath, libraryIndex);

  if (isExpanded && node.children) {
    for (const child of node.children) {
      html += renderNodeRecursive(child, options, depth + 1, nodePath);
    }
  }

  return html;
}

/**
 * Render a list of root tree nodes into an HTML string.
 * Each root node is rendered as a top-level library with a numbered label.
 */
export function renderTreeHtml(roots: TreeNode[], options: TreeViewOptions): string {
  let html = `<div class="palette-tree-container">`;

  roots.forEach((node, libIndex) => {
    html += renderNodeRecursive(node, options, 0, "", libIndex + 1);
  });

  html += "</div>";
  return html;
}

// ── Event binding ────────────────────────────────────────────────

/**
 * Attach click/drag/hover handlers to a container that holds rendered tree HTML.
 * Call this after setting `container.innerHTML = renderTreeHtml(...)`.
 */
export function attachTreeHandlers(container: HTMLElement, callbacks: TreeViewCallbacks): void {
  // Folder toggle
  const folderHeaders = container.querySelectorAll(".palette-folder-header");
  folderHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const nodePath = (header as HTMLElement).dataset.nodePath;
      if (nodePath) {
        callbacks.onToggle(nodePath);
      }
    });
  });

  // Leaf item drag & hover
  const paletteItems = container.querySelectorAll(".palette-block-item");
  paletteItems.forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      const fbType = (e.currentTarget as HTMLElement).dataset.fbType;
      if (fbType && callbacks.onDragStart) {
        callbacks.onDragStart(fbType);
      }
    });
    item.addEventListener("dragend", () => {
      callbacks.onDragEnd?.();
    });

    item.addEventListener("mouseenter", () => {
      (item as HTMLElement).style.backgroundColor = COLORS.PALETTE_BLOCK_BG_HOVER;
    });
    item.addEventListener("mouseleave", () => {
      (item as HTMLElement).style.backgroundColor = COLORS.PALETTE_BLOCK_BG_TRANSPARENT;
    });
  });
}
