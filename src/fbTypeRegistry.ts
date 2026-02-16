import * as fs from "fs";
import { promises as fsPromises } from "fs";
import * as path from "path";
import { XMLParser } from "fast-xml-parser";
import { parseFbtFile } from "./domain/fbtParser";
import { parseSubFile } from "./domain/subParser";
import { FBTypeModel } from "./domain/fbtModel";
import { getLogger } from "./logging";

export interface FBTypeInfo {
  name: string;
  filePath: string;
  rawXml?: string;
  fileType?: "fbt" | "sub";
}

export class FBTypeRegistry {
  private cache = new Map<string, FBTypeInfo>();
  private logger = getLogger();

  constructor(private searchPaths: string[]) {}

  /**
   * Recursively search for a file in a directory and its subdirectories
   */
  private findFileRecursive(dir: string, fileName: string): string | undefined {
    try {
      // First check if file exists directly in this directory
      const filePath = path.join(dir, fileName);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return filePath;
      }

      // Then search in subdirectories
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDirPath = path.join(dir, entry.name);
          const found = this.findFileRecursive(subDirPath, fileName);
          if (found) {
            return found;
          }
        }
      }
    } catch (err) {
      // Silently skip directories we can't access
    }
    return undefined;
  }

  /**
   * Scan for specific FB types only
   * This method searches for .fbt files matching the given type names
   * and loads them into cache (searches recursively in subdirectories)
   */
  public scanForTypes(typeNames: string[]) {
    this.logger.debug("Scanning for specific FB types", typeNames);
    let totalFound = 0;
    const notFound: string[] = [];
    
    for (const typeName of typeNames) {
      if (this.cache.has(typeName)) {
        // Already cached
        continue;
      }

      let found = false;
      for (const basePath of this.searchPaths) {
        if (!fs.existsSync(basePath)) {
          continue;
        }

        try {
          // Search for typeName.fbt recursively in basePath and subdirectories
          const fbtPath = this.findFileRecursive(basePath, `${typeName}.fbt`);
          if (fbtPath) {
            let declaredName = typeName;
            try {
              const xml = fs.readFileSync(fbtPath, "utf8");
              const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
              const doc = parser.parse(xml);
              const insideName = doc?.FBType?.Name;
              if (insideName && typeof insideName === "string" && insideName.length > 0) {
                declaredName = insideName;
              }
            } catch (err) {
              this.logger.warn(`Failed to parse FBT file ${fbtPath}, using filename as type name`, err);
            }

            this.cache.set(declaredName, {
              name: declaredName,
              filePath: fbtPath,
              fileType: "fbt",
            });
            this.logger.debug(`Found FB type "${typeName}" at ${fbtPath}`);
            totalFound++;
            found = true;
            break;
          }

          const subPath = this.findFileRecursive(basePath, `${typeName}.sub`);
          if (subPath) {
            let declaredName = typeName;
            try {
              const xml = fs.readFileSync(subPath, "utf8");
              const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
              const doc = parser.parse(xml);
              const insideName = doc?.SubAppType?.Name;
              if (insideName && typeof insideName === "string" && insideName.length > 0) {
                declaredName = insideName;
              }
            } catch (err) {
              this.logger.warn(`Failed to parse SUB file ${subPath}, using filename as type name`, err);
            }

            this.cache.set(declaredName, {
              name: declaredName,
              filePath: subPath,
              fileType: "sub",
            });
            this.logger.debug(`Found SubApp type "${typeName}" at ${subPath}`);
            totalFound++;
            found = true;
            break;
          }
        } catch (err) {
          this.logger.error(`Error searching for type ${typeName} in ${basePath}`, err);
        }
      }

      if (!found) {
        notFound.push(typeName);
      }
    }

    if (notFound.length > 0) {
      this.logger.warn(`FB types not found: ${notFound.join(", ")}`);
    }
    this.logger.info(`FB type scan complete, found ${totalFound} types, not found ${notFound.length} types`);
  }

  /**
   * Legacy: Scan all FBT files in search paths
   */
  public scan() {
    this.logger.debug("Scanning for all FBT files in paths", this.searchPaths);
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
      const iface = info.fileType === "sub"
        ? parseSubFile(info.filePath)
        : parseFbtFile(info.filePath);

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
