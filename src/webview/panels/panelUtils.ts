interface CollapsibleSectionOptions {
  sectionId: string;
  title: string;
  toggleTitle: string;
  containerClass: string;
  itemsCount: number;
  contentHtml: string;
  wrapperClass?: string;
  buttonClass?: string;
}

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
  } = options;

  if (itemsCount === 0) return "";

  let html = `<div class="${wrapperClass}">`;
  html += '<div class="device-section-title-collapsible">';
  html += `<button class="${buttonClass}" data-device-id="${sectionId}" title="${toggleTitle}">▶</button>`;
  html += `<span>${title} (${itemsCount})</span>`;
  html += "</div>";
  html += `<div class="${containerClass}" id="${sectionId}" style="display: none;">`;
  html += contentHtml;
  html += "</div></div>";

  return html;
}

export interface PortBuilderOptions {
  nodeId: string;
  sectionIdSuffix: string;
  title: string;
  toggleTitle: string;
  ports: any[];
  nodeParamMap: Map<string, string>;
  showValueWhenTruthyOnly: boolean;
  portColorMap: (port: any) => string;
  textMutedColor: string;
}

export function buildPortSectionHtml(options: PortBuilderOptions): string {
  const {
    nodeId,
    sectionIdSuffix,
    title,
    toggleTitle,
    ports,
    nodeParamMap,
    showValueWhenTruthyOnly,
    portColorMap,
    textMutedColor,
  } = options;

  if (ports.length === 0) return "";

  const sectionId = `node-${nodeId}-${sectionIdSuffix}`;
  let contentHtml = "";

  for (const port of ports) {
    const portColor = portColorMap(port);
    const paramValue = nodeParamMap.get(port.name);
    const portType = (port as any).type
      ? ` <span style="color: ${textMutedColor}; font-size: 11px;">(${(port as any).type})</span>`
      : "";

    contentHtml += '<div class="sidepanel-item">';
    contentHtml += `<span class="sidepanel-label"><span class="port-dot" style="background-color: ${portColor}"></span>${port.name}${portType}</span>`;

    if (showValueWhenTruthyOnly ? !!paramValue : paramValue !== undefined) {
      contentHtml += `<span class="sidepanel-value" style="font-size: 11px;">${paramValue}</span>`;
    }

    contentHtml += "</div>";
  }

  return buildCollapsibleSectionHtml({
    sectionId,
    title,
    toggleTitle,
    containerClass: "sidepanel-ports-container",
    itemsCount: ports.length,
    contentHtml,
    wrapperClass: "sidepanel-section",
    buttonClass: "device-toggle side-toggle",
  });
}
