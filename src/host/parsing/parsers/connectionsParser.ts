import { SysConnection, SUBAPP_INTERFACE_BLOCK } from "../../../shared/models/sysModel";
import { asArray } from "../../../shared/utils/arrayUtils";

export function parseConnections(
  network: any,
  logger: any,
  allowInterface: boolean = false,
): SysConnection[] {
  const connections: SysConnection[] = [];

  const connectionTypes: Array<{ path: string; type: "event" | "data" }> = [
    { path: "EventConnections", type: "event" },
    { path: "DataConnections", type: "data" },
  ];

  for (const { path: connPath, type } of connectionTypes) {
    const connList = network?.[connPath]?.Connection;
    if (!connList) continue;

    const connArray = asArray(connList);
    for (const conn of connArray) {
      if (!conn?.Source || !conn?.Destination) continue;

      const sourceParts = conn.Source.split(".");
      const destParts = conn.Destination.split(".");

      const sourceIsInterface = allowInterface && sourceParts.length === 1;
      const destIsInterface = allowInterface && destParts.length === 1;

      if ((sourceParts.length < 2 && !sourceIsInterface) || (destParts.length < 2 && !destIsInterface)) {
        continue;
      }

      const fromPort = sourceParts.pop()!;
      const toPort = destParts.pop()!;

      const fromBlock = sourceIsInterface ? SUBAPP_INTERFACE_BLOCK : sourceParts.join(".");
      const toBlock = destIsInterface ? SUBAPP_INTERFACE_BLOCK : destParts.join(".");

      connections.push({
        fromBlock,
        fromPort,
        toBlock,
        toPort,
        type,
      });
    }
  }

  logger.debug(`Parsed ${connections.length} connections (event + data)`);
  return connections;
}
