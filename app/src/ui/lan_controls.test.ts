// ============================================================================
// LanControlsTest - Tests des controles de connexion locale
// ----------------------------------------------------------------------------
// Ce fichier verifie l'activation immediate du bouton LAN sans navigateur ni
// appel au Photon.
// ============================================================================

import { describe, expect, it } from "vitest";
import { createInitialState } from "./state";
import {
  isLanConnectionConfigurationValid,
  syncLanConnectionButton,
} from "./lan_controls";

// ----------------------------------------------------------------------------
// Execute les tests des controles LAN.
// ----------------------------------------------------------------------------
function runLanControlsTests(): void {
  // --------------------------------------------------------------------------
  // Verifie que l'adresse du cube active le bouton avant toute perte de focus.
  // --------------------------------------------------------------------------
  it("active la connexion des la saisie d'une adresse LAN", () => {
    const state = createInitialState(null);
    const button = createButtonDouble();
    const rootElement = createRootDouble(button);

    state.lanHost = "192.168.1.25";
    syncLanConnectionButton(rootElement, state);

    expect(isLanConnectionConfigurationValid(state)).toBe(true);
    expect(button.disabled).toBe(false);
    expect(button.dataset.action).toBe("connect-lan");
    expect(button.textContent).toBe("Connexion");
  });

  // --------------------------------------------------------------------------
  // Verifie que le meme bouton propose une deconnexion apres une lecture LAN.
  // --------------------------------------------------------------------------
  it("bascule le bouton connecte vers la deconnexion", () => {
    const state = createInitialState(null);
    const button = createButtonDouble();
    const rootElement = createRootDouble(button);
    state.lastTransportUsed = "lan";

    syncLanConnectionButton(rootElement, state);

    expect(button.disabled).toBe(false);
    expect(button.dataset.action).toBe("disconnect-lan");
    expect(button.textContent).toBe("Déconnexion");
  });

  // --------------------------------------------------------------------------
  // Verifie que les configurations incompletes restent protegees.
  // --------------------------------------------------------------------------
  it("refuse un hote vide ou un port hors plage", () => {
    const state = createInitialState(null);
    expect(isLanConnectionConfigurationValid(state)).toBe(false);
    state.lanHost = "192.168.1.25";
    state.lanPort = 65_536;
    expect(isLanConnectionConfigurationValid(state)).toBe(false);
  });
}

// ----------------------------------------------------------------------------
// Cree une racine DOM minimale qui retourne le bouton fourni.
//
// Parametres :
// - button : doublure mutable du bouton de connexion.
//
// Retour :
// - element type uniquement pour la methode querySelector utilisee.
// ----------------------------------------------------------------------------
function createRootDouble(button: HTMLButtonElement): HTMLElement {
  return {
    querySelector: () => button,
  } as unknown as HTMLElement;
}

// ----------------------------------------------------------------------------
// Cree une doublure mutable du bouton Connexion sans DOM reel.
//
// Retour :
// - bouton minimal compatible avec la synchronisation testee.
// ----------------------------------------------------------------------------
function createButtonDouble(): HTMLButtonElement {
  return {
    dataset: {},
    disabled: true,
    textContent: "",
  } as unknown as HTMLButtonElement;
}

describe("controles LAN", runLanControlsTests);
