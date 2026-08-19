// ============================================================================
// LanControlsTest - Tests des controles de connexion locale
// ----------------------------------------------------------------------------
// Ce fichier verifie l'activation immediate du bouton LAN sans navigateur ni
// appel au Photon.
// ============================================================================

import { describe, expect, it } from "vitest";
import { createInitialState } from "./state";
import { isLanTestConfigurationValid, syncLanTestButton } from "./lan_controls";

// ----------------------------------------------------------------------------
// Execute les tests des controles LAN.
// ----------------------------------------------------------------------------
function runLanControlsTests(): void {
  // --------------------------------------------------------------------------
  // Verifie que l'adresse du cube active le bouton avant toute perte de focus.
  // --------------------------------------------------------------------------
  it("active le test des la saisie d'une adresse LAN", () => {
    const state = createInitialState(null, null);
    const button = { disabled: true };
    const rootElement = createRootDouble(button);

    state.lanHost = "192.168.1.25";
    syncLanTestButton(rootElement, state);

    expect(isLanTestConfigurationValid(state)).toBe(true);
    expect(button.disabled).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Verifie que les configurations incompletes restent protegees.
  // --------------------------------------------------------------------------
  it("refuse un hote vide ou un port hors plage", () => {
    const state = createInitialState(null, null);
    expect(isLanTestConfigurationValid(state)).toBe(false);
    state.lanHost = "192.168.1.25";
    state.lanPort = 65_536;
    expect(isLanTestConfigurationValid(state)).toBe(false);
  });
}

// ----------------------------------------------------------------------------
// Cree une racine DOM minimale qui retourne le bouton fourni.
//
// Parametres :
// - button : doublure mutable du bouton de test.
//
// Retour :
// - element type uniquement pour la methode querySelector utilisee.
// ----------------------------------------------------------------------------
function createRootDouble(button: { disabled: boolean }): HTMLElement {
  return {
    querySelector: () => button,
  } as unknown as HTMLElement;
}

describe("controles LAN", runLanControlsTests);
