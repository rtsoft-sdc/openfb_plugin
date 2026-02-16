import { SysConnection } from "../sysModel";

export function parseConnections(
  network: any,
  logger: any,
): SysConnection[] {
  const connections: SysConnection[] = [];

  const connectionTypes: Array<{ path: string; type: "event" | "data" }> = [
    { path: "EventConnections", type: "event" },
    { path: "DataConnections", type: "data" },
  ];

  for (const { path: connPath, type } of connectionTypes) {
    const connList = network?.[connPath]?.Connection;
    if (!connList) continue;

    const connArray = Array.isArray(connList) ? connList : [connList];
    for (const conn of connArray) {
      if (!conn?.Source || !conn?.Destination) continue;

      const sourceParts = conn.Source.split(".");
      const destParts = conn.Destination.split(".");

      if (sourceParts.length >= 2 && destParts.length >= 2) {
        const fromPort = sourceParts.pop()!;
        const toPort = destParts.pop()!;

        connections.push({
          fromBlock: sourceParts.join("."),
          fromPort,
          toBlock: destParts.join("."),
          toPort,
          type,
        });
      }
    }
  }

  logger.debug(`Parsed ${connections.length} connections (event + data)`);
  return connections;
}
