import * as fs from "fs";
import { createXmlParser, readAndParseXml } from "./xmlParserFactory";
import { findFileRecursive } from "./fileSearch";
import { FBInterface, parseFbtFile } from "./fbtParser";

export type TypeFileKind = "fbt" | "sub";

/**
 * Shared resolver for type files (.fbt/.sub) with in-memory caches.
 */
export class TypeFileResolver {
  private fileSearchCache = new Map<string, string | undefined>();
  private declaredNameCache = new Map<string, string | undefined>();
  private fbtInterfaceCache = new Map<string, FBInterface | undefined>();

  constructor(private searchDirs: string[]) {}

  /**
   * Resolve file path for a type by searching recursively in configured search directories.
   */
  resolveTypeFile(typeShort: string, kind: TypeFileKind): string | undefined {
    for (const dir of this.searchDirs) {
      if (!dir || !fs.existsSync(dir)) {
        continue;
      }

      for (const fileName of [`${typeShort}.${kind}`, `${typeShort.toUpperCase()}.${kind}`]) {
        const found = this.findFileRecursiveCached(dir, fileName);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract declared type name from .fbt/.sub XML (Name attribute in FBType/SubAppType).
   */
  getDeclaredTypeName(filePath: string, kind: TypeFileKind): string | undefined {
    const cacheKey = `${filePath}|${kind}`.toLowerCase();
    if (this.declaredNameCache.has(cacheKey)) {
      return this.declaredNameCache.get(cacheKey);
    }

    try {
      const doc = readAndParseXml(filePath);
      const name = kind === "fbt" ? doc?.FBType?.Name : doc?.SubAppType?.Name;
      const resolved = typeof name === "string" && name.length > 0 ? name : undefined;
      this.declaredNameCache.set(cacheKey, resolved);
      return resolved;
    } catch {
      this.declaredNameCache.set(cacheKey, undefined);
      return undefined;
    }
  }

  /**
   * Parse and cache only FBT interface list.
   */
  getFbtInterface(filePath: string): FBInterface | undefined {
    const cacheKey = filePath.toLowerCase();
    if (this.fbtInterfaceCache.has(cacheKey)) {
      return this.fbtInterfaceCache.get(cacheKey);
    }

    try {
      const iface = parseFbtFile(filePath);
      this.fbtInterfaceCache.set(cacheKey, iface);
      return iface;
    } catch {
      this.fbtInterfaceCache.set(cacheKey, undefined);
      return undefined;
    }
  }

  private findFileRecursiveCached(dir: string, fileName: string): string | undefined {
    const cacheKey = `${dir}|${fileName}`;
    if (this.fileSearchCache.has(cacheKey)) {
      return this.fileSearchCache.get(cacheKey);
    }

    const found = findFileRecursive(dir, fileName);
    this.fileSearchCache.set(cacheKey, found);
    return found;
  }
}
