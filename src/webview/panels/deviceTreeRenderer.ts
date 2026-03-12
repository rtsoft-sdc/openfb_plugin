/**
 * HTML builders for device tree sections in the right sidepanel.
 */

import { buildCollapsibleSectionHtml } from "./components/collapsible";
import type { SysDevice, SysConnection } from "../../shared/models/sysModel";
import { tr } from "../i18nService";

export function buildDeviceParametersHtml(deviceId: string, device: SysDevice): string {
  if (!device.parameters || device.parameters.length === 0) return "";

  const paramsId = `${deviceId}-params`;
  let contentHtml = "";
  for (const param of device.parameters) {
    contentHtml += `<div class="device-item"><span class="device-label">${param.name}</span><span class="device-value">${param.value}</span></div>`;
  }

  return buildCollapsibleSectionHtml({
    sectionId: paramsId,
    title: tr("field.parameters"),
    toggleTitle: tr("hint.toggleParameters"),
    containerClass: "device-params-container",
    itemsCount: device.parameters.length,
    contentHtml,
    wrapperClass: "device-subsection",
    buttonClass: "device-toggle",
  });
}

export function buildDeviceResourcesHtml(deviceId: string, device: SysDevice): string {
  if (!device.resources || device.resources.length === 0) return "";

  const resId = `${deviceId}-resources`;
  let contentHtml = "";
  for (const resource of device.resources) {
    contentHtml += `<div class="device-item"><span class="device-label">${resource.name}</span></div>`;
  }

  return buildCollapsibleSectionHtml({
    sectionId: resId,
    title: tr("field.resources"),
    toggleTitle: tr("hint.toggleResources"),
    containerClass: "device-resources-container",
    itemsCount: device.resources.length,
    contentHtml,
    wrapperClass: "device-subsection",
    buttonClass: "device-toggle",
  });
}

export function buildDeviceFBsHtml(deviceId: string, uniqueFBs: string[]): string {
  if (uniqueFBs.length === 0) return "";

  const fbListId = `${deviceId}-fbs`;
  let contentHtml = "";
  for (const fb of uniqueFBs) {
    contentHtml += `<div class="device-item"><span class="device-label">${fb}</span></div>`;
  }

  return buildCollapsibleSectionHtml({
    sectionId: fbListId,
    title: "Function Blocks",
    toggleTitle: tr("hint.toggleFbList"),
    containerClass: "device-fbs-container",
    itemsCount: uniqueFBs.length,
    contentHtml,
    wrapperClass: "device-subsection",
    buttonClass: "device-toggle",
  });
}

export function buildDeviceConnectionsHtml(deviceId: string, deviceConnections: SysConnection[]): string {
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
    toggleTitle: tr("hint.toggleConnections"),
    containerClass: "device-conns-container",
    itemsCount: deviceConnections.length,
    contentHtml,
    wrapperClass: "device-subsection",
    buttonClass: "device-toggle",
  });
}
