import * as path from "path";
import { TypeFileResolver } from "../parsing/typeFileResolver";

/**
 * Resolves FBT files and caches their interfaces.
 * Handles recursive file search and parameter direction/type resolution.
 */
export class FbtResolver {
  private typeResolver: TypeFileResolver;

  constructor(
    sysPath: string,
    searchPaths: string[],
  ) {
    const sysDir = path.dirname(sysPath);
    this.typeResolver = new TypeFileResolver([sysDir, ...searchPaths]);
  }

  /**
   * Resolves parameter direction and type from the FBT file definition.
   * Returns empty object if the parameter is not found or FBT file doesn't exist.
   */
  resolveParameterInfo(
    typeShort: string,
    paramName: string,
  ): { direction?: string; type?: string } {
    const filePath = this.typeResolver.resolveTypeFile(typeShort, "fbt");
    if (!filePath) {
      return {};
    }

    const iface = this.typeResolver.getFbtInterface(filePath);
    if (!iface) {
      return {};
    }

    const inputMatch = iface.dataInputs.find((p) => p.name === paramName);
    if (inputMatch) {
      return { direction: inputMatch.direction, type: inputMatch.type };
    }

    const outputMatch = iface.dataOutputs.find((p) => p.name === paramName);
    if (outputMatch) {
      return { direction: outputMatch.direction, type: outputMatch.type };
    }

    return {};
  }
}
