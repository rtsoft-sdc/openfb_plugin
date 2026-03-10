/**
 * Serializes NewFBTypeDefinition into XML string (.fbt or .sub format).
 * Element order strictly follows 4diac FBTImporter expectations.
 */

import type {
  NewFBTypeDefinition,
  Algorithm,
  ECC,
  FBNetwork,
  FBInstance,
  Connection,
  SubAppInstance,
  Service,
  Primitive,
} from "../../shared/fbtypes";
import type { BasicFBType } from "../../shared/fbtypes/basicFbType";
import type { SimpleFBType } from "../../shared/fbtypes/simpleFbType";
import type { CompositeFBType } from "../../shared/fbtypes/compositeFbType";
import type { ServiceInterfaceFBType } from "../../shared/fbtypes/serviceInterfaceFbType";
import type { SubAppType } from "../../shared/fbtypes/subAppType";
import {
  attr,
  indent,
  serializeMetadata,
  serializeVarDeclaration,
  serializeInterfaceList,
  serializeSubAppInterfaceList,
} from "./interfaceSerializer";

// -----------------------------------------------------------------------------
// BasicFB
// -----------------------------------------------------------------------------

function serializeECC(ecc: ECC, ind: number): string {
  let xml = `${indent(ind)}<ECC>\n`;

  for (const st of ecc.states) {
    const hasActions = st.actions && st.actions.length > 0;
    xml += `${indent(ind + 1)}<ECState${attr("Name", st.name)}${attr("Comment", st.comment)}${attr("x", st.x)}${attr("y", st.y)}`;
    if (!hasActions) {
      xml += "/>\n";
    } else {
      xml += ">\n";
      for (const act of st.actions!) {
        xml += `${indent(ind + 2)}<ECAction${attr("Algorithm", act.algorithm)}${attr("Output", act.output)}/>\n`;
      }
      xml += `${indent(ind + 1)}</ECState>\n`;
    }
  }

  for (const tr of ecc.transitions) {
    xml += `${indent(ind + 1)}<ECTransition${attr("Source", tr.source)}${attr("Destination", tr.destination)}${attr("Condition", tr.condition)}${attr("Comment", tr.comment)}${attr("x", tr.x)}${attr("y", tr.y)}/>\n`;
  }

  xml += `${indent(ind)}</ECC>\n`;
  return xml;
}

function serializeAlgorithm(alg: Algorithm, ind: number): string {
  const language = alg.language || "ST";
  const tag = language === "C" ? "C" : "ST";
  const body = alg.body ?? "";
  let xml = `${indent(ind)}<Algorithm${attr("Name", alg.name)}${attr("Comment", alg.comment)}${attr("Language", language)}>\n`;
  xml += `${indent(ind + 1)}<${tag}><![CDATA[\n${body}\n]]></${tag}>` + "\n";
  xml += `${indent(ind)}</Algorithm>\n`;
  return xml;
}

function serializeBasicFB(def: BasicFBType, ind: number): string {
  let xml = `${indent(ind)}<BasicFB>\n`;

  if (def.basicFB.internalVars && def.basicFB.internalVars.length > 0) {
    xml += `${indent(ind + 1)}<InternalVars>\n`;
    for (const v of def.basicFB.internalVars) xml += serializeVarDeclaration(v, ind + 2);
    xml += `${indent(ind + 1)}</InternalVars>\n`;
  }

  xml += serializeECC(def.basicFB.ecc, ind + 1);

  if (def.basicFB.algorithms) {
    for (const alg of def.basicFB.algorithms) xml += serializeAlgorithm(alg, ind + 1);
  }

  xml += `${indent(ind)}</BasicFB>\n`;
  return xml;
}

// -----------------------------------------------------------------------------
// SimpleFB
// -----------------------------------------------------------------------------

