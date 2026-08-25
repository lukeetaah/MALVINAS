import type {
  CommandType,
  MatchState,
  MissionDefinition,
  Side,
  SimCommand,
  Vec2,
} from "./types";
import { PROTOCOL_VERSION } from "./types";
import { stepMission } from "./mission";

export type NetworkPacketType =
  | "HELLO"
  | "READY"
  | "COMMAND_BATCH"
  | "CHECKSUM_SYNC"
  | "PAUSE"
  | "RESUME"
  | "DESYNC_ALERT"
  | "DISCONNECT";

export interface NetworkPacket {
  protocolVersion: typeof PROTOCOL_VERSION;
  matchId: string;
  senderId: string;
  senderSide: Side;
  type: NetworkPacketType;
  tick: number;
  payload: any;
}

export interface CommandBatchPayload {
  tick: number;
  commands: SimCommand[];
  stateChecksum?: number;
}

export interface ChecksumSyncPayload {
  tick: number;
  checksum: number;
}

export interface NetworkTransport {
  send(packet: NetworkPacket): void;
  onMessage(handler: (packet: NetworkPacket) => void): void;
  disconnect(): void;
  isConnected(): boolean;
  getLatency(): number;
}

/**
 * Deterministic integer hash (FNV-1a 32-bit variant) across all critical simulation state variables.
 */
export function calculateStateChecksum(state: MatchState): number {
  let hash = 2166136261;

  function addNumber(n: number) {
    const intVal = Math.round(n * 100) | 0;
    hash ^= intVal & 0xff;
    hash = Math.imul(hash, 16777619);
    hash ^= (intVal >> 8) & 0xff;
    hash = Math.imul(hash, 16777619);
  }

  function addString(str: string) {
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }

  // 1. Tick
  addNumber(state.tick);

  // 2. Units (sorted by ID for absolute determinism)
  const sortedUnits = [...state.units].sort((a, b) => a.id.localeCompare(b.id));
  for (const u of sortedUnits) {
    addString(u.id);
    addNumber(u.alive ? 1 : 0);
    if (u.alive) {
      addNumber(u.position.x);
      addNumber(u.position.y);
      addNumber(u.health);
      addNumber(u.ammunition);
      addNumber(u.fuel);
      addNumber(u.entrenched ? 1 : 0);
      addNumber(u.isSuppressed ? 1 : 0);
    }
  }

  // 3. Control points
  const controlKeys = Object.keys(state.control).sort();
  for (const key of controlKeys) {
    addString(key);
    addString(state.control[key] ?? "none");
  }

  return hash >>> 0;
}

/**
 * Compact command serialization to JSON string.
 */
export function serializeCommand(command: SimCommand): string {
  return JSON.stringify(command);
}

/**
 * Validated command deserialization from JSON string.
 */
export function deserializeCommand(raw: string): SimCommand {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid command payload: expected object");
  }
  if (parsed.protocolVersion !== PROTOCOL_VERSION) {
    throw new Error(
      `Protocol mismatch: expected ${PROTOCOL_VERSION}, got ${parsed.protocolVersion}`,
    );
  }
  return parsed as SimCommand;
}

/**
 * Lockstep command buffer managing turn execution pacing.
 */
export class LockstepCommandBuffer {
  private buffer: Map<number, SimCommand[]> = new Map();
  private turnDelay: number;

  constructor(turnDelay = 2) {
    this.turnDelay = turnDelay;
  }

  /**
   * Enqueues a command for execution at (currentTick + turnDelay).
   */
  public enqueue(cmd: SimCommand, currentTick: number): number {
    const targetTick = Math.max(cmd.tick, currentTick + this.turnDelay);
    if (!this.buffer.has(targetTick)) {
      this.buffer.set(targetTick, []);
    }
    this.buffer.get(targetTick)!.push({
      ...cmd,
      tick: targetTick,
    });
    return targetTick;
  }

  /**
   * Enqueues verified commands directly for target tick.
   */
  public addRemoteCommands(tick: number, commands: SimCommand[]): void {
    if (!this.buffer.has(tick)) {
      this.buffer.set(tick, []);
    }
    const bucket = this.buffer.get(tick)!;
    for (const cmd of commands) {
      bucket.push(cmd);
    }
  }

  /**
   * Extracts and clears commands scheduled for the given tick.
   */
  public consumeTickCommands(tick: number): SimCommand[] {
    const cmds = this.buffer.get(tick) ?? [];
    this.buffer.delete(tick);
    // Sort by sequence number for strict execution ordering
    return cmds.sort((a, b) => a.sequence - b.sequence);
  }

  public clear(): void {
    this.buffer.clear();
  }
}

/**
 * In-memory local loopback transport for hotseat, bots, and automated networking tests.
 */
