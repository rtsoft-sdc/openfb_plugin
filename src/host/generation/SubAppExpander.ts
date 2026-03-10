import { SubAppInterfaceParam } from "../../shared/models/sysModel";
import {
  ConnectionKind,
  QualifiedConnection,
  QualifiedEndpoint,
  TraversalContext,
} from "./NetworkTraverser";

/**
 * Expands SubApp instances by replacing interface connections with internal network connections.
 * Handles SubApp-to-SubApp, external-to-SubApp, and SubApp-to-external connections.
 */
export class SubAppExpander {
  /**
   * Expands connections that involve SubApp interfaces into direct connections to/from internal FBs.
   * Also builds literal write mappings for SubApp input parameters.
   */
  expandSubAppConnections(
    connections: QualifiedConnection[],
    expandedSubapps: Set<string>,
    context: TraversalContext,
    params: any[],
    isEmptyLiteralFn: (value: string) => boolean,
  ): {
    expandedConnections: QualifiedConnection[];
    literalWritesByFb: Map<string, Array<{ destination: string; value: string }>>;
    externalInputConnections: Set<string>;
  } {
    const makeInterfaceKey = (port: string, type: ConnectionKind): string =>
      `${port}|${type ?? "unknown"}`;

    const getInterfaceParam = (
      subappName: string,
      port: string,
    ): SubAppInterfaceParam | undefined => {
      return context.subAppInterfaces.get(subappName)?.find((param) => param.name === port);
    };

    const isInsideSubapp = (endpoint: QualifiedEndpoint, subappName: string): boolean =>
      endpoint.qualifiedBlock.startsWith(`${subappName}.`);

    // Build interface endpoint maps for input and output ports
    const { inputInterfaceMap, outputInterfaceMap } = this.buildInterfaceMaps(
      context,
      expandedSubapps,
      makeInterfaceKey,
      getInterfaceParam,
      isInsideSubapp,
    );

    // Track which SubApp inputs have external connections (to avoid duplicate literal writes)
    const externalInputConnections = new Set<string>();
    const expandedConnections: QualifiedConnection[] = [];
    const seenConnections = new Set<string>();

    // Expand each connection
    for (const conn of connections) {
      const expanded = this.expandConnection(
        conn,
        expandedSubapps,
        makeInterfaceKey,
        getInterfaceParam,
        isInsideSubapp,
        inputInterfaceMap,
        outputInterfaceMap,
        externalInputConnections,
      );

      for (const expandedConn of expanded) {
        const key = `${expandedConn.type ?? "unknown"}|${expandedConn.from.qualifiedBlock}.${expandedConn.from.port}|${expandedConn.to.qualifiedBlock}.${expandedConn.to.port}`;
        if (seenConnections.has(key)) {
          continue;
        }
        seenConnections.add(key);
        expandedConnections.push(expandedConn);
      }
    }

    // Build literal writes for SubApp input parameters
    const literalWritesByFb = this.buildLiteralWrites(
      params,
      expandedSubapps,
      isEmptyLiteralFn,
      makeInterfaceKey,
      getInterfaceParam,
      inputInterfaceMap,
      externalInputConnections,
    );

    return { expandedConnections, literalWritesByFb, externalInputConnections };
  }

