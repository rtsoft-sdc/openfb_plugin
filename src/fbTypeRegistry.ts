import * as fs from "fs";
import { promises as fsPromises } from "fs";
import * as path from "path";
import { XMLParser } from "fast-xml-parser";
import { parseFbtFile } from "./domain/fbtParser";
import { FBTypeModel } from "./domain/fbtModel";
import { getLogger } from "./logging";

export interface FBTypeInfo {
  name: string;
  filePath: string;
  rawXml?: string;
}

export class FBTypeRegistry {
  private cache = new Map<string, FBTypeInfo>();
  private logger = getLogger();

  constructor(private searchPaths: string[]) {}

  public scan() {
    this.logger.debug("Scanning for FBT files in paths", this.searchPaths);
    let totalFound = 0;
    
    for (const basePath of this.searchPaths) {
      if (!fs.existsSync(basePath)) {
        this.logger.warn("Search path does not exist", basePath);
        continue;
      }

      try {
        const files = fs.readdirSync(basePath);
        const fbtFiles = files.filter((f) => f.toLowerCase().endsWith(".fbt"));
        this.logger.debug(`Found ${fbtFiles.length} FBT files in`, basePath);

        for (const file of fbtFiles) {
          const fullPath = path.join(basePath, file);
          
          let declaredName = path.basename(file, ".fbt");
          try {
            const xml = fs.readFileSync(fullPath, 'utf8');
            const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
            const doc = parser.parse(xml);
            const insideName = doc?.FBType?.Name;
            if (insideName && typeof insideName === 'string' && insideName.length > 0) {
              declaredName = insideName;
            }
          } catch (err) {
            this.logger.warn(`Failed to parse FBT file ${file}, using filename`, err);
          }

          this.cache.set(declaredName, {
            name: declaredName,
            filePath: fullPath,
          });
          totalFound++;
        }
      } catch (err) {
        this.logger.error(`Error scanning directory ${basePath}`, err);
      }
    }
    
    this.logger.info("FBT scan complete, found", totalFound, "types");
  }

  public get(typeName: string): FBTypeInfo | undefined {
    return this.cache.get(typeName);
  }

  public async loadXml(typeName: string): Promise<string | undefined> {
    const info = this.cache.get(typeName);
    if (!info) return;

    if (!info.rawXml) {
      info.rawXml = await fsPromises.readFile(info.filePath, "utf8");
    }

    return info.rawXml;
  }

  public getAllTypes(): FBTypeInfo[] {
    return Array.from(this.cache.values());
  }

  public getTypeModel(typeName: string): FBTypeModel | undefined {
    const info = this.get(typeName);
    if (!info) {
      this.logger.warn(`FB type not found: "${typeName}". Available types: ${Array.from(this.cache.keys()).join(", ") || "none"}`);
      return;
    }

    try {
      const iface = parseFbtFile(info.filePath);

      const ports = [
        ...iface.eventInputs.map((name) => ({
          name,
          kind: "event" as const,
          direction: "input" as const,
        })),
        ...iface.eventOutputs.map((name) => ({
          name,
          kind: "event" as const,
          direction: "output" as const,
        })),
        ...iface.dataInputs.map((name) => ({
          name,
          kind: "data" as const,
          direction: "input" as const,
        })),
        ...iface.dataOutputs.map((name) => ({
          name,
          kind: "data" as const,
          direction: "output" as const,
        })),
      ];

      return {
        name: typeName,
        ports,
      };
    } catch (err) {
      this.logger.error(`Failed to parse FBT file for type "${typeName}"`, err);
      return;
    }
  }
}
