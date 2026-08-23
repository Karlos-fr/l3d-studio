// ============================================================================
// UiRenderTest - Tests du rendu des ateliers streaming et peinture
// ----------------------------------------------------------------------------
// Ce fichier inspecte le HTML produit sans navigateur reel. Il ne branche pas
// les evenements ni les appels LAN.
// ============================================================================

import { describe, expect, it } from "vitest";
import { renderApp } from "./render";
import { createInitialState } from "./state";

// Racine minimale acceptee par renderApp pour capturer son HTML.
interface RenderRoot {
  innerHTML: string;
}

// ----------------------------------------------------------------------------
// Execute les tests des deux onglets du panneau Streaming.
// ----------------------------------------------------------------------------
function runStreamingPanelRenderTests(): void {
  // --------------------------------------------------------------------------
  // Verifie les controles d'animation proposes au premier chargement.
  // --------------------------------------------------------------------------
  it("affiche l'atelier Animations par defaut", () => {
    const state = createInitialState(null, null);
    const root: RenderRoot = { innerHTML: "" };
    renderApp(root as HTMLElement, state);
    expect(root.innerHTML).toContain("show-streaming-animations");
    expect(root.innerHTML).toContain("show-streaming-painting");
    expect(root.innerHTML).toContain('data-field="streaming-animation"');
    expect(root.innerHTML).not.toContain('data-field="painter-color"');
  });

  // --------------------------------------------------------------------------
  // Verifie que Peinture remplace les reglages de cadence par quatre outils.
  // --------------------------------------------------------------------------
  it("affiche uniquement les outils essentiels du peintre", () => {
    const state = createInitialState(null, null);
    state.streaming.workspace = "painting";
    const root: RenderRoot = { innerHTML: "" };
    renderApp(root as HTMLElement, state);
    expect(root.innerHTML).toContain('data-field="painter-color"');
    expect(root.innerHTML).toContain('data-action="painter-tool-draw"');
    expect(root.innerHTML).toContain('data-action="painter-tool-erase"');
    expect(root.innerHTML).toContain('data-action="clear-painter"');
    expect(root.innerHTML).toContain("Afficher sur le cube");
    expect(root.innerHTML).not.toContain('data-field="streaming-fps"');
  });
}

describe("rendu du panneau Streaming", runStreamingPanelRenderTests);
