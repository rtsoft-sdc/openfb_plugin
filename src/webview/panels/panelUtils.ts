interface CollapsibleSectionOptions {
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

export interface PortBuilderOptions {
  nodeId: string;
  sectionIdSuffix: string;
  title: string;
  toggleTitle: string;
  ports: any[];
  nodeParamMap: Map<string, string>;
  opcMappingSet?: Set<string>;
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
    opcMappingSet,
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
      const displayValue = paramValue ? `= ${paramValue}` : "";
      if (displayValue) {
        contentHtml += `<span class="sidepanel-value" style="font-size: 11px; flex: 1; text-align: center;">${displayValue}</span>`;
      }
    }

    // OPC Mapping checkbox for data input ports (always at right edge)
    if (opcMappingSet && port.kind === "data" && port.direction === "input") {
      const checked = opcMappingSet.has(port.name) ? "checked" : "";
      contentHtml += `<label class="opc-mapping-label" title="OPC UA Mapping" style="margin-left: auto; white-space: nowrap;"><input type="checkbox" class="opc-mapping-checkbox" data-node-id="${nodeId}" data-port-name="${port.name}" ${checked} disabled /> OPC</label>`;
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
    expandedByDefault: true,
  });
}