function serializeSimpleFB(def: SimpleFBType, ind: number): string {
  let xml = `${indent(ind)}<SimpleFB>\n`;

  if (def.simpleFB.internalVars && def.simpleFB.internalVars.length > 0) {
    xml += `${indent(ind + 1)}<InternalVars>\n`;
    for (const v of def.simpleFB.internalVars) xml += serializeVarDeclaration(v, ind + 2);
    xml += `${indent(ind + 1)}</InternalVars>\n`;
  }

  if (def.simpleFB.algorithm) {
    xml += serializeAlgorithm(def.simpleFB.algorithm, ind + 1);
  }

  xml += `${indent(ind)}</SimpleFB>\n`;
  return xml;
}

// -----------------------------------------------------------------------------
// FBNetwork (Composite / SubApp)
// -----------------------------------------------------------------------------

function serializeConnection(conn: Connection, ind: number): string {
  return `${indent(ind)}<Connection${attr("Source", conn.source)}${attr("Destination", conn.destination)}${attr("dx1", conn.dx1)}${attr("dx2", conn.dx2)}${attr("dy", conn.dy)}/>\n`;
}

function serializeFBInstance(fb: FBInstance, ind: number): string {
  return `${indent(ind)}<FB${attr("Name", fb.name)}${attr("Type", fb.type)}${attr("x", fb.x)}${attr("y", fb.y)}/>\n`;
}

function serializeSubAppInstance(sub: SubAppInstance, ind: number): string {
  const hasNetwork = sub.fbNetwork && (
    (sub.fbNetwork.fbInstances && sub.fbNetwork.fbInstances.length > 0) ||
    (sub.fbNetwork.eventConnections && sub.fbNetwork.eventConnections.length > 0) ||
    (sub.fbNetwork.dataConnections && sub.fbNetwork.dataConnections.length > 0)
  );
  let xml = `${indent(ind)}<SubApp${attr("Name", sub.name)}${attr("Type", sub.type)}${attr("x", sub.x)}${attr("y", sub.y)}`;
  if (!hasNetwork) {
    xml += "/>\n";
  } else {
    xml += ">\n";
    xml += serializeFBNetwork(sub.fbNetwork!, ind + 1);
    xml += `${indent(ind)}</SubApp>\n`;
  }
  return xml;
}

function serializeFBNetwork(net: FBNetwork, ind: number): string {
  let xml = `${indent(ind)}<FBNetwork>\n`;

  if (net.fbInstances) {
    for (const fb of net.fbInstances) xml += serializeFBInstance(fb, ind + 1);
  }

  if (net.subApps) {
    for (const sub of net.subApps) xml += serializeSubAppInstance(sub, ind + 1);
  }

  if (net.eventConnections && net.eventConnections.length > 0) {
    xml += `${indent(ind + 1)}<EventConnections>\n`;
    for (const c of net.eventConnections) xml += serializeConnection(c, ind + 2);
    xml += `${indent(ind + 1)}</EventConnections>\n`;
  }

  if (net.dataConnections && net.dataConnections.length > 0) {
    xml += `${indent(ind + 1)}<DataConnections>\n`;
    for (const c of net.dataConnections) xml += serializeConnection(c, ind + 2);
    xml += `${indent(ind + 1)}</DataConnections>\n`;
  }

  if (net.adapterConnections && net.adapterConnections.length > 0) {
    xml += `${indent(ind + 1)}<AdapterConnections>\n`;
    for (const c of net.adapterConnections) xml += serializeConnection(c, ind + 2);
    xml += `${indent(ind + 1)}</AdapterConnections>\n`;
  }

  xml += `${indent(ind)}</FBNetwork>\n`;
  return xml;
}

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

function serializePrimitive(p: Primitive, tag: string, ind: number): string {
  return `${indent(ind)}<${tag}${attr("Interface", p.interface)}${attr("Event", p.event)}${attr("Parameters", p.parameters)}/>\n`;
}

