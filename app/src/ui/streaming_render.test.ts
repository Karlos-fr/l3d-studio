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
// Cree une surface de 400 par 260 pixels suffisante pour le hit-test pur.
//
// Retour :
// - doublure Canvas dont les coordonnees client correspondent aux pixels CSS.
// ----------------------------------------------------------------------------
function createCanvasDouble(): HTMLCanvasElement {
  // --------------------------------------------------------------------------
  // Retourne les bornes fixes utilisees par le calcul des cellules.
  //
  // Retour :
  // - rectangle de 400 par 260 pixels a l'origine.
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
      width: 400,
      height: 260,
      top: 0,
      right: 400,
      bottom: 260,
      left: 0,
      toJSON,
    };
  }
  return {
    clientWidth: 400,
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
  // Verifie que la rotation 3D ne declenche jamais la peinture.
  // --------------------------------------------------------------------------
  it("ignore les points de la vue 3D", () => {
    const canvas = createCanvasDouble();
    selectStreamingPreviewMode("3d");
    expect(getStreamingLayerVoxelAtPoint(canvas, 35, 75)).toBeNull();
  });
}

describe("hit-test du peintre", runStreamingRenderTests);
