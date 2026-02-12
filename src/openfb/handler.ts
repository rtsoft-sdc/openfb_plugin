import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import { XMLParser } from "fast-xml-parser";
import * as vscode from "vscode";
import { getLogger } from "../logging";

let openfbResponsesChannel: vscode.OutputChannel | undefined;
export function setResponsesChannel(ch: vscode.OutputChannel) {
  openfbResponsesChannel = ch;
}

/**
 * Build binary packet for openFB/FORTE protocol
 * Format: [0x50] [0x00] [len_res] [resource_bytes] [0x50] [0x00] [len_xml] [xml_bytes]
 */
function buildPacket(resource: string, xml: string): Buffer {
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
 * Parse response packet from openFB/FORTE
 * Expected format: [0x50] [0x00] [len_xml] [xml_bytes...]
 */
function parseResponse(data: Buffer): string {
  
  if (data.length < 3) return "Insufficient data";
  if (data[0] !== 0x50 || data[1] !== 0x00) return "Invalid packet signature";

  const lenXml = data[2];
  if (data.length < 3 + lenXml) return "Incomplete XML in response";

  return data.slice(3, 3 + lenXml).toString("utf-8");
}

/**
 * Detect whether response XML contains error.
 */
function detectXmlError(xml: string): { isError: boolean; message?: string } {
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
function extractRequestFbInfo(xml: string): { name?: string; type?: string } | undefined {
  if (!xml || typeof xml !== 'string') return undefined;
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
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

export class OpenFBHandler {
  private logger = getLogger();

  constructor() {}

  /**
   * Load, parse, and prepare .fboot file for deployment
   */
  private async loadAndParseFile(fbootPath: string): Promise<string[]> {
    const content = await fs.promises.readFile(fbootPath, "utf8");
    const lines = content
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith("#"));

    if (lines.length === 0) {
      throw new Error(".fboot is empty or contains only comments");
    }

    return lines;
  }

  /**
   * Ensure QUERY command is present at the beginning
   */
  private ensureQueryPresent(lines: string[]): void {
    const hasQuery = lines.some(l => l.includes('Action="QUERY"'));
    if (!hasQuery) {
      lines.unshift(';<Request ID="0" Action="QUERY"><FB Name="*" Type="*"/></Request>');
    }
  }

  /**
   * Parse a command line into resource and xml parts
   * Format: resource;xml or ;xml (empty resource if starts with ;)
   */
  private parseCommandLine(line: string): { resource: string; xml: string } | null {
    let resource = "";
    let xml = line;

    if (xml.startsWith(";")) {
      xml = xml.slice(1).trim();
    } else {
      const sepIndex = xml.indexOf(";");
      if (sepIndex !== -1) {
        resource = xml.substring(0, sepIndex).trim();
        xml = xml.substring(sepIndex + 1).trim();
      }
    }

    return xml ? { resource, xml } : null;
  }

  /**
   * Send a single command via socket and wait for response
   */
  private async sendCommand(
    socket: net.Socket,
    resource: string,
    xml: string,
    commandIndex: number,
    totalCommands: number
  ): Promise<string> {
    this.logger.info(`Sending command ${commandIndex + 1}/${totalCommands}`, xml.substring(0, 60));

    const packet = buildPacket(resource, xml);
    socket.write(packet);

    // Wait for response



    // Accumulate incoming data chunks until a full response packet is received.
    return await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalLen = 0;

      const cmdTimer = setTimeout(() => {
        socket.removeListener("data", onData);
        reject(new Error("Timeout waiting for response from server"));
      }, 5000);

      function cleanup() {
        clearTimeout(cmdTimer);
      }

      const onData = (chunk: Buffer) => {
        const cmdLabel = `cmd ${commandIndex + 1}/${totalCommands}`;

        chunks.push(chunk);
        totalLen += chunk.length;
        const buf = Buffer.concat(chunks, totalLen);

        if (buf.length >= 3) {
          const lenXml = buf[2];
          if (buf.length >= 3 + lenXml) {
            socket.removeListener("data", onData);
            cleanup();

            const respBuf = buf.slice(0, 3 + lenXml);
            const responseStr = parseResponse(respBuf);

            this.logger.debug(`Received response ${cmdLabel} ${resource}`);

            // Check for XML-level error
            const xmlError = detectXmlError(responseStr);
            if (xmlError.isError) {
              const shortRes = resource || "<no resource>";
              
              let msg = xmlError.message || responseStr || "Error response from server";
              if (/NO_SUCH_OBJECT/i.test(msg)) {
                msg = `Объект не найден`;
              }

              const cmdLabel = `cmd ${commandIndex + 1}/${totalCommands}`;

              // Try to extract object name and type from the XML (Request.FB.Name and Request.FB.Type)
              const fbInfo = extractRequestFbInfo(xml) || {};
              const objectInfoParts: string[] = [];
              if (fbInfo.name) objectInfoParts.push(`object=${fbInfo.name}`);
              if (fbInfo.type) objectInfoParts.push(`type=${fbInfo.type}`);
              const objectInfo = objectInfoParts.length ? ` ${objectInfoParts.join(' ')}` : '';

              // Log which fboot command caused the server error (resource + object)
              this.logger.error(`OpenFB error ${cmdLabel} for ${shortRes}: ${msg}${objectInfo}`);

              // Log the same error message to the responses output channel
              try {
                if (openfbResponsesChannel) {
                  openfbResponsesChannel.appendLine('------------------------------------------------------------');
                  openfbResponsesChannel.appendLine(`OpenFB error ${cmdLabel} for ${shortRes}: ${msg}${objectInfo}`);
                  openfbResponsesChannel.appendLine('');
                }
              } catch (e) {
                // ignore output channel errors
              }

              try { vscode.window.showErrorMessage(`Ошибка деплоя OpenFB (${cmdLabel} ${shortRes}): ${msg}`); } catch (e) {}
              reject(new Error(`OpenFB error ${cmdLabel} for ${shortRes}: ${msg}`));
              return;
            }

            resolve(responseStr);
          }
        }
      }

      socket.on("data", onData);
    });
  }

  /**
   * Deploy .fboot file to openFB/FORTE via binary packet protocol.
   * Uses FORTE-compatible binary format with resource+xml packets.
   * Automatically adds QUERY if not present in file.
   */
  async deploy(fbootPath: string): Promise<void> {
    this.logger.info("OpenFBHandler.deploy called", fbootPath);

    if (!fs.existsSync(fbootPath)) {
      throw new Error(`.fboot file not found: ${fbootPath}`);
    }

    const config = vscode.workspace.getConfiguration("openfb");
    const host = (config.get<string>("host") || "127.0.0.1");
    const port = (config.get<number>("port") || 61499);
    const timeoutMs = (config.get<number>("deployTimeoutMs") || 30000);

    // Load and parse file
    let lines = await this.loadAndParseFile(fbootPath);
    this.ensureQueryPresent(lines);

    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Deploy ${path.basename(fbootPath)}`,
      cancellable: false,
    }, (progress) => {
      return new Promise<void>((resolve, reject) => {
        this.deployWithSocket(lines, host, port, timeoutMs, progress, resolve, reject);
      });
    });
  }

  /**
   * Internal method to handle socket-based deployment
   */
  private deployWithSocket(
    lines: string[],
    host: string,
    port: number,
    timeoutMs: number,
    progress: vscode.Progress<{ message?: string }>,
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    const socket = new net.Socket();
    let finished = false;
    let timer: NodeJS.Timeout | undefined;
    let commandsSent = 0;
    let lastCommandResource: string | undefined;

    const cleanUp = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      try { socket.destroy(); } catch (e) {}
    };

    timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanUp();
      reject(new Error("Deploy timed out"));
    }, timeoutMs);

    socket.on("error", (err) => {
      if (finished) return;
      finished = true;
      this.logger.error("Socket error during deploy", err);
      cleanUp();
      reject(err);
    });

    socket.on("close", (hadError) => {
      if (finished) return;
      finished = true;
      this.logger.info("Deploy socket closed", { hadError });
      cleanUp();
      // If the socket closed before all commands were sent, treat as error
      if (commandsSent < lines.length) {
        const nextIdx = commandsSent + 1;
        const nextRes = lastCommandResource || "<unknown resource>";
        reject(new Error(`Connection closed prematurely after ${commandsSent}/${lines.length} commands (next ${nextIdx}/${lines.length} resource=${nextRes})`));
        return;
      }

      if (hadError) {
        reject(new Error("Connection closed with error"));
      } else {
        resolve();
      }
    });

    socket.connect(port, host, async () => {
      this.logger.info("Connected to openFB", { host, port });

      try {
        for (let i = 0; i < lines.length; i++) {
          const parsed = this.parseCommandLine(lines[i]);
          if (!parsed) continue;  // Skip empty XML
          
          lastCommandResource = parsed.resource || "<no resource>";

          await this.sendCommand(socket, parsed.resource, parsed.xml, i, lines.length);
          commandsSent++;
          progress.report({ message: `Sent ${i + 1}/${lines.length}` });
        }

        // Gracefully close write side
        socket.end();
      } catch (err) {
        if (!finished) {
          finished = true;
          cleanUp();
          reject(err as Error);
        }
      }
    });
  }
}

