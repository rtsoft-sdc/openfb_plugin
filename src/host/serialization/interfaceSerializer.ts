/**
 * Serialization helpers and InterfaceList / SubAppInterfaceList XML generators.
 */

import type {
  BaseFBType,
  InterfaceList,
  SubAppInterfaceList,
  EventDeclaration,
  VarDeclaration,
  AdapterDeclaration,
} from "../../shared/fbtypes";
import { escapeXml as esc } from "../../shared/utils/xmlEscape";

// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------

export function attr(name: string, value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  return ` ${name}="${esc(String(value))}"`;
}

export function indent(level: number): string {
  return "  ".repeat(level);
}

// -----------------------------------------------------------------------------
// Metadata (Identification, VersionInfo, CompilerInfo)
// -----------------------------------------------------------------------------

export function serializeMetadata(def: BaseFBType, ind: number): string {
  let xml = "";

  if (def.identification) {
    const id = def.identification;
    xml += `${indent(ind)}<Identification${attr("Standard", id.standard)}${attr("Classification", id.classification)}${attr("ApplicationDomain", id.applicationDomain)}${attr("Function", id.function)}${attr("Description", id.description)}/>\n`;
  }

  if (def.versionInfo) {
    for (const vi of def.versionInfo) {
      xml += `${indent(ind)}<VersionInfo${attr("Version", vi.version)}${attr("Author", vi.author)}${attr("Date", vi.date)}${attr("Organization", vi.organization)}${attr("Remarks", vi.remarks)}/>\n`;
    }
  }

  if (def.compilerInfo) {
    const ci = def.compilerInfo;
    xml += `${indent(ind)}<CompilerInfo${attr("header", ci.header)}${attr("classdef", ci.classdef)}${attr("packageName", ci.packageName)}/>\n`;
  }

  return xml;
}

// -----------------------------------------------------------------------------
// InterfaceList
// -----------------------------------------------------------------------------

export function serializeEvent(ev: EventDeclaration, ind: number): string {
  const hasWith = ev.with && ev.with.length > 0;
  let xml = `${indent(ind)}<Event${attr("Name", ev.name)}${attr("Type", ev.type || "Event")}${attr("Comment", ev.comment)}`;
  if (!hasWith) {
    xml += "/>\n";
  } else {
    xml += ">\n";
    for (const w of ev.with!) {
      xml += `${indent(ind + 1)}<With${attr("Var", w)}/>\n`;
    }
    xml += `${indent(ind)}</Event>\n`;
  }
  return xml;
}

export function serializeVarDeclaration(v: VarDeclaration, ind: number): string {
  return `${indent(ind)}<VarDeclaration${attr("Name", v.name)}${attr("Type", v.type)}${attr("Comment", v.comment)}${attr("ArraySize", v.arraySize)}${attr("InitialValue", v.initialValue)}/>\n`;
}

export function serializeAdapter(a: AdapterDeclaration, tag: string, ind: number): string {
  return `${indent(ind)}<${tag}${attr("Name", a.name)}${attr("Type", a.type)}${attr("Comment", a.comment)}/>\n`;
}

function serializeInterfaceSection<T>(
  items: T[] | undefined,
  containerTag: string,
  ind: number,
  serializeItem: (item: T, ind: number) => string,
): string {
  if (items === undefined) return "";
  if (items.length === 0) return `${indent(ind)}<${containerTag}/>\n`;
  let xml = `${indent(ind)}<${containerTag}>\n`;
  for (const item of items) xml += serializeItem(item, ind + 1);
  xml += `${indent(ind)}</${containerTag}>\n`;
  return xml;
}

export function serializeInterfaceList(iface: InterfaceList, ind: number): string {
  let xml = `${indent(ind)}<InterfaceList>\n`;

  xml += serializeInterfaceSection(iface.eventInputs, "EventInputs", ind + 1, serializeEvent);
  xml += serializeInterfaceSection(iface.eventOutputs, "EventOutputs", ind + 1, serializeEvent);
  xml += serializeInterfaceSection(iface.inputVars, "InputVars", ind + 1, serializeVarDeclaration);
  xml += serializeInterfaceSection(iface.outputVars, "OutputVars", ind + 1, serializeVarDeclaration);
  xml += serializeInterfaceSection(iface.inOutVars, "InOutVars", ind + 1, serializeVarDeclaration);
  xml += serializeInterfaceSection(iface.sockets, "Sockets", ind + 1, (a, i) => serializeAdapter(a, "AdapterDeclaration", i));
  xml += serializeInterfaceSection(iface.plugs, "Plugs", ind + 1, (a, i) => serializeAdapter(a, "AdapterDeclaration", i));

  xml += `${indent(ind)}</InterfaceList>\n`;
  return xml;
}

export function serializeSubAppInterfaceList(iface: SubAppInterfaceList, ind: number): string {
  let xml = `${indent(ind)}<SubAppInterfaceList>\n`;

  xml += serializeInterfaceSection(iface.subAppEventInputs, "SubAppEventInputs", ind + 1,
    (ev, i) => `${indent(i)}<SubAppEvent${attr("Name", ev.name)}${attr("Type", ev.type || "Event")}${attr("Comment", ev.comment)}/>\n`);
  xml += serializeInterfaceSection(iface.subAppEventOutputs, "SubAppEventOutputs", ind + 1,
    (ev, i) => `${indent(i)}<SubAppEvent${attr("Name", ev.name)}${attr("Type", ev.type || "Event")}${attr("Comment", ev.comment)}/>\n`);
  xml += serializeInterfaceSection(iface.inputVars, "InputVars", ind + 1, serializeVarDeclaration);
  xml += serializeInterfaceSection(iface.outputVars, "OutputVars", ind + 1, serializeVarDeclaration);
  xml += serializeInterfaceSection(iface.sockets, "Sockets", ind + 1, (a, i) => serializeAdapter(a, "AdapterDeclaration", i));
  xml += serializeInterfaceSection(iface.plugs, "Plugs", ind + 1, (a, i) => serializeAdapter(a, "AdapterDeclaration", i));

  xml += `${indent(ind)}</SubAppInterfaceList>\n`;
  return xml;
}
