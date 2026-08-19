// ============================================================================
// Streaming - Tests du framebuffer, des primitives et du transport borne
// ----------------------------------------------------------------------------
// Ces tests valident les briques pures de la phase web sans navigateur reel ni
// Photon connecte.
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { StreamingFramebuffer, getStreamingVoxelIndex } from "./framebuffer";
import { createStreamingEngine, normalizeStreamingFps } from "./engine";
import { clearFramebuffer, drawStreamingLine, drawStreamingSphere } from "./primitives";
import { packRgb332, serializeRgb332 } from "./serializer";

describe("framebuffer logique", () => {
  it("borne les coordonnees et conserve l'ordre z, y, x", () => {
    expect(getStreamingVoxelIndex(0, 0, 0)).toBe(0);
    expect(getStreamingVoxelIndex(7, 0, 0)).toBe(7);
    expect(getStreamingVoxelIndex(0, 1, 0)).toBe(8);
    expect(getStreamingVoxelIndex(0, 0, 1)).toBe(64);
    expect(getStreamingVoxelIndex(7, 7, 7)).toBe(511);
    expect(getStreamingVoxelIndex(8, 0, 0)).toBe(-1);
  });

  it("efface, trace une ligne et remplit une sphere", () => {
    const framebuffer = new StreamingFramebuffer();
    clearFramebuffer(framebuffer, { red: 1, green: 2, blue: 3 });
    expect(framebuffer.getVoxel(7, 7, 7)).toEqual([1, 2, 3]);
    clearFramebuffer(framebuffer);
    drawStreamingLine(
      framebuffer,
      { x: 0, y: 0, z: 0 },
      { x: 7, y: 7, z: 7 },
      { red: 255, green: 0, blue: 0 },
    );
    expect(framebuffer.getVoxel(4, 4, 4)).toEqual([255, 0, 0]);
    drawStreamingSphere(
      framebuffer,
      { x: 3.5, y: 3.5, z: 3.5 },
      1,
      { red: 0, green: 255, blue: 0 },
    );
    expect(framebuffer.getVoxel(3, 3, 3)).toEqual([0, 255, 0]);
  });
});

describe("serialisation RGB332", () => {
  it("reproduit les masques Processing", () => {
    expect(packRgb332(255, 0, 0)).toBe(0xe0);
    expect(packRgb332(0, 255, 0)).toBe(0x1c);
    expect(packRgb332(0, 0, 255)).toBe(0x03);
    expect(packRgb332(255, 255, 255)).toBe(0xff);
  });

  it("produit exactement 512 octets dans l'ordre contractuel", () => {
    const framebuffer = new StreamingFramebuffer();
    framebuffer.setVoxel(7, 0, 0, 255, 0, 0);
    framebuffer.setVoxel(0, 1, 0, 0, 255, 0);
    framebuffer.setVoxel(0, 0, 1, 0, 0, 255);
    const payload = serializeRgb332(framebuffer);
    expect(payload).toHaveLength(512);
    expect(payload[7]).toBe(0xe0);
    expect(payload[8]).toBe(0x1c);
    expect(payload[64]).toBe(0x03);
  });
});

describe("backpressure du moteur", () => {
  it("conserve chaque cadence entiere entre 10 et 30 FPS", () => {
    expect(normalizeStreamingFps(9)).toBe(10);
    expect(normalizeStreamingFps(17)).toBe(17);
    expect(normalizeStreamingFps(23)).toBe(23);
    expect(normalizeStreamingFps(31)).toBe(30);
  });

  it("ne lance jamais un second POST et compte la frame perdue", async () => {
    const callbacks: FrameRequestCallback[] = [];
    let resolveSend: () => void = () => undefined;
    const sendFrame = vi.fn(() => new Promise<void>((resolve) => { resolveSend = resolve; }));
    const engine = createStreamingEngine({
      animation: { init: vi.fn(), frame: vi.fn() },
      sendFrame,
      onFrame: vi.fn(),
      onStats: vi.fn(),
      onError: vi.fn(),
      requestFrame: (callback) => { callbacks.push(callback); return callbacks.length; },
      cancelFrame: vi.fn(),
    });
    engine.start(20);
    callbacks.shift()?.(0);
    callbacks.shift()?.(50);
    expect(sendFrame).toHaveBeenCalledTimes(1);
    expect(engine.getStats().droppedFrames).toBe(1);
    resolveSend();
    await Promise.resolve();
    engine.stop();
    callbacks.shift()?.(100);
    expect(sendFrame).toHaveBeenCalledTimes(1);
  });

  it("change la cadence active sans reinitialiser l'animation", () => {
    const animation = { init: vi.fn(), frame: vi.fn() };
    const engine = createStreamingEngine({
      animation,
      sendFrame: vi.fn(async () => undefined),
      onFrame: vi.fn(),
      onStats: vi.fn(),
      onError: vi.fn(),
      requestFrame: vi.fn(() => 1),
      cancelFrame: vi.fn(),
    });
    engine.start(10);
    engine.setTargetFps(23);
    expect(engine.getStats().targetFps).toBe(23);
    expect(engine.getStats().active).toBe(true);
    expect(animation.init).toHaveBeenCalledTimes(1);
  });

  it("remplace une animation active sans remettre les compteurs a zero", () => {
    const firstAnimation = { init: vi.fn(), frame: vi.fn() };
    const secondAnimation = { init: vi.fn(), frame: vi.fn() };
    const engine = createStreamingEngine({
      animation: firstAnimation,
      sendFrame: vi.fn(async () => undefined),
      onFrame: vi.fn(),
      onStats: vi.fn(),
      onError: vi.fn(),
      requestFrame: vi.fn(() => 1),
      cancelFrame: vi.fn(),
    });
    engine.start(10);
    engine.setAnimation(secondAnimation);
    expect(firstAnimation.init).toHaveBeenCalledTimes(1);
    expect(secondAnimation.init).toHaveBeenCalledTimes(1);
    expect(engine.getStats().active).toBe(true);
    expect(engine.getStats().sentFrames).toBe(0);
  });
});
