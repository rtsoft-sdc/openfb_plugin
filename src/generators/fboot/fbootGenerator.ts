import * as fs from "fs";
import * as path from "path";
import {
  SysModel,
  SysResource,
  SysMapping,
  SubAppInterfaceParam,
} from "../../domain/sysModel";
import { getLogger } from "../../logging";
import { FbtResolver } from "./FbtResolver";
import { NetworkTraverser, TraversalContext, QualifiedConnection, QualifiedParam } from "./NetworkTraverser";
import { SubAppExpander } from "./SubAppExpander";
import { ConnectionSorter } from "./ConnectionSorter";
import { FBootCommandBuilder } from "./FBootCommandBuilder";

/**
 * Main generator class for FBOOT files.
 * Orchestrates network traversal, SubApp expansion, connection sorting, and command generation.
 */
export class FBootGenerator {
  private logger = getLogger();
  private model: SysModel;
  private sysPath: string;
  private searchPaths: string[];
  
  private fbtResolver: FbtResolver;
  private networkTraverser: NetworkTraverser;
  private subAppExpander: SubAppExpander;
  private connectionSorter: ConnectionSorter;
  private commandBuilder: FBootCommandBuilder;

  constructor(model: SysModel, sysPath: string, searchPaths: string[] = []) {
    this.model = model;
    this.sysPath = sysPath;
    this.searchPaths = searchPaths;
    
    // Initialize helper classes
    this.fbtResolver = new FbtResolver(sysPath, searchPaths);
    this.networkTraverser = new NetworkTraverser(this.fbtResolver);
    this.subAppExpander = new SubAppExpander();
    this.connectionSorter = new ConnectionSorter();
    this.commandBuilder = new FBootCommandBuilder();
  }

  /**
   * Main entry point: generates .fboot files for all devices/resources.
   * @returns Array of generated .fboot file paths
   */
  async generate(): Promise<string[]> {
    if (!this.model.devices || this.model.devices.length === 0) {
      throw new Error("No devices in .sys");
    }
    if (!this.model.mappings || this.model.mappings.length === 0) {
      throw new Error("No mappings in .sys");
    }

    const totalResources = this.model.devices.reduce((sum, d) => sum + d.resources.length, 0);
    this.logger.debug(`Found ${this.model.devices.length} devices with ${totalResources} resources`);

    // Traverse the application network to collect all FBs, parameters, and connections
    const context = this.networkTraverser.collectTraversalContext(this.model);

    const generatedFiles: string[] = [];
    const outputDir = path.dirname(this.sysPath);
    const systemName = this.model.systemName;

    for (const device of this.model.devices) {
      let cmdId = 5;
      const deviceLines: string[] = [];

      for (const resource of device.resources) {
        this.logger.debug(`Generating .fboot for Device=${device.name}, Resource=${resource.name}`);

        const result = this.generateFBootForResource(resource, context, this.model, cmdId);
        deviceLines.push(...result.lines);
        cmdId = result.nextId;
      }

      const content = deviceLines.join("\n");
      const filename = `${systemName}_${device.name}.fboot`;
      const outputPath = path.join(outputDir, filename);

      await this.saveFBootFile(content, outputPath);
      this.logger.info(`Generated .fboot file: ${outputPath}`);

      generatedFiles.push(outputPath);
    }

    this.logger.info(`Total files generated: ${generatedFiles.length}`);
    return generatedFiles;
  }

  /**
   * Builds a mapping index of FBs assigned to this resource.
   */
  private buildResourceMappingIndex(
    resource: SysResource,
    mappings: SysMapping[],
  ): Map<string, SysMapping> {
    const map = new Map<string, SysMapping>();
    for (const mapping of mappings) {
      if (mapping.device === resource.device && mapping.resource === resource.name) {
        map.set(mapping.fbInstance, mapping);
      }
    }
    return map;
  }

