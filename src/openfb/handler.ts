import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import * as vscode from "vscode";
import { getLogger } from "../logging";

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
    const responseData = await new Promise<Buffer>((res) => {
      socket.once("data", res);
    });

    const responseStr = parseResponse(responseData);
    this.logger.info(`Response to cmd ${commandIndex + 1}:`, responseStr);
    return responseStr;
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

          await this.sendCommand(socket, parsed.resource, parsed.xml, i, lines.length);
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

