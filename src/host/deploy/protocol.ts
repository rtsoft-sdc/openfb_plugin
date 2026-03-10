import { createXmlParser } from "../parsing/xmlParserFactory";

/**
 * Build binary packet for openFB/FORTE protocol.
 * Format: [0x50] [0x00] [len_res] [resource_bytes] [0x50] [0x00] [len_xml] [xml_bytes]
 */
export function buildPacket(resource: string, xml: string): Buffer {
  const resBytes = Buffer.from(resource, "utf-8");
  const xmlBytes = Buffer.from(xml, "utf-8");

  if (resBytes.length > 255 || xmlBytes.length > 255) {
    throw new Error(`Resource or XML length exceeds 255 bytes`);
  }

  const packet = Buffer.alloc(6 + resBytes.length + xmlBytes.length);
  let offset = 0;

  packet.writeUInt8(0x50, offset++);
  packet.writeUInt8(0x00, offset++);
  packet.writeUInt8(resBytes.length, offset++);
  resBytes.copy(packet, offset);
  offset += resBytes.length;

  packet.writeUInt8(0x50, offset++);
  packet.writeUInt8(0x00, offset++);
  packet.writeUInt8(xmlBytes.length, offset++);
  xmlBytes.copy(packet, offset);

  return packet;
}

/**
 * Parse response packet from openFB/FORTE.
 * Expected format: [0x50] [0x00] [len_xml] [xml_bytes...]
 */
export function parseResponse(data: Buffer): string {
  if (data.length < 3) return "Insufficient data";
  if (data[0] !== 0x50 || data[1] !== 0x00) return "Invalid packet signature";

  const lenXml = data[2];
  if (data.length < 3 + lenXml) return "Incomplete XML in response";

  return data.slice(3, 3 + lenXml).toString("utf-8");
}

/**
 * Detect whether response XML contains error.
 */
export function detectXmlError(xml: string): { isError: boolean; message?: string } {
  if (!xml || typeof xml !== "string") return { isError: false };

  // Try to capture explicit <Error>...</Error>
  const errMatch = xml.match(/<Error[^>]*>([\s\S]*?)<\/Error>/i);
  if (errMatch) {
    return { isError: true, message: errMatch[1].trim() };
  }

  // Check for Response with Reason attribute
  const reasonMatch = xml.match(/<Response[^>]*Reason\s*=\s*"([^"]+)"[^>]*\/?>/i);
  if (reasonMatch) {
    const reason = reasonMatch[1].trim();
    if (/NO_SUCH_OBJECT/i.test(reason)) {
      return { isError: true, message: reason };
    }
  }

  // Tag with Status="Error"
  if (/Status\s*=\s*"(error)"/i.test(xml)) {
    // Try to extract text content from Response element
    const responseTextMatch = xml.match(/<Response[^>]*[^>]*>([\s\S]*?)<\/Response>/i);
    if (responseTextMatch) {
      const content = responseTextMatch[1].trim();
      // Extract text nodes, excluding nested XML tags
      const textNodes = content.replace(/<[^>]+>/g, '').trim();
      if (textNodes) {
        return { isError: true, message: textNodes };
      }
    }
    // Fallback to generic message
    return { isError: true, message: "Error response from server" };
  }

  // Check for Status="invalid"
  if (/Status\s*=\s*"invalid"/i.test(xml)) {
    // Try to extract descriptive text from Response element
    const responseTextMatch = xml.match(/<Response[^>]*[^>]*>([\s\S]*?)<\/Response>/i);
    if (responseTextMatch) {
      const content = responseTextMatch[1].trim();
      // Extract text nodes, excluding nested XML tags
      const textNodes = content.replace(/<[^>]+>/g, '').trim();
      if (textNodes) {
        return { isError: true, message: textNodes };
      }
    }
    // Fallback to generic message
    return { isError: true, message: "Configuration is in an invalid state" };
  }

  return { isError: false };
}

/**
 * Try to extract Request.FB.Name and Request.FB.Type from a command XML using fast-xml-parser.
 * Returns an object with optional `name` and `type` properties, or undefined on parse failure.
 */
export function extractRequestFbInfo(xml: string): { name?: string; type?: string } | undefined {
  if (!xml || typeof xml !== 'string') return undefined;
  try {
    const parser = createXmlParser();
    const doc = parser.parse(xml);
    const fb = doc?.Request?.FB;
    if (!fb) return undefined;

    const result: { name?: string; type?: string } = {};

    if (fb?.Name) result.name = fb.Name;
    if (fb?.Type) result.type = fb.Type;

    return result;
  } catch (e) {
    return undefined;
  }
}

/**
 * Extract resource names from QUERY response XML:
 * `<Response><FBList><FB Name="EMB_RES" .../></FBList></Response>`
 */
export function extractResourceNamesFromQueryResponse(xml: string): string[] {
  if (!xml || typeof xml !== "string") return [];

  const names = new Set<string>();
  const re = /<FB\b[^>]*\bName\s*=\s*"([^"]+)"[^>]*\/?\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const name = (m[1] || "").trim();
    if (name) names.add(name);
  }

  return Array.from(names);
}