  /**
   * Normalizes resource-level connections (from Resource FBNetwork) to qualified format.
   * Handles START connections specially.
   */
  private normalizeResourceConnections(
    resource: SysResource,
    applicationName: string,
  ): QualifiedConnection[] {
    if (!resource.connections) {
      return [];
    }

    return resource.connections.map((conn) => {
      const fromQualified =
        conn.fromBlock === "START"
          ? "START"
          : this.qualifyName(applicationName, conn.fromBlock);
      const toQualified = this.qualifyName(applicationName, conn.toBlock);
      return {
        from: { qualifiedBlock: fromQualified, port: conn.fromPort },
        to: { qualifiedBlock: toQualified, port: conn.toPort },
        type: conn.type,
      };
    });
  }

  /**
   * Qualifies a local name with namespace, unless already qualified.
   */
  private qualifyName(namespace: string, localName: string): string {
    if (!namespace) {
      return localName;
    }
    if (localName.includes(".")) {
      return localName;
    }
    return `${namespace}.${localName}`;
  }

  /**
   * Validates that an endpoint matches the SubApp interface, if the endpoint is a SubApp.
   */
  private isInterfaceEndpointValid(
    endpoint: { qualifiedBlock: string; port: string },
    kind: "event" | "data" | undefined,
    direction: "input" | "output",
    subAppInterfaces: Map<string, SubAppInterfaceParam[]>,
  ): boolean {
    const iface = subAppInterfaces.get(endpoint.qualifiedBlock);
    if (!iface) {
      return true;
    }

    return iface.some((param) => {
      if (param.name !== endpoint.port) {
        return false;
      }
      if (param.direction !== direction) {
        return false;
      }
      if (kind && param.kind !== kind) {
        return false;
      }
      return true;
    });
  }

  /**
   * Checks if a value is considered empty (empty string or '').
   */
  private isEmptyLiteral(value: string): boolean {
    return value === "" || value === "''";
  }

  /**
   * Generates FBOOT commands for a single resource.
   */
  private generateFBootForResource(
    resource: SysResource,
    context: TraversalContext,
    model: SysModel,
    startId: number,
  ): { lines: string[]; nextId: number } {
    const lines: string[] = [];
    let cmdId = startId;

    // Determine which FBs and params are mapped to this resource
    const { mappedFbs, mappedParams, expandedSubapps, isMapped } = 
      this.determineMappedElements(resource, context, model.mappings);

    const mappedFbOrder = mappedFbs.map((fb) => fb.qualifiedName);

    // Prepare and expand connections
    const { orderedConnections, literalWritesByFb } = 
      this.prepareConnections(
        resource,
        context,
        model.applicationName,
        expandedSubapps,
        isMapped,
        mappedFbOrder,
      );

    // Generate all FBOOT commands
    cmdId = this.emitAllCommands(
      lines,
      resource,
      mappedFbs,
      mappedParams,
      orderedConnections,
      literalWritesByFb,
      cmdId,
    );

    return { lines, nextId: cmdId };
  }

