import {
  SysModel,
  SysSubAppNetwork,
  SubAppInterfaceParam,
  SUBAPP_INTERFACE_BLOCK,
} from "../../shared/models/sysModel";
import { FbtResolver } from "./FbtResolver";
import { qualifyName } from "./utils";

export type ConnectionKind = "event" | "data" | undefined;

export interface QualifiedFB {
  qualifiedName: string;
  typeShort: string;
  typeLong: string;
  kind: "block" | "subapp";
  expandable?: boolean;
}

export interface QualifiedParam {
  qualifiedFBName: string;
  name: string;
  value: string;
  direction?: string;
  type?: string;
  attributes?: Array<{
    name: string;
    value: string;
  }>;
}

export interface QualifiedEndpoint {
  qualifiedBlock: string;
  port: string;
}

export interface QualifiedConnection {
  from: QualifiedEndpoint;
  to: QualifiedEndpoint;
  type: ConnectionKind;
}

export interface TraversalContext {
  fbs: QualifiedFB[];
  params: QualifiedParam[];
  connections: QualifiedConnection[];
  subAppInterfaces: Map<string, SubAppInterfaceParam[]>;
}

/**
 * Traverses the application network and collects qualified FB instances, parameters, and connections.
 * Handles recursive traversal of SubApp networks with proper name qualification.
 */
export class NetworkTraverser {
  constructor(private fbtResolver: FbtResolver) {}

  /**
   * Collects all FBs, parameters, and connections from the model with qualified names.
   */
  collectTraversalContext(model: SysModel): TraversalContext {
    const context: TraversalContext = {
      fbs: [],
      params: [],
      connections: [],
      subAppInterfaces: new Map(),
    };

    this.traverseNetwork(model.subAppNetwork, model.applicationName, context);
    return context;
  }

  /**
   * Recursively traverses a network (application or SubApp) and collects qualified elements.
   */
  private traverseNetwork(
    network: SysSubAppNetwork,
    namespace: string,
    context: TraversalContext,
  ): void {
    // Process regular FB blocks
    if (network.blocks) {
      for (const block of network.blocks) {
        const qualifiedName = qualifyName(namespace, block.id);
        context.fbs.push({
          qualifiedName,
          typeShort: block.typeShort,
          typeLong: block.typeLong,
          kind: "block",
        });

        // Collect parameters with resolved direction/type
        if (block.parameters) {
          for (const param of block.parameters) {
            const paramInfo = this.fbtResolver.resolveParameterInfo(block.typeShort, param.name);
            context.params.push({
              qualifiedFBName: qualifiedName,
              name: param.name,
              value: param.value,
              direction: paramInfo.direction,
              type: paramInfo.type,
              attributes: param.attributes,
            });
          }
        }
      }
    }

    // Process SubApp instances
    if (network.subApps) {
      for (const subApp of network.subApps) {
        const qualifiedName = qualifyName(namespace, subApp.id);
        
        // Determine if SubApp is expandable (has internal network)
        const hasNetwork = Boolean(
          (subApp.subAppNetwork.blocks && subApp.subAppNetwork.blocks.length > 0) ||
            (subApp.subAppNetwork.subApps && subApp.subAppNetwork.subApps.length > 0) ||
            (subApp.subAppNetwork.connections && subApp.subAppNetwork.connections.length > 0),
        );
        
        context.fbs.push({
          qualifiedName,
          typeShort: subApp.typeShort,
          typeLong: subApp.typeLong,
          kind: "subapp",
          expandable: hasNetwork,
        });

        // Collect SubApp parameters
        if (subApp.parameters) {
          for (const param of subApp.parameters) {
            const paramInfo = this.fbtResolver.resolveParameterInfo(subApp.typeShort, param.name);
            context.params.push({
              qualifiedFBName: qualifiedName,
              name: param.name,
              value: param.value,
              direction: paramInfo.direction,
              type: paramInfo.type,
              attributes: param.attributes,
            });
          }
        }

        // Store SubApp interface for validation
        if (subApp.subAppInterfaceParams) {
          context.subAppInterfaces.set(qualifiedName, subApp.subAppInterfaceParams);
        }

        // Recursively traverse SubApp internal network
        if (subApp.subAppNetwork) {
          this.traverseNetwork(subApp.subAppNetwork, qualifiedName, context);
        }
      }
    }

    // Process connections with qualified names
    if (network.connections) {
      for (const conn of network.connections) {
        const fromQualified =
          conn.fromBlock === SUBAPP_INTERFACE_BLOCK
            ? namespace
            : qualifyName(namespace, conn.fromBlock);
        const toQualified =
          conn.toBlock === SUBAPP_INTERFACE_BLOCK
            ? namespace
            : qualifyName(namespace, conn.toBlock);
        context.connections.push({
          from: { qualifiedBlock: fromQualified, port: conn.fromPort },
          to: { qualifiedBlock: toQualified, port: conn.toPort },
          type: conn.type,
        });
      }
    }
  }
}
