import * as fs from "fs";
import * as path from "path";
import { 
  SysModel, 
  SysDevice, 
  SysResource, 
  SysBlock, 
  SysParameter, 
  SysConnection,
  SysMapping 
} from "../../domain/sysModel";
import { getLogger } from "../../logging";

export class FBootGenerator {
  private logger = getLogger();
  private model: SysModel;
  private sysPath: string;

  constructor(model: SysModel, sysPath: string) {
    this.model = model;
    this.sysPath = sysPath;
  }

  /**
   * Main entry point: generates .fboot files for all devices/resources
   * @returns Array of generated .fboot file paths
   */
  async generate(): Promise<string[]> {
    // Validate model has required data
    if (!this.model.devices || this.model.devices.length === 0) {
      throw new Error("No devices in .sys");
    }
    if (!this.model.mappings || this.model.mappings.length === 0) {
      throw new Error("No mappings in .sys");
    }

    // Count resources for logging
    const totalResources = this.model.devices.reduce((sum, d) => sum + d.resources.length, 0);
    this.logger.debug(`Found ${this.model.devices.length} devices with ${totalResources} resources`);

    const generatedFiles: string[] = [];
    const outputDir = path.dirname(this.sysPath);
    const systemName = this.model.applicationName;

    // Generate .fboot for each device/resource pair
    for (const device of this.model.devices) {
      for (const resource of device.resources) {
        this.logger.debug(`Generating .fboot for Device=${device.name}, Resource=${resource.name}`);

        // Generate content
        const content = this.generateFBootForResource(device, resource, this.model);

        // Build filename
        const filename = `${systemName}_${device.name}.fboot`;
        const outputPath = path.join(outputDir, filename);

        // Save to disk
        await this.saveFBootFile(content, outputPath);
        this.logger.info(`Generated .fboot file: ${outputPath}`);

        generatedFiles.push(outputPath);
      }
    }

    this.logger.info(`Total files generated: ${generatedFiles.length}`);
    return generatedFiles;
  }

  /**
   * Get all FBs (blocks) that are mapped to this resource
   */
  private filterFBsForResource(resource: SysResource, model: SysModel): SysBlock[] {
    const matchedFBs: SysBlock[] = [];
    const seenIds = new Set<string>();

    for (const mapping of model.mappings) {
      // Check if this mapping targets this device/resource
      if (mapping.device === resource.device && mapping.resource === resource.name) {
        // Find the block with matching fbInstance
        const block = model.blocks.find(b => b.id === mapping.fbInstance);
        if (block && !seenIds.has(block.id)) {
          matchedFBs.push(block);
          seenIds.add(block.id);
        }
      }
    }

    return matchedFBs;
  }

  /**
   * Get all parameters for the given FBs
   */
  private filterParametersForFBs(fbs: SysBlock[], model: SysModel): SysParameter[] {
    const fbIds = new Set(fbs.map(fb => fb.id));
    return model.parameters.filter(param => fbIds.has(param.fbName));
  }

  /**
   * Get all connections that connect FBs within this resource
   */
  private filterConnectionsForResource(resource: SysResource, model: SysModel): SysConnection[] {
    // Build a map of fbInstance -> mapping for quick lookups
    const fbToMapping = new Map<string, SysMapping>();
    for (const mapping of model.mappings) {
      fbToMapping.set(mapping.fbInstance, mapping);
    }

    // Filter connections where BOTH ends are in this resource
    const matchedConnections: SysConnection[] = [];
    for (const conn of model.connections) {
      const sourceMapping = fbToMapping.get(conn.fromBlock);
      const destMapping = fbToMapping.get(conn.toBlock);

      // Both source and destination must be mapped to this device/resource
      if (
        sourceMapping &&
        destMapping &&
        sourceMapping.device === resource.device &&
        sourceMapping.resource === resource.name &&
        destMapping.device === resource.device &&
        destMapping.resource === resource.name
      ) {
        matchedConnections.push(conn);
      }
    }

    return matchedConnections;
  }

