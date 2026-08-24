// ============================================================================
// PaintingModelTest - Tests du dessin local et de sa persistance
// ----------------------------------------------------------------------------
// Ce fichier valide couleurs, gomme, bornes et restauration sans navigateur ni
// serveur LAN reel.
// ============================================================================

import { describe, expect, it } from "vitest";
import { StreamingFramebuffer } from "../streaming/framebuffer";
import {
  createPainterDrawing,
  exportPainterDrawing,
  importPainterDrawing,
  loadPainterDrawing,
  PAINTER_STORAGE_KEY,
  paintVoxel,
  renderPainterDrawing,
  savePainterDrawing,
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
    // Dessin source qui conserve la couleur avant attenuation.
    const drawing = createPainterDrawing();
    // Framebuffer reutilise pour verifier les deux niveaux de luminosite.
    const framebuffer = new StreamingFramebuffer();
    expect(paintVoxel(drawing, 2, 3, 4, "#12abef", 50, "draw")).toBe(true);
    renderPainterDrawing(drawing, framebuffer);
    expect(framebuffer.getVoxel(2, 3, 4)).toEqual([9, 86, 120]);
    drawing.globalBrightnessPercent = 1;
    renderPainterDrawing(drawing, framebuffer);
    expect(framebuffer.getVoxel(2, 3, 4)).toEqual([9, 86, 120]);
    expect(paintVoxel(drawing, 2, 3, 4, "#12abef", 50, "erase")).toBe(true);
    renderPainterDrawing(drawing, framebuffer);
    expect(framebuffer.getVoxel(2, 3, 4)).toEqual([0, 0, 0]);
    expect(paintVoxel(drawing, 8, 3, 4, "#ffffff", 100, "draw")).toBe(false);
    expect(paintVoxel(drawing, 1, 1, 1, "rouge", 100, "draw")).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Verifie la migration automatique de l'ancien framebuffer hexadecimal.
  // --------------------------------------------------------------------------
  it("migre le brouillon RGB historique", () => {
    // Stockage memoire qui simule un navigateur encore au format precedent.
    const storage = new MemoryPainterStorage();
    // Ancien framebuffer noir dont le premier voxel devient rouge et vert.
    const legacy = `ff8000${"00".repeat(1_533)}`;
    storage.values.set("l3d-studio:painter-frame:v1", legacy);
    // Dessin restaure par le chemin de migration automatique.
    const drawing = loadPainterDrawing(storage);
    expect(drawing.colors.getVoxel(0, 0, 0)).toEqual([255, 128, 0]);
    expect(drawing.brightness[0]).toBe(100);
    expect(drawing.globalBrightnessPercent).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Verifie une restauration exacte et le repli noir sur une valeur corrompue.
  // --------------------------------------------------------------------------
  it("persiste exactement le dessin dans le navigateur", () => {
    // Stockage ephemere utilise pour controler le contenu sauvegarde.
    const storage = new MemoryPainterStorage();
    // Dessin contenant un voxel et deux luminosites non triviales.
    const drawing = createPainterDrawing();
    paintVoxel(drawing, 7, 6, 5, "#017fff", 72, "draw");
    drawing.globalBrightnessPercent = 64;
    savePainterDrawing(storage, drawing);
    // Copie rechargee depuis le document JSON nouvellement persiste.
    const restored = loadPainterDrawing(storage);
    expect(restored.colors.getVoxel(7, 6, 5)).toEqual([1, 127, 255]);
    expect(restored.brightness[5 * 64 + 6 * 8 + 7]).toBe(72);
    expect(restored.globalBrightnessPercent).toBe(64);
    storage.values.set(PAINTER_STORAGE_KEY, "invalide");
    expect(loadPainterDrawing(storage).colors.getVoxel(7, 6, 5)).toEqual([0, 0, 0]);
  });

  // --------------------------------------------------------------------------
  // Verifie l'aller-retour JSON et le refus des coordonnees dupliquees.
  // --------------------------------------------------------------------------
  it("exporte et importe couleur et luminosites", () => {
    // Dessin source utilise pour verifier l'aller-retour public.
    const drawing = createPainterDrawing();
    paintVoxel(drawing, 1, 2, 3, "#abcdef", 37, "draw");
    drawing.globalBrightnessPercent = 81;
    // Copie reconstruite exclusivement depuis l'archive exportee.
    const restored = importPainterDrawing(exportPainterDrawing(drawing));
    expect(restored.colors.getVoxel(1, 2, 3)).toEqual([0xab, 0xcd, 0xef]);
    expect(restored.brightness[3 * 64 + 2 * 8 + 1]).toBe(37);
    expect(restored.globalBrightnessPercent).toBe(81);
    // Archive volontairement invalide avec deux definitions du meme voxel.
    const duplicated = JSON.stringify({
      format: "l3d-painting",
      version: 1,
      cubeSize: 8,
      globalBrightness: 100,
      voxels: [
        { x: 1, y: 2, z: 3, color: "#ffffff", brightness: 100 },
        { x: 1, y: 2, z: 3, color: "#ff0000", brightness: 50 },
      ],
    });
    expect(() => importPainterDrawing(duplicated)).toThrow(/dupliquée/iu);
  });
}

describe("modele du peintre", runPaintingModelTests);
