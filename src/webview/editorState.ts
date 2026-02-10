import { FBTypeModel, FBPort } from "../domain/fbtModel";
import { getWebviewLogger } from "./logging";

export interface EditorPort extends FBPort {
  id: string;
  nodeId: string;
  x: number;
  y: number;
}

export interface EditorNode {
  id: string;
  type: string;
  x: number;
  y: number;
  ports: EditorPort[];
  width: number;
  height: number;
}

export interface EditorConnection {
  id: string;
  fromPortId: string;
  toPortId: string;
}

export class EditorState {
  nodes: EditorNode[] = [];
  connections: EditorConnection[] = [];
  isDragging = false;
  private logger = getWebviewLogger();

  selection: {
    nodeId?: string;
    connectionId?: string;
  } = {};

  public loadFromDiagram(
    diagram: any,
    fbTypes: Map<string, FBTypeModel>
  ) {
    this.logger.debug("loadFromDiagram called with", {
      blocksCount: diagram.blocks?.length,
      connectionsCount: diagram.connections?.length,
      fbTypesSize: fbTypes.size,
    });

    this.nodes = diagram.blocks.map((b: any) => {
      const fbType = fbTypes.get(b.type);
      this.logger.debug(`Processing block ${b.id} of type ${b.type}: fbType found=${!!fbType}`);

      const ports = fbType ? this.buildPorts(b.id, fbType) : [];
      const { width, height } = this.calculateNodeDimensions(ports);

      const node = {
        id: b.id,
        type: b.type,
        x: b.x,
        y: b.y,
        ports: ports,
        width: width,
        height: height
      };
      this.logger.debug(`Created node ${node.id}: (${node.x}, ${node.y}) with ${node.ports.length} ports, size=${width}x${height}`);
      return node;
    });

    this.logger.info("Total nodes created", this.nodes.length);

    // Load connections
    this.connections = diagram.connections.map((c: any) => ({
      id: `${c.fromBlock}.${c.fromPort}->${c.toBlock}.${c.toPort}`,
      fromPortId: `${c.fromBlock}.${c.fromPort}`,
      toPortId: `${c.toBlock}.${c.toPort}`
    }));

    this.logger.info("Total connections created", this.connections.length);
  }

  private buildPorts(
    nodeId: string,
    fbType: FBTypeModel
  ): EditorPort[] {
    return fbType.ports.map((p, index) => ({
      ...p,
      id: `${nodeId}.${p.name}`,
      nodeId,
      x: 0,
      y: 0
    }));
  }

  private calculateNodeDimensions(ports: EditorPort[]): { width: number; height: number } {
    const PORT_SPACING = 18;
    const PORT_RADIUS = 4;
    const MIN_WIDTH = 140;
    const MIN_HEIGHT = 80;
    const PADDING_X = 16;
    const PADDING_Y = 12;
    const GAP_BETWEEN_ZONES = 8;

    // Find longest port name for width calculation
    const longestPortName = ports.reduce((max, p) => 
      p.name.length > max.length ? p.name : max, 
      ""
    );

    // Estimate width based on port names + space for arrows and labels on both sides
    // Each port label needs: arrow (8px) + gap (8px) + text width
    // We need space on BOTH sides (input and output), so multiply base width by 2
    const estimatedTextWidth = longestPortName.length * 7.5; // ~7.5px per char in 11px monospace
    const width = Math.max(
      MIN_WIDTH,
      estimatedTextWidth * 2 + PADDING_X + 40  // *2 for both sides, +40 for arrows and spacing
    );

    // Calculate height based on port zones:
    // Separate into Event and Data ports, then Input and Output
    const inputs = ports.filter((p) => p.direction === "input");
    const outputs = ports.filter((p) => p.direction === "output");

    const eventInputs = inputs.filter((p) => p.kind === "event");
    const eventOutputs = outputs.filter((p) => p.kind === "event");
    const dataInputs = inputs.filter((p) => p.kind === "data");
    const dataOutputs = outputs.filter((p) => p.kind === "data");

    // Height calculation:
    // - Initial padding
    // - Max of event inputs/outputs * spacing
    // - Gap
    // - Max of data inputs/outputs * spacing
    // - Final padding

    const eventZoneHeight = Math.max(eventInputs.length, eventOutputs.length) > 0
      ? Math.max(eventInputs.length, eventOutputs.length) * PORT_SPACING + 4
      : 0;

    const dataZoneHeight = Math.max(dataInputs.length, dataOutputs.length) > 0
      ? Math.max(dataInputs.length, dataOutputs.length) * PORT_SPACING + 4
      : 0;

    const height = Math.max(
      MIN_HEIGHT,
      PADDING_Y + eventZoneHeight + (eventZoneHeight > 0 && dataZoneHeight > 0 ? GAP_BETWEEN_ZONES : 0) + dataZoneHeight + 6
    );

    return { width, height };
  }

  public moveNode(id: string, x: number, y: number) {
    const node = this.nodes.find(n => n.id === id);
    if (!node) return;

    node.x = x;
    node.y = y;
  }

  public selectNode(id?: string) {
    this.selection.nodeId = id;
  }
}
