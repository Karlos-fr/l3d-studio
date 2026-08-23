// ============================================================================
// PaintingModelTest - Tests du dessin local et de sa persistance
// ----------------------------------------------------------------------------
// Ce fichier valide couleurs, gomme, bornes et restauration sans navigateur ni
// serveur LAN reel.
// ============================================================================

import { describe, expect, it } from "vitest";
import { StreamingFramebuffer } from "../streaming/framebuffer";
import {
  loadPainterFramebuffer,
  PAINTER_STORAGE_KEY,
  paintVoxel,
  savePainterFramebuffer,
  type PainterStorage,
} from "./model";

class MemoryPainterStorage implements PainterStorage {
  // Valeurs exposees uniquement aux assertions du test.
  readonly values = new Map<string, string>();

  // --------------------------------------------------------------------------
  // Lit une valeur memoire comme localStorage.
  //
  // Parametres :
  // - key : cle recherchee.
  //
  // Retour :
  // - valeur conservee ou null.
  // --------------------------------------------------------------------------
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  // --------------------------------------------------------------------------
  // Remplace une valeur memoire comme localStorage.
  //
  // Parametres :
  // - key : cle cible.
  // - value : texte a conserver.
  // --------------------------------------------------------------------------
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

// ----------------------------------------------------------------------------
// Execute les tests du modele de peinture.
// ----------------------------------------------------------------------------
function runPaintingModelTests(): void {
  // --------------------------------------------------------------------------
  // Verifie le dessin RGB, la gomme et les coordonnees refusees.
  // --------------------------------------------------------------------------
  it("dessine et efface uniquement un voxel valide", () => {
    const framebuffer = new StreamingFramebuffer();
    expect(paintVoxel(framebuffer, 2, 3, 4, "#12abef", "draw")).toBe(true);
    expect(framebuffer.getVoxel(2, 3, 4)).toEqual([0x12, 0xab, 0xef]);
    expect(paintVoxel(framebuffer, 2, 3, 4, "#12abef", "erase")).toBe(true);
    expect(framebuffer.getVoxel(2, 3, 4)).toEqual([0, 0, 0]);
    expect(paintVoxel(framebuffer, 8, 3, 4, "#ffffff", "draw")).toBe(false);
    expect(paintVoxel(framebuffer, 1, 1, 1, "rouge", "draw")).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Verifie une restauration exacte et le repli noir sur une valeur corrompue.
  // --------------------------------------------------------------------------
  it("persiste exactement le dessin dans le navigateur", () => {
    const storage = new MemoryPainterStorage();
    const framebuffer = new StreamingFramebuffer();
    framebuffer.setVoxel(7, 6, 5, 1, 127, 255);
    savePainterFramebuffer(storage, framebuffer);
    expect(storage.values.get(PAINTER_STORAGE_KEY)).toHaveLength(3_072);
    expect(loadPainterFramebuffer(storage).getVoxel(7, 6, 5)).toEqual([1, 127, 255]);
    storage.values.set(PAINTER_STORAGE_KEY, "invalide");
    expect(loadPainterFramebuffer(storage).getVoxel(7, 6, 5)).toEqual([0, 0, 0]);
  });
}

describe("modele du peintre", runPaintingModelTests);
