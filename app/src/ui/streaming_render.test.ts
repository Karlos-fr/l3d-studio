// ============================================================================
// StreamingRenderTest - Tests du hit-test des couches du cube
// ----------------------------------------------------------------------------
// Ce fichier valide les coordonnees du peintre sans Canvas reel ni rendu DOM.
// Il ne teste pas la projection 3D deja couverte separement.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  getStreamingLayerVoxelAtPoint,
  selectStreamingPreviewMode,
} from "./streaming_render";

// ----------------------------------------------------------------------------
// Cree une surface dimensionnee pour le hit-test pur.
//
// Parametres :
// - width : largeur CSS et client de la doublure.
// - height : hauteur CSS et client de la doublure.
//
// Retour :
// - doublure Canvas dont les coordonnees client correspondent aux pixels CSS.
// ----------------------------------------------------------------------------
function createCanvasDouble(width = 400, height = 260): HTMLCanvasElement {
  // --------------------------------------------------------------------------
  // Retourne les bornes fixes utilisees par le calcul des cellules.
  //
  // Retour :
    // - rectangle aux dimensions demandees et place a l'origine.
  // --------------------------------------------------------------------------
  function getBoundingClientRect(): DOMRect {
    // ------------------------------------------------------------------------
    // Fournit la representation JSON minimale imposee par DOMRect.
    //
    // Retour :
    // - objet vide, inutilise par le hit-test.
    // ------------------------------------------------------------------------
    function toJSON(): object {
      return {};
    }
    return {
      x: 0,
      y: 0,
      width,
      height,
      top: 0,
      right: width,
      bottom: height,
      left: 0,
      toJSON,
    };
  }
  return {
    clientWidth: width,
    clientHeight: height,
    getBoundingClientRect,
  } as HTMLCanvasElement;
}

// ----------------------------------------------------------------------------
// Execute les tests de selection des cellules z, y, x.
// ----------------------------------------------------------------------------
function runStreamingRenderTests(): void {
  // --------------------------------------------------------------------------
  // Verifie deux couches opposees et l'orientation verticale historique.
  // --------------------------------------------------------------------------
  it("retrouve les voxels sous la vue par couches", () => {
    const canvas = createCanvasDouble();
    selectStreamingPreviewMode("layers");
    expect(getStreamingLayerVoxelAtPoint(canvas, 35, 75)).toEqual({ x: 2, y: 3, z: 0 });
    expect(getStreamingLayerVoxelAtPoint(canvas, 385, 165)).toEqual({ x: 7, y: 7, z: 7 });
    expect(getStreamingLayerVoxelAtPoint(canvas, 5, 5)).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Verifie que les grandes cellules plein ecran gardent le meme hit-test.
  // --------------------------------------------------------------------------
  it("peint dans les grandes grilles du plein ecran", () => {
    const canvas = createCanvasDouble(1600, 900);
    selectStreamingPreviewMode("layers");
    expect(getStreamingLayerVoxelAtPoint(canvas, 176.25, 148.75)).toEqual({
      x: 3,
      y: 5,
      z: 0,
    });
    expect(getStreamingLayerVoxelAtPoint(canvas, 1518.75, 836.25)).toEqual({
      x: 6,
      y: 0,
      z: 7,
    });
  });

  // --------------------------------------------------------------------------
  // Verifie que la rotation 3D ne declenche jamais la peinture.
  // --------------------------------------------------------------------------
  it("ignore les points de la vue 3D", () => {
    const canvas = createCanvasDouble();
    selectStreamingPreviewMode("3d");
    expect(getStreamingLayerVoxelAtPoint(canvas, 35, 75)).toBeNull();
  });
}

describe("hit-test du peintre", runStreamingRenderTests);
