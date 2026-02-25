import * as fs from "fs";
import { promises as fsPromises } from "fs";
import * as path from "path";
import { parseSubFile } from "./domain/subParser";
import { FBTypeModel } from "./domain/fbtModel";
import { TypeFileResolver } from "./domain/typeFileResolver";
import { getLogger } from "./logging";

export interface FBTypeInfo {
  name: string;
  filePath: string;
  rawXml?: string;
  fileType?: "fbt" | "sub";
  sourcePath?: string; // Relative path from library root (e.g., "stdlib/convert")
}

/**
 * Hierarchical tree node for displaying FB types in folder structure
 */
export interface TreeNode {
  name: string;              // "stdlib", "convert", "ADD"
  type: "folder" | "type";
  children?: TreeNode[];     // For folders
  sourcePath?: string;       // For types (full path like "stdlib/convert")
}

export class FBTypeRegistry {
  private cache = new Map<string, FBTypeInfo>();
  private logger = getLogger();
  private typeResolver: TypeFileResolver;

  constructor(private searchPaths: string[]) {
    this.typeResolver = new TypeFileResolver(searchPaths);
  }

  /**
   * Recursively find all FBT files in a directory
   * Returns array with {searchPathRoot, sourcePath, typeName, filePath}
   * searchPathRoot: which SearchPath this came from (e.g., "/path/to/stdlib")
   * sourcePath: relative path from searchPathRoot (e.g., "convert")
   */
  private scanDirForAllTypes(dir: string, basePath: string, relPath: string = ""): Array<{ searchPathRoot: string; sourcePath: string; typeName: string; filePath: string }> {
    let results: Array<{ searchPathRoot: string; sourcePath: string; typeName: string; filePath: string }> = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const itemRelPath = relPath ? path.join(relPath, entry.name) : entry.name;
        
        if (entry.isDirectory()) {
          // Recurse into subdirectories
          results = results.concat(this.scanDirForAllTypes(fullPath, basePath, itemRelPath));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".fbt")) {
          // Extract type name from filename
          const typeName = path.basename(entry.name, ".fbt");
          const sourcePath = relPath; // Folder where file is located (relative to basePath)
          
          results.push({ searchPathRoot: basePath, sourcePath, typeName, filePath: fullPath });
        }
      }
    } catch (err) {
      this.logger.debug(`Error scanning directory ${dir}`, err);
    }
    
    return results;
  }

  /**
   * Scan for specific FB types only
   * This method searches for .fbt files matching the given type names
   * and loads them into cache (searches recursively in subdirectories)
   * Tracks sourcePath (folder hierarchy) for each type
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
          const fbtPath = this.typeResolver.resolveTypeFile(typeName, "fbt");
          if (fbtPath) {
            const declaredName = this.typeResolver.getDeclaredTypeName(fbtPath, "fbt") || typeName;

            // Calculate sourcePath (folder hierarchy relative to basePath)
            const fileDir = path.dirname(fbtPath);
            const sourcePath = fileDir === basePath ? "" : path.relative(basePath, fileDir);

            this.cache.set(declaredName, {
              name: declaredName,
              filePath: fbtPath,
              fileType: "fbt",
              sourcePath,
            });
            this.logger.debug(`Found FB type "${typeName}" at ${fbtPath} (sourcePath: "${sourcePath}")`);
            totalFound++;
            found = true;
            break;
          }

          const subPath = this.typeResolver.resolveTypeFile(typeName, "sub");
          if (subPath) {
            const declaredName = this.typeResolver.getDeclaredTypeName(subPath, "sub") || typeName;

            // Calculate sourcePath (folder hierarchy relative to basePath)
            const fileDir = path.dirname(subPath);
            const sourcePath = fileDir === basePath ? "" : path.relative(basePath, fileDir);

            this.cache.set(declaredName, {
              name: declaredName,
              filePath: subPath,
              fileType: "sub",
              sourcePath,
            });
            this.logger.debug(`Found SubApp type "${typeName}" at ${subPath} (sourcePath: "${sourcePath}")`);
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
   * Build hierarchical tree with SearchPath as root level
   * Input: items with {searchPathRoot, folderPath, name, sourcePath}
   * Output: TreeNode[] where each root is a SearchPath, with nested folders and types
   */
  private buildTreeFromTypes(typesByPath: Array<{ searchPathRoot: string; folderPath: string; name: string; sourcePath: string }>): TreeNode[] {
    // Group by SearchPath first
    const bySearchPath = new Map<string, Array<{ folderPath: string; name: string; sourcePath: string }>>();
    
    for (const item of typesByPath) {
      if (!bySearchPath.has(item.searchPathRoot)) {
        bySearchPath.set(item.searchPathRoot, []);
      }
      bySearchPath.get(item.searchPathRoot)!.push({
        folderPath: item.folderPath,
        name: item.name,
        sourcePath: item.sourcePath,
      });
    }
    
    // Build recursive tree for each SearchPath
    const buildFolderTree = (items: Array<{ folderPath: string; name: string; sourcePath: string }>): TreeNode[] => {
      const itemsByFirstLevel = new Map<string, {
        type: "type" | "folder";
        items?: Array<{ folderPath: string; name: string; sourcePath: string }>;
        sourcePath?: string;
      }>();
      
      for (const item of items) {
        // Normalize path separators to forward slash and split
        const normalizedPath = item.folderPath.replace(/\\/g, "/");
        const parts = normalizedPath === "" ? [] : normalizedPath.split("/").filter(p => p);
        
        if (parts.length === 0) {
          // Root-level type
          if (!itemsByFirstLevel.has(item.name)) {
            itemsByFirstLevel.set(item.name, {
              type: "type",
              sourcePath: item.sourcePath,
            });
          }
        } else {
          // Type in a folder
          const firstFolder = parts[0];
          if (!itemsByFirstLevel.has(firstFolder)) {
            itemsByFirstLevel.set(firstFolder, {
              type: "folder",
              items: [],
            });
          }
          
          const node = itemsByFirstLevel.get(firstFolder)!;
          if (node.items) {
            const remainingPath = parts.slice(1).join("/");
            node.items.push({
              folderPath: remainingPath,
              name: item.name,
              sourcePath: item.sourcePath,
            });
          }
        }
      }
      
      // Convert to TreeNode[] and recurse
      const result: TreeNode[] = [];
      
      for (const [name, info] of itemsByFirstLevel) {
        if (info.type === "type") {
          result.push({
            name,
            type: "type",
            sourcePath: info.sourcePath,
          });
        } else {
          const children = buildFolderTree(info.items || []);
          result.push({
            name,
            type: "folder",
            children,
          });
        }
      }
      
      // Sort: folders first, then alphabetical
      result.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      
      return result;
    };
    
    // Build top-level tree (SearchPaths)
    const rootNodes: TreeNode[] = [];
    
    for (const [searchPath, items] of bySearchPath) {
      const children = buildFolderTree(items);
      rootNodes.push({
        name: searchPath,  // Full path like "/path/to/stdlib"
        type: "folder",
        children,
      });
    }
    
    // Sort SearchPaths alphabetically
    rootNodes.sort((a, b) => a.name.localeCompare(b.name));
    
    return rootNodes;
  }

  /**
   * Scan ALL FBT files recursively and return hierarchical tree structure
   * Result: TreeNode[] with SearchPaths as root level, then nested folders and types
   */
  public scanAllTypes(): TreeNode[] {
    
    const allResults: Array<{ searchPathRoot: string; sourcePath: string; typeName: string; filePath: string }> = [];
    
    // Collect all FBT files from all search paths
    for (const basePath of this.searchPaths) {
      if (!fs.existsSync(basePath)) {
        continue;
      }
      
      const results = this.scanDirForAllTypes(basePath, basePath);
      allResults.push(...results);
    }
    
    // Parse each file and collect for tree building
    const typesList: Array<{ searchPathRoot: string; folderPath: string; name: string; sourcePath: string }> = [];
    
    for (const result of allResults) {
      try {
        const declaredName = this.typeResolver.getDeclaredTypeName(result.filePath, "fbt") || result.typeName;
        
        typesList.push({
          searchPathRoot: result.searchPathRoot,
          folderPath: result.sourcePath,  // e.g., "stdlib/convert" (relative to searchPathRoot)
          name: declaredName,             // e.g., "ADD"
          sourcePath: result.sourcePath,
        });

        // Also populate cache so getTypeModel() works for all scanned types
        if (!this.cache.has(declaredName)) {
          this.cache.set(declaredName, {
            name: declaredName,
            filePath: result.filePath,
            fileType: "fbt",
            sourcePath: result.sourcePath,
          });
        }
        
      } catch (err) {
        this.logger.warn(`Failed to parse FBT file ${result.filePath}`, err);
      }
    }
    
    // Build hierarchical tree (with SearchPath as root level)
    const tree = this.buildTreeFromTypes(typesList);
    
    return tree;
  }

  /**
   * Get all type models from cache as a serializable array.
   * Call after scanAllTypes() to get FBTypeModel for every cached type.
   */
  public getAllTypeModels(): [string, FBTypeModel][] {
    const result: [string, FBTypeModel][] = [];
    for (const typeName of this.cache.keys()) {
      const model = this.getTypeModel(typeName);
      if (model) {
        result.push([typeName, model]);
      }
    }
    return result;
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
        : this.typeResolver.getFbtInterface(info.filePath);

      if (!iface) {
        this.logger.error(`Failed to parse FBT file for type "${typeName}"`);
        return;
      }

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
        ...iface.dataInputs,
        ...iface.dataOutputs,
      ];

      return {
        name: typeName,
        ports,
        sourcePath: info.sourcePath,
      };
    } catch (err) {
      this.logger.error(`Failed to parse FBT file for type "${typeName}"`, err);
      return;
    }
  }
}