export class LocalLoopbackTransport implements NetworkTransport {
  private peer: LocalLoopbackTransport | null = null;
  private messageHandlers: ((packet: NetworkPacket) => void)[] = [];
  private simulatedLatencyMs: number;
  private connected = true;

  constructor(simulatedLatencyMs = 0) {
    this.simulatedLatencyMs = simulatedLatencyMs;
  }

  public connectToPeer(peer: LocalLoopbackTransport): void {
    this.peer = peer;
    peer.peer = this;
  }

  public send(packet: NetworkPacket): void {
    if (!this.connected || !this.peer) return;

    if (this.simulatedLatencyMs <= 0) {
      this.peer.receive(packet);
    } else {
      setTimeout(() => {
        if (this.peer && this.connected) {
          this.peer.receive(packet);
        }
      }, this.simulatedLatencyMs);
    }
  }

  public receive(packet: NetworkPacket): void {
    for (const handler of this.messageHandlers) {
      handler(packet);
    }
  }

  public onMessage(handler: (packet: NetworkPacket) => void): void {
    this.messageHandlers.push(handler);
  }

  public disconnect(): void {
    this.connected = false;
    if (this.peer) {
      this.peer.connected = false;
    }
  }

  public isConnected(): boolean {
    return this.connected && Boolean(this.peer);
  }

  public getLatency(): number {
    return this.simulatedLatencyMs;
  }
}

/**
 * Lockstep Session Orchestrator connecting two players.
 */
export class LockstepSession {
  public state: MatchState;
  public mission: MissionDefinition;
  public localPlayerId: string;
  public localSide: Side;
  public transport: NetworkTransport;
  public commandBuffer: LockstepCommandBuffer;

  public isDesynced = false;
  public onDesync?: (tick: number, localChecksum: number, remoteChecksum: number) => void;

  constructor(
    initialState: MatchState,
    mission: MissionDefinition,
    localPlayerId: string,
    localSide: Side,
    transport: NetworkTransport,
    turnDelay = 2,
  ) {
    this.state = initialState;
    this.mission = mission;
    this.localPlayerId = localPlayerId;
    this.localSide = localSide;
    this.transport = transport;
    this.commandBuffer = new LockstepCommandBuffer(turnDelay);

    this.transport.onMessage(this.handleIncomingPacket.bind(this));
  }

  /**
   * Issues a local command and broadcasts it to the remote peer.
   */
  public issueCommand(
    type: CommandType,
    unitIds: string[],
    targetPosition?: Vec2,
    targetUnitIds?: string[],
  ): SimCommand {
    const cmd: SimCommand = {
      protocolVersion: PROTOCOL_VERSION,
      matchId: this.state.matchId,
      playerId: this.localPlayerId,
      side: this.localSide,
      tick: this.state.tick,
      sequence: Math.floor(Math.random() * 1000000),
      type,
      unitIds,
      targetPosition,
      targetUnitIds,
    };

    const scheduledTick = this.commandBuffer.enqueue(cmd, this.state.tick);

    // Broadcast batch to peer
    this.transport.send({
      protocolVersion: PROTOCOL_VERSION,
      matchId: this.state.matchId,
      senderId: this.localPlayerId,
      senderSide: this.localSide,
      type: "COMMAND_BATCH",
      tick: scheduledTick,
      payload: {
        tick: scheduledTick,
        commands: [cmd],
      } as CommandBatchPayload,
    });

    return cmd;
  }

  /**
   * Advances the simulation by one synchronized lockstep tick.
   */
  public step(): MatchState {
    const commands = this.commandBuffer.consumeTickCommands(this.state.tick);
    this.state = stepMission(this.state, this.mission, commands);

    // Broadcast checksum on every 10 ticks (1 second)
    if (this.state.tick % 10 === 0) {
      const checksum = calculateStateChecksum(this.state);
      this.transport.send({
        protocolVersion: PROTOCOL_VERSION,
        matchId: this.state.matchId,
        senderId: this.localPlayerId,
        senderSide: this.localSide,
        type: "CHECKSUM_SYNC",
        tick: this.state.tick,
        payload: {
          tick: this.state.tick,
          checksum,
        } as ChecksumSyncPayload,
      });
    }

    return this.state;
  }

  private handleIncomingPacket(packet: NetworkPacket): void {
    if (packet.matchId !== this.state.matchId) return;

    if (packet.type === "COMMAND_BATCH") {
      const payload = packet.payload as CommandBatchPayload;
      this.commandBuffer.addRemoteCommands(payload.tick, payload.commands);
    } else if (packet.type === "CHECKSUM_SYNC") {
      const payload = packet.payload as ChecksumSyncPayload;
      if (payload.tick === this.state.tick) {
        const localChecksum = calculateStateChecksum(this.state);
        if (localChecksum !== payload.checksum) {
          this.isDesynced = true;
          if (this.onDesync) {
            this.onDesync(payload.tick, localChecksum, payload.checksum);
          }
        }
      }
    }
  }
}