  /**
   * Builds maps of SubApp interface endpoints to internal FB endpoints.
   * Input map: SubApp input port -> internal FB inputs that receive the value.
   * Output map: SubApp output port -> internal FB outputs that provide the value.
   */
  private buildInterfaceMaps(
    context: TraversalContext,
    expandedSubapps: Set<string>,
    makeInterfaceKey: (port: string, type: ConnectionKind) => string,
    getInterfaceParam: (subappName: string, port: string) => SubAppInterfaceParam | undefined,
    isInsideSubapp: (endpoint: QualifiedEndpoint, subappName: string) => boolean,
  ): {
    inputInterfaceMap: Map<string, Map<string, QualifiedEndpoint[]>>;
    outputInterfaceMap: Map<string, Map<string, QualifiedEndpoint[]>>;
  } {
    const inputInterfaceMap = new Map<string, Map<string, QualifiedEndpoint[]>>();
    const outputInterfaceMap = new Map<string, Map<string, QualifiedEndpoint[]>>();

    const addInterfaceEndpoint = (
      map: Map<string, Map<string, QualifiedEndpoint[]>>,
      subappName: string,
      key: string,
      endpoint: QualifiedEndpoint,
    ) => {
      let subappMap = map.get(subappName);
      if (!subappMap) {
        subappMap = new Map();
        map.set(subappName, subappMap);
      }
      let list = subappMap.get(key);
      if (!list) {
        list = [];
        subappMap.set(key, list);
      }
      list.push(endpoint);
    };

    // Scan internal connections of expanded SubApps to build interface maps
    for (const conn of context.connections) {
      // Check if connection goes from SubApp interface to internal FB (input mapping)
      if (expandedSubapps.has(conn.from.qualifiedBlock)) {
        const subappName = conn.from.qualifiedBlock;
        if (isInsideSubapp(conn.to, subappName)) {
          const iface = getInterfaceParam(subappName, conn.from.port);
          if (iface && iface.direction === "input" && (!conn.type || iface.kind === conn.type)) {
            const key = makeInterfaceKey(conn.from.port, conn.type);
            addInterfaceEndpoint(inputInterfaceMap, subappName, key, conn.to);
          }
        }
      }

      // Check if connection goes from internal FB to SubApp interface (output mapping)
      if (expandedSubapps.has(conn.to.qualifiedBlock)) {
        const subappName = conn.to.qualifiedBlock;
        if (isInsideSubapp(conn.from, subappName)) {
          const iface = getInterfaceParam(subappName, conn.to.port);
          if (iface && iface.direction === "output" && (!conn.type || iface.kind === conn.type)) {
            const key = makeInterfaceKey(conn.to.port, conn.type);
            addInterfaceEndpoint(outputInterfaceMap, subappName, key, conn.from);
          }
        }
      }
    }

    return { inputInterfaceMap, outputInterfaceMap };
  }

