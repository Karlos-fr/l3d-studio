// ============================================================================
// TransportStateTest - Tests de configuration locale de l'interface
// ----------------------------------------------------------------------------
// Ce fichier verifie la persistance de l'adresse LAN. Il ne construit pas de
// DOM et ne lance aucun appel reseau.
// ============================================================================

import { describe, expect, it } from "vitest";
import { createInitialState, hasAvailableConfiguredTransport } from "./state";
import { loadAppPreferences, saveAppPreferences, type AppPreferencesStorage } from "./preferences";

// ----------------------------------------------------------------------------
// Execute les tests de configuration du transport.
// ----------------------------------------------------------------------------
function runTransportStateTests(): void {
  // --------------------------------------------------------------------------
  // Verifie qu'une adresse LAN suffit a rendre les commandes disponibles.
  // --------------------------------------------------------------------------
  it("autorise le LAN configure", () => {
    const state = createInitialState({
      lanHost: "photon.local",
      lanPort: 8080,
      selectedModeName: null,
      brightnessPercent: 1,
      speedIndex: 4,
      colorValues: [],
      switchValues: [],
      textValue: "",
    });

    expect(hasAvailableConfiguredTransport(state)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Verifie la sauvegarde et la restauration de l'adresse et du port LAN.
  // --------------------------------------------------------------------------
  it("persiste l'adresse et le port LAN", () => {
    const storage = createMemoryStorage();
    const state = createInitialState(null);
    state.lanHost = "photon.local";
    state.lanPort = 9090;

    saveAppPreferences(storage, state);
    const preferences = loadAppPreferences(storage);

    expect(preferences).toMatchObject({
      lanHost: "photon.local",
      lanPort: 9090,
    });
  });
}

// ----------------------------------------------------------------------------
// Cree un stockage local minimal en memoire.
//
// Retour :
// - implementation compatible avec la persistance applicative.
// ----------------------------------------------------------------------------
function createMemoryStorage(): AppPreferencesStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("etat du transport", runTransportStateTests);
