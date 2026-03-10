import { QualifiedConnection } from "./NetworkTraverser";

/**
 * Sorts connections by destination FB to maintain proper initialization order.
 * Groups event and data connections separately for each destination.
 */
export class ConnectionSorter {
  /**
   * Sorts connections by destination FB order, with event connections before data connections.
   * FBs in fbOrder are processed first, then remaining destinations.
   */
  sortConnectionsByDestination(
    connections: QualifiedConnection[],
    fbOrder: string[],
  ): QualifiedConnection[] {
    const mappedFbSet = new Set(fbOrder);
    const eventByDest = new Map<string, QualifiedConnection[]>();
    const dataByDest = new Map<string, QualifiedConnection[]>();
    const otherByDest = new Map<string, QualifiedConnection[]>();
    const remainingDestOrder: string[] = [];
    const remainingDestSet = new Set<string>();

    const pushByDest = (
      map: Map<string, QualifiedConnection[]>,
      destination: string,
      conn: QualifiedConnection,
    ) => {
      let list = map.get(destination);
      if (!list) {
        list = [];
        map.set(destination, list);
        // Track destinations not in FB order
        if (!mappedFbSet.has(destination) && !remainingDestSet.has(destination)) {
          remainingDestOrder.push(destination);
          remainingDestSet.add(destination);
        }
      }
      list.push(conn);
    };

    // Group connections by destination and type
    for (const conn of connections) {
      const dest = conn.to.qualifiedBlock;
      if (conn.type === "event") {
        pushByDest(eventByDest, dest, conn);
      } else if (conn.type === "data") {
        pushByDest(dataByDest, dest, conn);
      } else {
        pushByDest(otherByDest, dest, conn);
      }
    }

    const orderedConnections: QualifiedConnection[] = [];

    // Process FBs in given order (event before data)
    for (const dest of fbOrder) {
      const events = eventByDest.get(dest);
      if (events) {
        orderedConnections.push(...events);
        eventByDest.delete(dest);
      }
      const datas = dataByDest.get(dest);
      if (datas) {
        orderedConnections.push(...datas);
        dataByDest.delete(dest);
      }
      const others = otherByDest.get(dest);
      if (others) {
        orderedConnections.push(...others);
        otherByDest.delete(dest);
      }
    }

    // Process remaining destinations (event before data)
    for (const dest of remainingDestOrder) {
      const events = eventByDest.get(dest);
      if (events) {
        orderedConnections.push(...events);
        eventByDest.delete(dest);
      }
      const datas = dataByDest.get(dest);
      if (datas) {
        orderedConnections.push(...datas);
        dataByDest.delete(dest);
      }
      const others = otherByDest.get(dest);
      if (others) {
        orderedConnections.push(...others);
        otherByDest.delete(dest);
      }
    }

    return orderedConnections;
  }
}