  /**
   * Expands a single connection that may involve SubApp interfaces.
   * Returns an array of direct connections (may be empty if connection is internal to SubApp).
   */
  private expandConnection(
    conn: QualifiedConnection,
    expandedSubapps: Set<string>,
    makeInterfaceKey: (port: string, type: ConnectionKind) => string,
    getInterfaceParam: (subappName: string, port: string) => SubAppInterfaceParam | undefined,
    isInsideSubapp: (endpoint: QualifiedEndpoint, subappName: string) => boolean,
    inputInterfaceMap: Map<string, Map<string, QualifiedEndpoint[]>>,
    outputInterfaceMap: Map<string, Map<string, QualifiedEndpoint[]>>,
    externalInputConnections: Set<string>,
  ): QualifiedConnection[] {
    const fromSubapp = expandedSubapps.has(conn.from.qualifiedBlock)
      ? conn.from.qualifiedBlock
      : undefined;
    const toSubapp = expandedSubapps.has(conn.to.qualifiedBlock)
      ? conn.to.qualifiedBlock
      : undefined;

    const fromIface = fromSubapp ? getInterfaceParam(fromSubapp, conn.from.port) : undefined;
    const toIface = toSubapp ? getInterfaceParam(toSubapp, conn.to.port) : undefined;

    // Skip internal SubApp connections (already processed when building interface maps)
    if (fromSubapp && fromIface && isInsideSubapp(conn.to, fromSubapp)) {
      return [];
    }
    if (toSubapp && toIface && isInsideSubapp(conn.from, toSubapp)) {
      return [];
    }

    // Connection doesn't involve SubApp interfaces - pass through
    if (!fromSubapp && !toSubapp) {
      return [conn];
    }

    // SubApp-to-SubApp connection: expand both sides
    if (fromSubapp && fromIface && toSubapp && toIface && fromSubapp !== toSubapp) {
      if (conn.type && (fromIface.kind !== conn.type || toIface.kind !== conn.type)) {
        return [];
      }
      const fromKey = makeInterfaceKey(conn.from.port, conn.type);
      const toKey = makeInterfaceKey(conn.to.port, conn.type);
      const sources = outputInterfaceMap.get(fromSubapp)?.get(fromKey) || [];
      const destinations = inputInterfaceMap.get(toSubapp)?.get(toKey) || [];
      const result: QualifiedConnection[] = [];
      for (const source of sources) {
        for (const destination of destinations) {
          result.push({
            from: source,
            to: destination,
            type: conn.type,
          });
        }
      }
      return result;
    }

    // SubApp output to external: expand source
    if (fromSubapp && fromIface && (!conn.type || fromIface.kind === conn.type)) {
      const key = makeInterfaceKey(conn.from.port, conn.type);
      const sources = outputInterfaceMap.get(fromSubapp)?.get(key) || [];
      return sources.map((source) => ({
        from: source,
        to: conn.to,
        type: conn.type,
      }));
    }

    // External to SubApp input: expand destination
    if (toSubapp && toIface && (!conn.type || toIface.kind === conn.type)) {
      const key = makeInterfaceKey(conn.to.port, conn.type);
      externalInputConnections.add(`${toSubapp}|${key}`);
      const destinations = inputInterfaceMap.get(toSubapp)?.get(key) || [];
      return destinations.map((destination) => ({
        from: conn.from,
        to: destination,
        type: conn.type,
      }));
    }

    return [conn];
  }

  /**
   * Builds literal write commands for SubApp input parameters that don't have external connections.
   */
  private buildLiteralWrites(
    params: any[],
    expandedSubapps: Set<string>,
    isEmptyLiteralFn: (value: string) => boolean,
    makeInterfaceKey: (port: string, type: ConnectionKind) => string,
    getInterfaceParam: (subappName: string, port: string) => SubAppInterfaceParam | undefined,
    inputInterfaceMap: Map<string, Map<string, QualifiedEndpoint[]>>,
    externalInputConnections: Set<string>,
  ): Map<string, Array<{ destination: string; value: string }>> {
    // Collect SubApp parameter values for data inputs
    const subappParamValues = new Map<string, Map<string, string>>();
    for (const param of params) {
      if (!expandedSubapps.has(param.qualifiedFBName)) {
        continue;
      }
      if (isEmptyLiteralFn(param.value)) {
        continue;
      }
      const iface = getInterfaceParam(param.qualifiedFBName, param.name);
      if (!iface || iface.kind !== "data" || iface.direction !== "input") {
        continue;
      }
      let portMap = subappParamValues.get(param.qualifiedFBName);
      if (!portMap) {
        portMap = new Map();
        subappParamValues.set(param.qualifiedFBName, portMap);
      }
      portMap.set(param.name, param.value);
    }

    // Build literal writes for each SubApp input that doesn't have external connection
    const literalWritesByFb = new Map<string, Array<{ destination: string; value: string }>>();
    for (const [subappName, portValues] of subappParamValues) {
      for (const [port, value] of portValues) {
        const key = makeInterfaceKey(port, "data");
        if (externalInputConnections.has(`${subappName}|${key}`)) {
          continue;
        }
        const destinations = inputInterfaceMap.get(subappName)?.get(key) || [];
        for (const destination of destinations) {
          const destQualified = `${destination.qualifiedBlock}.${destination.port}`;
          const fbWrites = literalWritesByFb.get(destination.qualifiedBlock) || [];
          fbWrites.push({ destination: destQualified, value });
          literalWritesByFb.set(destination.qualifiedBlock, fbWrites);
        }
      }
    }

    return literalWritesByFb;
  }
}