function serializeService(svc: Service, ind: number): string {
  let xml = `${indent(ind)}<Service${attr("LeftInterface", svc.leftInterface || "APPLICATION")}${attr("RightInterface", svc.rightInterface || "RESOURCE")}>\n`;

  if (svc.sequences) {
    for (const seq of svc.sequences) {
      xml += `${indent(ind + 1)}<ServiceSequence${attr("Name", seq.name)}${attr("Comment", seq.comment)}>\n`;
      if (seq.transactions) {
        for (const tx of seq.transactions) {
          xml += `${indent(ind + 2)}<ServiceTransaction>\n`;
          if (tx.inputPrimitive) {
            xml += serializePrimitive(tx.inputPrimitive, "InputPrimitive", ind + 3);
          }
          if (tx.outputPrimitives) {
            for (const op of tx.outputPrimitives) {
              xml += serializePrimitive(op, "OutputPrimitive", ind + 3);
            }
          }
          xml += `${indent(ind + 2)}</ServiceTransaction>\n`;
        }
      }
      xml += `${indent(ind + 1)}</ServiceSequence>\n`;
    }
  }

  xml += `${indent(ind)}</Service>\n`;
  return xml;
}

// -----------------------------------------------------------------------------
// Top-level serialization
// -----------------------------------------------------------------------------

function serializeFBType(def: NewFBTypeDefinition): string {
  const isSubApp = def.category === "SUBAPP";
  const rootTag = isSubApp ? "SubAppType" : "FBType";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<${rootTag}${attr("Name", def.name)}${attr("Comment", def.comment)}>\n`;

  // 1. Metadata
  xml += serializeMetadata(def, 1);

  // 2. InterfaceList
  if (def.category === "SUBAPP") {
    const subDef = def as SubAppType;
    if (subDef.interfaceList) xml += serializeSubAppInterfaceList(subDef.interfaceList, 1);
  } else {
    const fbDef = def as BasicFBType | SimpleFBType | CompositeFBType | ServiceInterfaceFBType;
    if (fbDef.interfaceList) xml += serializeInterfaceList(fbDef.interfaceList, 1);
  }

  // 3. Type-specific content
  switch (def.category) {
    case "BASIC":
      xml += serializeBasicFB(def as BasicFBType, 1);
      break;
    case "SIMPLE":
      xml += serializeSimpleFB(def as SimpleFBType, 1);
      break;
    case "COMPOSITE":
      xml += serializeFBNetwork((def as CompositeFBType).fbNetwork, 1);
      break;
    case "SERVICE":
      xml += serializeService((def as ServiceInterfaceFBType).service, 1);
      break;
    case "SUBAPP": {
      const subDef = def as SubAppType;
      // SubApp uses SubAppNetwork tag
      xml += `  <SubAppNetwork>\n`;
      const net = subDef.subAppNetwork;
      if (net.fbInstances) {
        for (const fb of net.fbInstances) xml += serializeFBInstance(fb, 2);
      }
      if (net.subApps) {
        for (const sub of net.subApps) xml += serializeSubAppInstance(sub, 2);
      }
      if (net.eventConnections && net.eventConnections.length > 0) {
        xml += `    <EventConnections>\n`;
        for (const c of net.eventConnections) xml += serializeConnection(c, 3);
        xml += `    </EventConnections>\n`;
      }
      if (net.dataConnections && net.dataConnections.length > 0) {
        xml += `    <DataConnections>\n`;
        for (const c of net.dataConnections) xml += serializeConnection(c, 3);
        xml += `    </DataConnections>\n`;
      }
      if (net.adapterConnections && net.adapterConnections.length > 0) {
        xml += `    <AdapterConnections>\n`;
        for (const c of net.adapterConnections) xml += serializeConnection(c, 3);
        xml += `    </AdapterConnections>\n`;
      }
      xml += `  </SubAppNetwork>\n`;
      if (subDef.service) xml += serializeService(subDef.service, 1);
      break;
    }
  }

  xml += `</${rootTag}>\n`;
  return xml;
}

/**
 * Returns the file extension for the given FB type definition.
 */
export function getFBTypeFileExtension(def: NewFBTypeDefinition): string {
  return def.category === "SUBAPP" ? ".sub" : ".fbt";
}

/**
 * Serialize a NewFBTypeDefinition to XML string.
 */
export function serializeNewFBType(def: NewFBTypeDefinition): string {
  return serializeFBType(def);
}
