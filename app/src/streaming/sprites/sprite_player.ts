// ============================================================================
// SpritePlayer - Lecteur generique de sprites 8x8
// ----------------------------------------------------------------------------
// Le lecteur transforme une timeline et une palette en voxels sur un plan. Les
// donnees de chaque pack restent isolees dans leur propre module d'asset.
// ============================================================================

import type { StreamingAnimation } from "../animation";
import type { StreamingFramebuffer } from "../framebuffer";
import { clearFramebuffer } from "../primitives";
import type { SpriteClip, SpriteTimelineFrame } from "./types";

// Cadence native de reference utilisee par le slider de vitesse.
const SPRITE_REFERENCE_FPS = 10;

// Lecteur boucle d'une sequence de sprites sur un plan vertical du cube.
export class SpritePlayerAnimation implements StreamingAnimation {
  private playbackFps = SPRITE_REFERENCE_FPS;
  private readonly totalDurationMs: number;

  // --------------------------------------------------------------------------
  // Prepare un lecteur pour une sequence validee par son module d'asset.
  //
  // Parametres :
  // - clip : atlas, timeline et profondeur du plan a afficher.
  // --------------------------------------------------------------------------
  constructor(private readonly clip: SpriteClip) {
    let durationMs = 0;
    for (const frame of clip.timeline) durationMs += frame.durationMs;
    this.totalDurationMs = durationMs;
  }

  // --------------------------------------------------------------------------
  // Efface l'image avant la premiere frame de la sequence.
  //
  // Parametres :
  // - framebuffer : destination logique du lecteur.
  // --------------------------------------------------------------------------
  init(framebuffer: StreamingFramebuffer): void {
    clearFramebuffer(framebuffer);
  }

  // --------------------------------------------------------------------------
  // Borne la cadence de lecture sans modifier la timeline source.
  //
  // Parametres :
  // - stepsPerSecond : vitesse demandee entre une et trente images par seconde.
  // --------------------------------------------------------------------------
  setSpeed(stepsPerSecond: number): void {
    this.playbackFps = Math.max(1, Math.min(30, Math.round(stepsPerSecond)));
  }

  // --------------------------------------------------------------------------
  // Selectionne puis dessine l'image correspondant au temps courant.
  //
  // Parametres :
  // - framebuffer : destination logique effacee a chaque image.
  // - elapsedSeconds : temps ecoule depuis la selection de la sequence.
  // --------------------------------------------------------------------------
  frame(framebuffer: StreamingFramebuffer, elapsedSeconds: number): void {
    clearFramebuffer(framebuffer);
    const timelineFrame = this.findTimelineFrame(elapsedSeconds);
    if (timelineFrame === null) return;
    const spriteRows = this.clip.atlas.frames[timelineFrame.frameIndex];
    if (spriteRows === undefined) return;
    for (let sourceY = 0; sourceY < spriteRows.length; sourceY += 1) {
      const row = spriteRows[sourceY] ?? "";
      for (let x = 0; x < row.length; x += 1) {
        const color = this.clip.atlas.palette[row[x] ?? "."];
        if (color === undefined) continue;
        framebuffer.setVoxel(x, 7 - sourceY, this.clip.planeZ, color.red, color.green, color.blue);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Recherche l'image active dans une timeline bouclee et redimensionnee.
  //
  // Parametres :
  // - elapsedSeconds : temps reel ecoule depuis la selection.
  //
  // Retour :
  // - image de timeline courante, ou null pour une sequence vide.
  // --------------------------------------------------------------------------
  private findTimelineFrame(elapsedSeconds: number): SpriteTimelineFrame | null {
    if (this.totalDurationMs <= 0 || this.clip.timeline.length === 0) return null;
    const scaledMilliseconds = elapsedSeconds * 1000 * this.playbackFps / SPRITE_REFERENCE_FPS;
    let timelinePosition = scaledMilliseconds % this.totalDurationMs;
    for (const frame of this.clip.timeline) {
      if (timelinePosition < frame.durationMs) return frame;
      timelinePosition -= frame.durationMs;
    }
    return this.clip.timeline[0] ?? null;
  }
}
