/**
 * Reusable collapsible section component.
 * Renders an expand/collapse section with a toggle button.
 * Toggle behavior is driven by event delegation on `.device-toggle` / `.side-toggle` classes.
 */

export interface CollapsibleSectionOptions {
  sectionId: string;
  title: string;
  toggleTitle: string;
  containerClass: string;
  itemsCount: number;
  contentHtml: string;
  wrapperClass?: string;
  buttonClass?: string;
  expandedByDefault?: boolean;
}

/**
 * Build HTML for a collapsible section with a toggle arrow button.
 * Returns empty string if itemsCount === 0.
 */
export function buildCollapsibleSectionHtml(options: CollapsibleSectionOptions): string {
  const {
    sectionId,
    title,
    toggleTitle,
    containerClass,
    itemsCount,
    contentHtml,
    wrapperClass = "device-subsection",
    buttonClass = "device-toggle",
    expandedByDefault = false,
  } = options;

  if (itemsCount === 0) return "";

  const arrow = expandedByDefault ? "▼" : "▶";
  const display = expandedByDefault ? "block" : "none";

  let html = `<div class="${wrapperClass}">`;
  html += '<div class="device-section-title-collapsible">';
  html += `<button class="${buttonClass}" data-device-id="${sectionId}" title="${toggleTitle}">${arrow}</button>`;
  html += `<span>${title} (${itemsCount})</span>`;
  html += "</div>";
  html += `<div class="${containerClass}" id="${sectionId}" style="display: ${display};">`;
  html += contentHtml;
  html += "</div></div>";

  return html;
}

/**
 * Set up global event delegation for collapsible toggle buttons.
 * Handles both `.device-toggle` and `.side-toggle` classes.
 * Call once during application initialization.
 */
export function setupCollapsibleDelegation(): void {
  document.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest(".device-toggle, .side-toggle");
    if (!button) return;

    e.stopPropagation();
    const dataIdAttr = (button as HTMLButtonElement).getAttribute("data-device-id");
    if (dataIdAttr) {
      const container = document.getElementById(dataIdAttr);
      if (container) {
        const isHidden = container.style.display === "none";
        container.style.display = isHidden ? "block" : "none";
        button.textContent = isHidden ? "▼" : "▶";
      }
    }
  });
}