  /**
   * Determines which FBs and parameters are mapped to this resource.
   * Handles SubApp expansion logic.
   */
  private determineMappedElements(
    resource: SysResource,
    context: TraversalContext,
    mappings: SysMapping[],
  ): {
    mappedFbs: Array<{ qualifiedName: string; typeLong: string; kind: string }>;
    mappedParams: QualifiedParam[];
    expandedSubapps: Set<string>;
    isMapped: (qualifiedName: string) => boolean;
  } {
    const mappingIndex = this.buildResourceMappingIndex(resource, mappings);

    const mappedSubappNames = new Set(
      context.fbs
        .filter((fb) => fb.kind === "subapp" && mappingIndex.has(fb.qualifiedName))
        .map((fb) => fb.qualifiedName),
    );

    const isWithinMappedSubapp = (qualifiedName: string): boolean => {
      for (const subappName of mappedSubappNames) {
        if (qualifiedName.startsWith(`${subappName}.`)) {
          return true;
        }
      }
      return false;
    };

    const isMapped = (qualifiedName: string): boolean =>
      mappingIndex.has(qualifiedName) || isWithinMappedSubapp(qualifiedName);

    const expandedSubapps = new Set(
      context.fbs
        .filter((fb) =>
          fb.kind === "subapp" &&
          fb.expandable &&
          isMapped(fb.qualifiedName),
        )
        .map((fb) => fb.qualifiedName),
    );

    const mappedFbs = context.fbs.filter((fb) => {
      if (!isMapped(fb.qualifiedName)) {
        return false;
      }
      if (fb.kind === "subapp" && expandedSubapps.has(fb.qualifiedName)) {
        return false;
      }
      return true;
    });

    // Include params with values AND params with OpcMapping attribute (regardless of value)
    const mappedParams = context.params.filter((param) => {
      if (!isMapped(param.qualifiedFBName)) {
        return false;
      }
      if (expandedSubapps.has(param.qualifiedFBName)) {
        return false;
      }
      if (!this.isEmptyLiteral(param.value)) {
        return true;
      }
      // Include params with OpcMapping=true attribute even if value is empty
      const hasOpcMapping = param.attributes?.some(
        (attr) => attr.name === "OpcMapping" && attr.value === "true",
      );
      return hasOpcMapping || false;
    });

    return { mappedFbs, mappedParams, expandedSubapps, isMapped };
  }

  /**
   * Prepares connections: combines, expands SubApps, filters, and sorts.
   */
  private prepareConnections(
    resource: SysResource,
    context: TraversalContext,
    applicationName: string,
    expandedSubapps: Set<string>,
    isMapped: (qualifiedName: string) => boolean,
    mappedFbOrder: string[],
  ): {
    orderedConnections: QualifiedConnection[];
    literalWritesByFb: Map<string, Array<{ destination: string; value: string }>>;
  } {
    // Combine application and resource connections
    const resourceConnections = [
      ...context.connections,
      ...this.normalizeResourceConnections(resource, applicationName),
    ];

    // Expand SubApp connections using SubAppExpander helper
    const { expandedConnections, literalWritesByFb } = 
      this.subAppExpander.expandSubAppConnections(
        resourceConnections,
        expandedSubapps,
        context,
        context.params,
        this.isEmptyLiteral.bind(this),
      );

    // Filter expanded connections to only those mapped to this resource
    const mappedConnections = this.filterMappedConnections(
      expandedConnections,
      isMapped,
      context.subAppInterfaces,
    );

    // Sort connections by destination FB order (events before data)
    const orderedConnections = this.connectionSorter.sortConnectionsByDestination(
      mappedConnections,
      mappedFbOrder,
    );

    return { orderedConnections, literalWritesByFb };
  }

  /**
   * Filters connections to only include those mapped to this resource.
   */
  private filterMappedConnections(
    connections: QualifiedConnection[],
    isMapped: (qualifiedName: string) => boolean,
    subAppInterfaces: Map<string, SubAppInterfaceParam[]>,
  ): QualifiedConnection[] {
    const mappedConnections: QualifiedConnection[] = [];
    
    for (const conn of connections) {
      const isStartSource =
        conn.from.qualifiedBlock.endsWith(".START") || conn.from.qualifiedBlock === "START";
      
      if (!isMapped(conn.from.qualifiedBlock) && !isStartSource) {
        continue;
      }
      if (!isMapped(conn.to.qualifiedBlock)) {
        continue;
      }
      if (!this.isInterfaceEndpointValid(conn.from, conn.type, "output", subAppInterfaces)) {
        continue;
      }
      if (!this.isInterfaceEndpointValid(conn.to, conn.type, "input", subAppInterfaces)) {
        continue;
      }
      
      mappedConnections.push(conn);
    }
    
    return mappedConnections;
  }

