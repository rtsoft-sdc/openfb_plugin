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
  /** When true, render editable <input> for data input values and enabled OPC checkboxes */
  editable?: boolean;
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
    editable = false,
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

    // Editable input for data input ports, read-only span for others
    const isDataInput = port.kind === "data" && port.direction === "input";
    if (editable && isDataInput) {
      const val = paramValue ?? "";
      const portDataType = (port as any).type || "";
      contentHtml += `<input type="text" class="param-value-input" data-node-id="${nodeId}" data-port-name="${port.name}" data-port-type="${portDataType}" value="${val.replace(/"/g, '&quot;')}" style="font-size: 11px; flex: 1; text-align: center; margin: 0 4px; min-width: 40px; max-width: 100px; padding: 1px 4px; border: 1px solid rgba(128,128,128,0.3); border-radius: 3px; background: rgba(255,255,255,0.05); color: inherit;" />`;
    } else if (showValueWhenTruthyOnly ? !!paramValue : paramValue !== undefined) {
      const displayValue = paramValue ? `= ${paramValue}` : "";
      if (displayValue) {
        contentHtml += `<span class="sidepanel-value" style="font-size: 11px; flex: 1; text-align: center;">${displayValue}</span>`;
      }
    }

    // OPC Mapping checkbox for data input ports (always at right edge)
    if (opcMappingSet && isDataInput) {
      const checked = opcMappingSet.has(port.name) ? "checked" : "";
      const disabledAttr = editable ? "" : "disabled";
      contentHtml += `<label class="opc-mapping-label" title="OPC UA Mapping" style="margin-left: auto; white-space: nowrap;"><input type="checkbox" class="opc-mapping-checkbox" data-node-id="${nodeId}" data-port-name="${port.name}" ${checked} ${disabledAttr} /> OPC</label>`;
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
