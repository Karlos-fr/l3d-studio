// ============================================================================
// BytecodeSimulationTest - Tests de la cadence de simulation procedurale
// ----------------------------------------------------------------------------
// Ce fichier injecte horloge et timers. Il ne depend ni du DOM ni du reseau.
// ============================================================================

import { describe, expect, it } from "vitest";
import { assembleBytecodeSource } from "./assembler";
import { BytecodeSimulationRunner, type BytecodeSimulationSnapshot } from "./simulation";

// ----------------------------------------------------------------------------
// Verifie demarrage, pause et reinitialisation deterministe.
// ----------------------------------------------------------------------------
function runSimulationTests(): void {
  it("pilote la VM et copie sa frame dans l'apercu", () => {
    let now = 0;
    let scheduled: (() => void) | null = null;
    let latest: BytecodeSimulationSnapshot | null = null;
    const runner = new BytecodeSimulationRunner({
      now: () => now,
      schedule: (callback) => { scheduled = callback; return 1; },
      cancel: () => { scheduled = null; },
      onUpdate: (snapshot) => { latest = snapshot; },
    });
    const program = assembleBytecodeSource(
      "LOOP:\nCLEAR\nCOLOR_RGB 255 0 0\nSET_U8 R0 1\nVOXEL R0 R0 R0\nSHOW\nWAIT 10\nJUMP LOOP\n",
    );
    runner.load(program.container);
    runner.start();
    expect(latest).toMatchObject({ state: "running", shownFrames: 1 });
    expect(runner.framebuffer.getVoxel(1, 1, 1)).toEqual([255, 0, 0]);
    expect(scheduled).not.toBeNull();

    now = 5;
    const firstScheduled = scheduled as (() => void) | null;
    if (firstScheduled !== null) firstScheduled();
    runner.pause();
    expect(latest).toMatchObject({ state: "paused" });
    runner.resetSeed();
    expect(latest).toMatchObject({ state: "stopped", instructionCount: 0 });
  });
}

describe("simulation bytecode", runSimulationTests);
