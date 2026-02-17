import { SysResource } from "../../domain/sysModel";
import { QualifiedParam } from "./NetworkTraverser";

/**
 * Builds FBOOT command strings (CREATE, WRITE, START) with proper XML escaping.
 */
export class FBootCommandBuilder {
  /**
   * Builds CREATE command for resource.
   */
  buildCreateResourceCmd(resource: SysResource, id: number): string {
    const escapedType = this.escapeXmlValue(resource.type);
    return `;<Request ID="${id}" Action="CREATE"><FB Name="${resource.name}" Type="${escapedType}" /></Request>`;
  }

  /**
   * Builds CREATE command for FB with optional OpcMapping content.
   */
  buildCreateFBCmd(
    qualifiedName: string,
    typeLong: string,
    id: number,
    resourceName: string,
    params?: QualifiedParam[],
  ): string {
    const escapedType = this.escapeXmlValue(typeLong);
    const fbContent = this.buildOpcMappingXml(params);

    const fbTag = fbContent
      ? `<FB Name="${qualifiedName}" Type="${escapedType}">${fbContent}</FB>`
      : `<FB Name="${qualifiedName}" Type="${escapedType}"></FB>`;

    return `${resourceName};<Request ID="${id}" Action="CREATE">${fbTag}</Request>`;
  }

  /**
   * Builds WRITE command for parameter with literal value.
   */
  buildWriteParameterCmd(
    qualifiedName: string,
    paramName: string,
    value: string,
    id: number,
    resourceName: string,
  ): string {
    const escapedValue = this.escapeXmlValue(value);
    const destination = `${qualifiedName}.${paramName}`;
    return `${resourceName};<Request ID="${id}" Action="WRITE"><Connection Source="${escapedValue}" Destination="${destination}" /></Request>`;
  }

  /**
   * Builds WRITE command with literal value to arbitrary destination.
   */
  buildWriteLiteralCmd(
    value: string,
    destination: string,
    id: number,
    resourceName: string,
  ): string {
    const escapedValue = this.escapeXmlValue(value);
    return `${resourceName};<Request ID="${id}" Action="WRITE"><Connection Source="${escapedValue}" Destination="${destination}" /></Request>`;
  }

  /**
   * Builds CREATE command for connection.
   */
  buildCreateConnectionCmd(
    source: string,
    destination: string,
    id: number,
    resourceName: string,
  ): string {
    return `${resourceName};<Request ID="${id}" Action="CREATE"><Connection Source="${source}" Destination="${destination}" /></Request>`;
  }

  /**
   * Builds START command.
   */
  buildStartCmd(id: number, resourceName: string): string {
    return `${resourceName};<Request ID="${id}" Action="START"/>`;
  }

  /**
   * Builds OpcMapping XML content for FB if any parameters have OpcMapping attribute.
   */
  private buildOpcMappingXml(params?: QualifiedParam[]): string {
    if (!params) return "";

    const opcMappingParams = params.filter((p) =>
      p.attributes?.some((attr) => attr.name === "OpcMapping" && attr.value === "true"),
    );

    if (opcMappingParams.length === 0) return "";

    const varElements = opcMappingParams
      .map((p) => {
        const escapedName = this.escapeXmlValue(p.name);
        const attrs = [`Name="${escapedName}"`];
        if (p.direction) {
          attrs.push(`Direction="${this.escapeXmlValue(p.direction.toUpperCase())}"`);
        }
        if (p.type) {
          attrs.push(`Type="${this.escapeXmlValue(p.type)}"`);
        }
        return `<Var ${attrs.join(" ")}/>`;
      })
      .join("");

    return `<OpcMapping>${varElements}</OpcMapping>`;
  }

  /**
   * Escapes special XML characters in values.
   */
  private escapeXmlValue(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