  /**
   * Build CREATE Resource command
   */
  private buildCreateResourceCmd(resource: SysResource, id: number): string {
    const escapedType = this.escapeXmlValue(resource.type);
    return `;<Request ID="${id}" Action="CREATE"><FB Name="${resource.name}" Type="${escapedType}" /></Request>`;
  }

  /**
   * Build CREATE FB command
   */
  private buildCreateFBCmd(fb: SysBlock, mapping: SysMapping, id: number, resourceName: string): string {
    const escapedType = this.escapeXmlValue(fb.type);
    return `${resourceName};<Request ID="${id}" Action="CREATE"><FB Name="${mapping.fbInstance}" Type="${escapedType}"></FB></Request>`;
  }

  /**
   * Build WRITE Parameter command
   */
  private buildWriteParameterCmd(
    parameter: SysParameter,
    mapping: SysMapping,
    id: number,
    resourceName: string
  ): string {
    const escapedValue = this.escapeXmlValue(parameter.value);
    const destination = `${mapping.fbInstance}.${parameter.name}`;
    return `${resourceName};<Request ID="${id}" Action="WRITE"><Connection Source="${escapedValue}" Destination="${destination}" /></Request>`;
  }

  /**
   * Build CREATE Connection command
   */
  private buildCreateConnectionCmd(
    connection: SysConnection,
    mappings: Map<string, SysMapping>,
    id: number,
    resourceName: string
  ): string {
    const sourceMapping = mappings.get(connection.fromBlock);
    const destMapping = mappings.get(connection.toBlock);

    if (!sourceMapping || !destMapping) {
      return ""; // Should not happen if filtering is correct
    }

    const source = `${sourceMapping.fbInstance}.${connection.fromPort}`;
    const destination = `${destMapping.fbInstance}.${connection.toPort}`;

    return `${resourceName};<Request ID="${id}" Action="CREATE"><Connection Source="${source}" Destination="${destination}" /></Request>`;
  }

  /**
   * Build START command
   */
  private buildStartCmd(id: number, resourceName: string): string {
    return `${resourceName};<Request ID="${id}" Action="START"/>`;
  }

  /**
   * Escape XML special characters in parameter values
   * Order is important: & must be escaped first
   */
  private escapeXmlValue(value: string): string {
    return value
      .replace(/&/g, "&amp;")   // Must be first!
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Generate .fboot content for a single resource
   */
  private generateFBootForResource(
    device: SysDevice,
    resource: SysResource,
    model: SysModel
  ): string {
    const lines: string[] = [];
    let cmdId = 3;

    //CREATE Resource 
    lines.push(this.buildCreateResourceCmd(resource, cmdId++));

    // Get filtered data for this resource
    const fbs = this.filterFBsForResource(resource, model);
    const parameters = this.filterParametersForFBs(fbs, model);
    const connections = this.filterConnectionsForResource(resource, model);

    this.logger.debug(
      `Filtered ${fbs.length} FBs, ${parameters.length} parameters, ${connections.length} connections`
    );

    // Build mapping lookup: fbInstance -> SysMapping
    const fbToMapping = new Map<string, SysMapping>();
    for (const mapping of model.mappings) {
      if (mapping.device === resource.device && mapping.resource === resource.name) {
        fbToMapping.set(mapping.fbInstance, mapping);
      }
    }

    // CREATE FB Instances
    for (const fb of fbs) {
      const mapping = fbToMapping.get(fb.id);
      if (mapping) {
        lines.push(this.buildCreateFBCmd(fb, mapping, cmdId++, resource.name));
      }
    }

    //WRITE Parameters 
    for (const param of parameters) {
      const mapping = fbToMapping.get(param.fbName);
      if (mapping) {
        lines.push(this.buildWriteParameterCmd(param, mapping, cmdId++, resource.name));
      }
    }

    // CREATE Connections
    for (const conn of connections) {
      lines.push(this.buildCreateConnectionCmd(conn, fbToMapping, cmdId++, resource.name));
    }

    // START 
    lines.push(this.buildStartCmd(cmdId, resource.name));

    return lines.join("\n");
  }

  /**
   * Save .fboot file to disk
   */
  private async saveFBootFile(content: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(outputPath, content, "utf8", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
