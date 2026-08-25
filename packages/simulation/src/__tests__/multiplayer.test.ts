import { describe, it, expect } from "vitest";
import {
  calculateStateChecksum,
  deserializeCommand,
  LocalLoopbackTransport,
  LockstepCommandBuffer,
  LockstepSession,
  serializeCommand,
} from "../multiplayer";
import { createMissionState, GOOSE_GREEN_MISSION, PROTOCOL_VERSION, type SimCommand } from "../index";

describe("Multiplayer & Lockstep Architecture", () => {
  it("serializes and deserializes SimCommand accurately", () => {
    const original: SimCommand = {
      protocolVersion: PROTOCOL_VERSION,
      matchId: "match-1982-alpha",
      playerId: "player-arg",
      side: "argentina",
      tick: 40,
      sequence: 101,
      type: "MOVE",
      unitIds: ["arg-inf-1", "arg-inf-2"],
      targetPosition: { x: 350, y: 420 },
    };

    const serialized = serializeCommand(original);
    const deserialized = deserializeCommand(serialized);

    expect(deserialized).toEqual(original);
  });

  it("throws on corrupted or incompatible command payloads", () => {
    expect(() => deserializeCommand("{invalid json")).toThrow();
    expect(() =>
      deserializeCommand(
        JSON.stringify({ protocolVersion: 999, matchId: "bad-ver" }),
      ),
    ).toThrow(/Protocol mismatch/);
  });

  it("calculates deterministic checksum for identical simulation states", () => {
    const stateA = createMissionState(GOOSE_GREEN_MISSION, "match-sync");
    const stateB = createMissionState(GOOSE_GREEN_MISSION, "match-sync");

    const checksumA = calculateStateChecksum(stateA);
    const checksumB = calculateStateChecksum(stateB);

    expect(checksumA).toBe(checksumB);
    expect(checksumA).toBeGreaterThan(0);
  });

  it("modifies checksum when state coordinates or health change", () => {
    const stateA = createMissionState(GOOSE_GREEN_MISSION, "match-sync");
    const stateB = createMissionState(GOOSE_GREEN_MISSION, "match-sync");

    const initialChecksum = calculateStateChecksum(stateA);

    // Modify a unit in stateB
    stateB.units[0].position.x += 10;
    const modifiedChecksum = calculateStateChecksum(stateB);

    expect(modifiedChecksum).not.toBe(initialChecksum);
  });

  it("manages lockstep command queue buffer with turn delay", () => {
    const buffer = new LockstepCommandBuffer(2);
    const cmd: SimCommand = {
      protocolVersion: PROTOCOL_VERSION,
      matchId: "m1",
      playerId: "p1",
      side: "argentina",
      tick: 10,
      sequence: 1,
      type: "HOLD",
      unitIds: ["arg-1"],
    };

    const targetTick = buffer.enqueue(cmd, 10);
    expect(targetTick).toBe(12);

    expect(buffer.consumeTickCommands(10)).toEqual([]);
    expect(buffer.consumeTickCommands(11)).toEqual([]);

    const consumed = buffer.consumeTickCommands(12);
    expect(consumed.length).toBe(1);
    expect(consumed[0].unitIds).toEqual(["arg-1"]);
  });

  it("transmits network packets between LocalLoopbackTransport peers", () => {
    const transportA = new LocalLoopbackTransport();
    const transportB = new LocalLoopbackTransport();

    transportA.connectToPeer(transportB);

    const received: any[] = [];
    transportB.onMessage((pkt) => {
      received.push(pkt);
    });

    transportA.send({
      protocolVersion: PROTOCOL_VERSION,
      matchId: "match-test",
      senderId: "playerA",
      senderSide: "argentina",
      type: "HELLO",
      tick: 0,
      payload: { ready: true },
    });

    expect(received.length).toBe(1);
    expect(received[0].senderId).toBe("playerA");
  });

  it("executes synchronized 2-player lockstep match without desync", () => {
    const transportA = new LocalLoopbackTransport();
    const transportB = new LocalLoopbackTransport();
    transportA.connectToPeer(transportB);

    const initialStateA = createMissionState(GOOSE_GREEN_MISSION, "match-1v1");
    const initialStateB = createMissionState(GOOSE_GREEN_MISSION, "match-1v1");

    const sessionA = new LockstepSession(
      initialStateA,
      GOOSE_GREEN_MISSION,
      "player-arg",
      "argentina",
      transportA,
      2,
    );

    const sessionB = new LockstepSession(
      initialStateB,
      GOOSE_GREEN_MISSION,
      "player-uk",
      "britain",
      transportB,
      2,
    );

    // Player A orders movement at tick 0
    sessionA.issueCommand("MOVE", ["arg-inf-1"], { x: 300, y: 350 });

    // Step both sessions concurrently for 15 ticks
    for (let t = 0; t < 15; t++) {
      sessionA.step();
      sessionB.step();
    }

    expect(sessionA.isDesynced).toBe(false);
    expect(sessionB.isDesynced).toBe(false);

    // Verify final checksum match
    const finalChecksumA = calculateStateChecksum(sessionA.state);
    const finalChecksumB = calculateStateChecksum(sessionB.state);
    expect(finalChecksumA).toBe(finalChecksumB);
  });
});
