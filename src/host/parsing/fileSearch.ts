import * as fs from "fs";
import * as path from "path";

/**
 * Recursively search for a file in a directory and all subdirectories.
 */
export function findFileRecursive(dir: string, fileName: string): string | undefined {
  try {
    const filePath = path.join(dir, fileName);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const subDirPath = path.join(dir, entry.name);
      const found = findFileRecursive(subDirPath, fileName);
      if (found) {
        return found;
      }
    }
  } catch {
    // Ignore directories we cannot access
  }

  return undefined;
}

/**
 * Resolve a type definition file (e.g. .fbt/.sub) by searching recursively
 * in the provided directories. Tries original and uppercased type names.
 */
export function resolveTypeFilePath(
  typeShort: string,
  extension: "fbt" | "sub",
  searchDirs: string[],
): string | undefined {
  const fileName = `${typeShort}.${extension}`;
  const fileNameUpper = `${typeShort.toUpperCase()}.${extension}`;

  for (const dir of searchDirs) {
    if (!dir || !fs.existsSync(dir)) {
      continue;
    }

    const found = findFileRecursive(dir, fileName) || findFileRecursive(dir, fileNameUpper);
    if (found) {
      return found;
    }
  }

  return undefined;
}
