// ============================================================================
// SpritePlayerTests - Validation du lecteur de sprites 8x8
// ----------------------------------------------------------------------------
// Ces tests controlent le rendu generique, la vitesse, les donnees Lil' Birb et
// leur exposition par le registre sans solliciter le transport LAN.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  LIL_BIRB_EAT_CLIP,
  LIL_BIRB_FLIGHT_CLIP,
  LIL_BIRB_IDLE_CLIP,
  LIL_BIRB_LANDING_CLIP,
  LIL_BIRB_TAKE_OFF_CLIP,
} from "../assets/lil_birb";
import { StreamingFramebuffer } from "../framebuffer";
import { listStreamingAnimations } from "../registry";
import { SpritePlayerAnimation } from "./sprite_player";
import type { SpriteClip } from "./types";

// Clip minimal dont les deux images isolent la lecture temporelle.
const TEST_CLIP: SpriteClip = {
  atlas: {
    frames: [
      ["R.......", "........", "........", "........", "........", "........", "........", "........"],
      ["G.......", "........", "........", "........", "........", "........", "........", "........"],
    ],
    palette: {
      R: { red: 255, green: 0, blue: 0 },
      G: { red: 0, green: 255, blue: 0 },
    },
  },
  timeline: [
    { frameIndex: 0, durationMs: 100 },
    { frameIndex: 1, durationMs: 100 },
  ],
  planeZ: 2,
};

// Cinq clips attendus dans l'ordre publie par le pack d'origine.
const LIL_BIRB_CLIPS = [
  LIL_BIRB_IDLE_CLIP,
  LIL_BIRB_EAT_CLIP,
  LIL_BIRB_TAKE_OFF_CLIP,
  LIL_BIRB_FLIGHT_CLIP,
  LIL_BIRB_LANDING_CLIP,
] as const;

describe("SpritePlayerAnimation", () => {
  it("inverse la verticale du PNG et respecte le plan choisi", () => {
    const framebuffer = new StreamingFramebuffer();
    const animation = new SpritePlayerAnimation(TEST_CLIP);
    animation.init(framebuffer);
    animation.frame(framebuffer, 0);
    expect(framebuffer.getVoxel(0, 7, 2)).toEqual([255, 0, 0]);
    expect(framebuffer.getVoxel(0, 0, 2)).toEqual([0, 0, 0]);
  });

  it("applique la vitesse sans dependre de la cadence LAN", () => {
    const framebuffer = new StreamingFramebuffer();
    const animation = new SpritePlayerAnimation(TEST_CLIP);
    animation.setSpeed(20);
    animation.frame(framebuffer, 0.05);
    expect(framebuffer.getVoxel(0, 7, 2)).toEqual([0, 255, 0]);
  });

  it("conserve les cinq timelines Lil Birb et leurs motifs 8x8", () => {
    expect(LIL_BIRB_CLIPS.map((clip) => clip.timeline.length)).toEqual([3, 3, 9, 4, 10]);
    for (const clip of LIL_BIRB_CLIPS) {
      expect(clip.planeZ).toBe(7);
      for (const frame of clip.atlas.frames) {
        expect(frame).toHaveLength(8);
        expect(frame.every((row) => row.length === 8)).toBe(true);
      }
    }
  });

  it("expose la sphere et les cinq sequences dans le registre", () => {
    const definitions = listStreamingAnimations();
    expect(definitions.map((definition) => definition.id)).toEqual([
      "moving-sphere",
      "lil-birb-idle",
      "lil-birb-eat",
      "lil-birb-take-off",
      "lil-birb-flight",
      "lil-birb-landing",
    ]);
    expect(definitions.every((definition) => definition.create() !== null)).toBe(true);
  });
});
