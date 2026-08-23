// ============================================================================
// BytecodeRenderTest - Contrats du panneau procedural L3D Studio
// ----------------------------------------------------------------------------
// Ce fichier inspecte le HTML produit sans navigateur ni appel reseau.
// ============================================================================

import { describe, expect, it } from "vitest";
import { renderBytecodePanel } from "./bytecode_render";
import { createInitialState } from "./state";

// ----------------------------------------------------------------------------
// Verifie les controles indispensables des phases de creation et installation.
// ----------------------------------------------------------------------------
function runBytecodeRenderTests(): void {
  it("affiche editeur, exemples, simulateur, bibliotheque et actions LAN", () => {
    const state = createInitialState(null, null);
    state.lanHost = "192.0.2.25";
    const html = renderBytecodePanel(state);
    for (const text of ["Rain", "Sphère", "Fireworks", "Plasma"]) {
      expect(html).toContain(text);
    }
    for (const action of [
      "bytecode-compile",
      "bytecode-sim-start",
      "bytecode-sim-pause",
      "bytecode-sim-stop",
      "bytecode-sim-reset",
      "bytecode-export",
      "bytecode-install",
      "bytecode-run",
      "bytecode-stop",
      "bytecode-delete-program",
    ]) {
      expect(html).toContain(`data-action="${action}"`);
    }
    expect(html).toContain("data-bytecode-preview");
    expect(html).toContain("sans repli Particle Cloud");
  });
}

describe("rendu bytecode", runBytecodeRenderTests);
