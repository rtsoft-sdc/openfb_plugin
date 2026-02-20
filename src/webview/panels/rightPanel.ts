import { EditorState } from "../editorState";
import { COLORS, CANVAS_COLORS } from "../../colorScheme";
import { buildPortSectionHtml, buildCollapsibleSectionHtml, type PortBuilderOptions } from "./panelUtils";

export type DiagramTabMode = "devices" | "blockinfo";

export interface RightPanelController {
  updateSidepanel: () => void;
  setDiagramTab: (tab: DiagramTabMode) => void;
  getDiagramTab: () => DiagramTabMode;
}

interface RightPanelOptions {
  state: EditorState;
}

export function createRightPanelController(options: RightPanelOptions): RightPanelController {
  const { state } = options;

  let diagramTabMode: DiagramTabMode = "devices";

  function buildDeviceParametersHtml(deviceId: string, device: any): string {
    if (!device.parameters || device.parameters.length === 0) return "";

    const paramsId = `${deviceId}-params`;
    let contentHtml = "";
    for (const param of device.parameters) {
      contentHtml += `<div class="device-item"><span class="device-label">${param.name}</span><span class="device-value">${param.value}</span></div>`;
    }

    return buildCollapsibleSectionHtml({
      sectionId: paramsId,
      title: "Параметры",
      toggleTitle: "Раскрыть/скрыть параметры",
      containerClass: "device-params-container",
      itemsCount: device.parameters.length,
      contentHtml,
      wrapperClass: "device-subsection",
      buttonClass: "device-toggle"
    });
  }

  function buildDeviceResourcesHtml(deviceId: string, device: any): string {
    if (!device.resources || device.resources.length === 0) return "";

    const resId = `${deviceId}-resources`;
    let contentHtml = "";
    for (const resource of device.resources) {
      contentHtml += `<div class="device-item"><span class="device-label">${resource.name}</span></div>`;
    }

    return buildCollapsibleSectionHtml({
      sectionId: resId,
      title: "Ресурсы",
      toggleTitle: "Раскрыть/скрыть ресурсы",
      containerClass: "device-resources-container",
      itemsCount: device.resources.length,
      contentHtml,
      wrapperClass: "device-subsection",
      buttonClass: "device-toggle"
    });
  }

  function buildDeviceFBsHtml(deviceId: string, uniqueFBs: string[]): string {
    if (uniqueFBs.length === 0) return "";

    const fbListId = `${deviceId}-fbs`;
    let contentHtml = "";
    for (const fb of uniqueFBs) {
      contentHtml += `<div class="device-item"><span class="device-label">${fb}</span></div>`;
    }

    return buildCollapsibleSectionHtml({
      sectionId: fbListId,
      title: "Function Blocks",
      toggleTitle: "Раскрыть/скрыть список FB",
      containerClass: "device-fbs-container",
      itemsCount: uniqueFBs.length,
      contentHtml,
      wrapperClass: "device-subsection",
      buttonClass: "device-toggle"
    });
  }

  function buildDeviceConnectionsHtml(deviceId: string, deviceConnections: any[]): string {
    if (deviceConnections.length === 0) return "";

    const connListId = `${deviceId}-conns`;
    let contentHtml = "";
    for (const conn of deviceConnections) {
      const connLabel = `${conn.fromBlock}.${conn.fromPort} → ${conn.toBlock}.${conn.toPort}`;
      const connType = conn.type ? ` [${conn.type}]` : "";
      contentHtml += `<div class="device-item"><span class="device-label" title="${connLabel}">${connLabel}${connType}</span></div>`;
    }

    return buildCollapsibleSectionHtml({
      sectionId: connListId,
      title: "Connections",
      toggleTitle: "Раскрыть/скрыть список соединений",
      containerClass: "device-conns-container",
      itemsCount: deviceConnections.length,
      contentHtml,
      wrapperClass: "device-subsection",
      buttonClass: "device-toggle"
    });
  }

  function renderDevicesTab(): void {
    const sidepanelHeader = document.getElementById("sidepanel-header");
    const sidepanelContent = document.getElementById("sidepanel-content");
    if (!sidepanelContent) return;

    if (sidepanelHeader) {
      sidepanelHeader.textContent = "Устройства";
    }

    if (!state.model || !state.model.devices || state.model.devices.length === 0) {
      sidepanelContent.innerHTML = '<div class="sidepanel-empty">Нет устройств</div>';
      return;
    }

    let html = "";

    for (const device of state.model.devices) {
      const deviceFBs = state.model?.mappings?.filter((m: any) => m.device === device.name) || [];
      const uniqueFBs = Array.from(new Set(deviceFBs.map((m: any) => m.fbInstance))) as string[];

      const deviceConnections = state.model?.connections?.filter((conn: any) => {
        const fromBlockInDevice = uniqueFBs.some((fb) => conn.fromBlock.startsWith(fb));
        const toBlockInDevice = uniqueFBs.some((fb) => conn.toBlock.startsWith(fb));
        return fromBlockInDevice && toBlockInDevice;
      }) || [];

      const deviceId = `device-${device.name.replace(/\s+/g, "_")}`;
      const borderColor = (device as any).color ? `rgb(${(device as any).color})` : COLORS.BUTTON_PRIMARY_BG;

      html += `<div class="device-section" style="border-left: 3px solid ${borderColor}">`;
      html += '<div class="device-header">';
      html += `<div class="device-name">${device.name}</div>`;
      html += "</div>";

      html += '<div class="device-info-container">';
      if (device.type) {
        html += `<div class="device-item"><span class="device-label">Тип:</span><span class="device-value">${device.type}</span></div>`;
      }
      html += "</div>";

      html += buildDeviceParametersHtml(deviceId, device);
      html += buildDeviceResourcesHtml(deviceId, device);
      html += buildDeviceFBsHtml(deviceId, uniqueFBs);
      html += buildDeviceConnectionsHtml(deviceId, deviceConnections);

      html += "</div>";
    }

    sidepanelContent.innerHTML = html;
  }

  function buildBlockInfoHtml(node: any): string {
    let html = '<div class="sidepanel-section">';
    html += `<div class="sidepanel-item"><span class="sidepanel-label">Имя:</span><span class="sidepanel-value">${node.id}</span></div>`;
    html += `<div class="sidepanel-item"><span class="sidepanel-label">Тип:</span><span class="sidepanel-value">${node.type}</span></div>`;

    if (node.fbKind) {
      const kindLabels: Record<string, string> = {
        BASIC: "Basic",
        COMPOSITE: "Composite",
        ADAPTER: "Adapter",
        SUBAPP: "Sub-app",
        SERVICE: "Service",
        UNKNOWN: "Unknown",
      };
      const kindLabel = kindLabels[String(node.fbKind)] || String(node.fbKind);
      html += `<div class="sidepanel-item"><span class="sidepanel-label">Класс:</span><span class="sidepanel-value">${kindLabel}</span></div>`;
    }
    html += "</div>";

    html += '<div class="sidepanel-section">';
    html += `<div class="sidepanel-item"><span class="sidepanel-label">Позиция:</span><span class="sidepanel-value">X: ${node.x.toFixed(0)}, Y: ${node.y.toFixed(0)}</span></div>`;
    html += "</div>";

    return html;
  }



  function buildPortsHtml(nodeId: string, ports: any[], nodeParamMap: Map<string, string>): string {
    if (ports.length === 0) return "";

    let html = "";

    const inputPorts = ports.filter((p) => p.direction === "input");
    html += buildPortSectionHtml({
      nodeId,
      sectionIdSuffix: "inputs",
      title: "Входы",
      toggleTitle: "Раскрыть/скрыть входы",
      ports: inputPorts,
      nodeParamMap,
      showValueWhenTruthyOnly: false,
      portColorMap: (port) =>
        port.kind === "event" ? CANVAS_COLORS.EVENT_PORT_COLOR : CANVAS_COLORS.DATA_PORT_COLOR,
      textMutedColor: COLORS.TEXT_MUTED,
    });

    const outputPorts = ports.filter((p) => p.direction === "output");
    html += buildPortSectionHtml({
      nodeId,
      sectionIdSuffix: "outputs",
      title: "Выходы",
      toggleTitle: "Раскрыть/скрыть выходы",
      ports: outputPorts,
      nodeParamMap,
      showValueWhenTruthyOnly: true,
      portColorMap: (port) =>
        port.kind === "event" ? CANVAS_COLORS.EVENT_PORT_COLOR : CANVAS_COLORS.DATA_PORT_COLOR,
      textMutedColor: COLORS.TEXT_MUTED,
    });

    return html;
  }

  function updateSidepanel(): void {
    const sidepanelHeader = document.getElementById("sidepanel-header");
    const sidepanelContent = document.getElementById("sidepanel-content");
    if (!sidepanelContent) return;

    // Diagram tabs mode
    if (diagramTabMode === "devices") {
      renderDevicesTab();
    } else {
      renderBlockInfoTab();
    }
  }

  function renderBlockInfoTab(): void {
    const sidepanelHeader = document.getElementById("sidepanel-header");
    const sidepanelContent = document.getElementById("sidepanel-content");
    if (!sidepanelContent) return;

    if (sidepanelHeader) {
      sidepanelHeader.textContent = "Информация о блоке";
    }

    const selectedNodeId = state.selection.nodeId;

    if (!selectedNodeId) {
      sidepanelContent.innerHTML = '<div class="sidepanel-empty">Выберите блок на диаграмме</div>';
      return;
    }

    const node = state.nodes.find((n) => n.id === selectedNodeId);
    if (!node) {
      sidepanelContent.innerHTML = '<div class="sidepanel-empty">Блок не найден</div>';
      return;
    }

    const nodeParamMap = new Map<string, string>();
    const diagramBlock = state.model?.subAppNetwork?.blocks?.find((b: any) => b.id === node.id);
    if (diagramBlock?.parameters) {
      for (const p of diagramBlock.parameters) {
        nodeParamMap.set(p.name, p.value);
      }
    }

    let html = "";
    html += buildBlockInfoHtml(node);
    html += buildPortsHtml(selectedNodeId, node.ports || [], nodeParamMap);

    sidepanelContent.innerHTML = html;
  }
  
  function setDiagramTab(tab: DiagramTabMode): void {
    diagramTabMode = tab;
    
    // Update tab UI
    const devicesTab = document.getElementById("tab-devices");
    const blockinfoTab = document.getElementById("tab-blockinfo");
    
    if (devicesTab && blockinfoTab) {
      if (tab === "devices") {
        devicesTab.classList.add("active");
        blockinfoTab.classList.remove("active");
      } else {
        devicesTab.classList.remove("active");
        blockinfoTab.classList.add("active");
      }
    }
    
    updateSidepanel();
  }

  return {
    updateSidepanel,
    setDiagramTab,
    getDiagramTab: () => diagramTabMode,
  };
}