  /**
   * Emits all FBOOT commands: CREATE RESOURCE, CREATE FBs, WRITE params, CREATE CONNECTIONs, START.
   */
  private emitAllCommands(
    lines: string[],
    resource: SysResource,
    mappedFbs: Array<{ qualifiedName: string; typeLong: string; kind: string }>,
    mappedParams: QualifiedParam[],
    orderedConnections: QualifiedConnection[],
    literalWritesByFb: Map<string, Array<{ destination: string; value: string }>>,
    startCmdId: number,
  ): number {
    let cmdId = startCmdId;

    // CREATE RESOURCE command
    lines.push(this.commandBuilder.buildCreateResourceCmd(resource, cmdId++));

    // CREATE FB commands
    for (const fb of mappedFbs) {
      const fbParams = mappedParams.filter((p) => p.qualifiedFBName === fb.qualifiedName);
      lines.push(
        this.commandBuilder.buildCreateFBCmd(
          fb.qualifiedName,
          fb.typeLong,
          cmdId++,
          resource.name,
          fbParams,
        ),
      );
    }

    // WRITE commands for parameters and literal writes
    cmdId = this.emitWriteCommands(
      lines,
      resource.name,
      mappedParams,
      literalWritesByFb,
      cmdId,
    );

    // CREATE CONNECTION commands
    for (const conn of orderedConnections) {
      const sourceBlock =
        conn.from.qualifiedBlock === "START" || conn.from.qualifiedBlock.endsWith(".START")
          ? "START"
          : conn.from.qualifiedBlock;
      const source = `${sourceBlock}.${conn.from.port}`;
      const destination = `${conn.to.qualifiedBlock}.${conn.to.port}`;
      lines.push(
        this.commandBuilder.buildCreateConnectionCmd(source, destination, cmdId++, resource.name),
      );
    }

    // START command
    lines.push(this.commandBuilder.buildStartCmd(cmdId++, resource.name));

    return cmdId;
  }

  /**
   * Emits WRITE commands for parameters and SubApp literal writes.
   * Ensures literal writes for each FB are emitted before its parameter writes.
   */
  private emitWriteCommands(
    lines: string[],
    resourceName: string,
    mappedParams: QualifiedParam[],
    literalWritesByFb: Map<string, Array<{ destination: string; value: string }>>,
    startCmdId: number,
  ): number {
    let cmdId = startCmdId;
    const emittedLiteralWrites = new Set<string>();

    const emitLiteralWritesForFb = (fbName: string) => {
      if (emittedLiteralWrites.has(fbName)) {
        return;
      }
      const writes = literalWritesByFb.get(fbName);
      if (writes) {
        for (const write of writes) {
          lines.push(
            this.commandBuilder.buildWriteLiteralCmd(write.value, write.destination, cmdId++, resourceName),
          );
        }
      }
      emittedLiteralWrites.add(fbName);
    };

    // Emit parameter writes (with literal writes first for each FB)
    for (const param of mappedParams) {
      emitLiteralWritesForFb(param.qualifiedFBName);
      
      // Skip WRITE command for parameters with empty value
      if (this.isEmptyLiteral(param.value)) {
        continue;
      }
      
      lines.push(
        this.commandBuilder.buildWriteParameterCmd(
          param.qualifiedFBName,
          param.name,
          param.value,
          cmdId++,
          resourceName,
        ),
      );
    }

    // Emit remaining literal writes for FBs that have no parameters
    for (const [fbName, writes] of literalWritesByFb) {
      if (emittedLiteralWrites.has(fbName)) {
        continue;
      }
      for (const write of writes) {
        lines.push(
          this.commandBuilder.buildWriteLiteralCmd(write.value, write.destination, cmdId++, resourceName),
        );
      }
      emittedLiteralWrites.add(fbName);
    }

    return cmdId;
  }

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
