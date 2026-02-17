import * as fs from "fs";
import * as path from "path";
import { FBInterface, parseFbtFile } from "../../domain/fbtParser";

/**
 * Resolves FBT files and caches their interfaces.
 * Handles recursive file search and parameter direction/type resolution.
 */
export class FbtResolver {
  private fbtCache = new Map<string, FBInterface>();
  private fileSearchCache = new Map<string, string | undefined>();

  constructor(
    private sysPath: string,
    private searchPaths: string[],
  ) {}

  /**
   * Finds a file recursively in the given directory.
   * Results are cached to avoid repeated filesystem operations.
   */
  private findFileRecursive(dir: string, fileName: string): string | undefined {
    const cacheKey = `${dir}|${fileName}`;
    if (this.fileSearchCache.has(cacheKey)) {
      return this.fileSearchCache.get(cacheKey);
    }

    try {
      const filePath = path.join(dir, fileName);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        this.fileSearchCache.set(cacheKey, filePath);
        return filePath;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDirPath = path.join(dir, entry.name);
          const found = this.findFileRecursive(subDirPath, fileName);
          if (found) {
            this.fileSearchCache.set(cacheKey, found);
            return found;
          }
        }
      }
    } catch (err) {
      // Silently skip directories we can't access
    }

    this.fileSearchCache.set(cacheKey, undefined);
    return undefined;
  }

  /**
   * Resolves parameter direction and type from the FBT file definition.
   * Returns empty object if the parameter is not found or FBT file doesn't exist.
   */
  resolveParameterInfo(
    typeShort: string,
    paramName: string,
  ): { direction?: string; type?: string } {
    const sysDir = path.dirname(this.sysPath);
    const searchDirs = [sysDir, ...this.searchPaths];

    for (const dir of searchDirs) {
      if (!dir || !fs.existsSync(dir)) continue;

      for (const fileName of [`${typeShort}.fbt`, `${typeShort.toUpperCase()}.fbt`]) {
        const filePath = this.findFileRecursive(dir, fileName);
        if (!filePath) continue;

        const cacheKey = filePath.toLowerCase();
        let iface = this.fbtCache.get(cacheKey);
        if (!iface) {
          try {
            iface = parseFbtFile(filePath);
            this.fbtCache.set(cacheKey, iface);
          } catch (err) {
            continue;
          }
        }

        const inputMatch = iface.dataInputs.find((p) => p.name === paramName);
        if (inputMatch) {
          return { direction: inputMatch.direction, type: inputMatch.type };
        }
        const outputMatch = iface.dataOutputs.find((p) => p.name === paramName);
        if (outputMatch) {
          return { direction: outputMatch.direction, type: outputMatch.type };
        }
      }
    }

    return {};
  }
}
