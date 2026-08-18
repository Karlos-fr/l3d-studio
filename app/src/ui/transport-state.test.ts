// ============================================================================
// TransportStateTest - Tests de configuration locale de l'interface
// ----------------------------------------------------------------------------
// Ce fichier verifie la persistance du transport et l'usage LAN sans session
// Particle. Il ne construit pas de DOM et ne lance aucun appel reseau.
// ============================================================================

import { describe, expect, it } from "vitest";
import type { ParticleSessionStorage } from "../particle/session";
import { createInitialState, hasAvailableConfiguredTransport } from "./state";
import { loadAppPreferences, saveAppPreferences } from "./preferences";

// ----------------------------------------------------------------------------
// Execute les tests de configuration du transport.
// ----------------------------------------------------------------------------
function runTransportStateTests(): void {
  // --------------------------------------------------------------------------
  // Verifie que le LAN explicite ne depend pas d'une session Particle.
  // --------------------------------------------------------------------------
  it("autorise le LAN sans connexion Particle", () => {
    const state = createInitialState(null, {
      transportPreference: "lan",
      lanHost: "photon.local",
      lanPort: 8080,
      selectedModeName: null,
      brightnessPercent: 1,
      speedIndex: 4,
      colorValues: [],
      switchValues: [],
      textValue: "",
    });

    expect(state.session).toBeNull();
    expect(hasAvailableConfiguredTransport(state)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Verifie la sauvegarde et la restauration des trois champs de transport.
  // --------------------------------------------------------------------------
  it("persiste le choix, l'adresse et le port LAN", () => {
    const storage = createMemoryStorage();
    const state = createInitialState(null, null);
    state.transportPreference = "automatic";
    state.lanHost = "photon.local";
    state.lanPort = 9090;

    saveAppPreferences(storage, state);
    const preferences = loadAppPreferences(storage);

    expect(preferences).toMatchObject({
      transportPreference: "automatic",
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
function createMemoryStorage(): ParticleSessionStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("etat du transport", runTransportStateTests);
