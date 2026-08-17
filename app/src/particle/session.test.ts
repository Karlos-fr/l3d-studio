// ============================================================================
// ParticleSessionTest - Implementation des tests de session Particle
// ----------------------------------------------------------------------------
// Ce fichier valide la persistance locale de la session Particle avec un stockage
// memoire. Il ne depend pas de localStorage ni de l'API Particle Cloud.
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  clearParticleSession,
  createSessionFromToken,
  isParticleSessionExpired,
  loadParticleSession,
  saveParticleSession,
  type ParticleSessionStorage,
} from "./session";

// Timestamp fixe utilise pour rendre les tests de session deterministes.
const FIXED_NOW = 1_700_000_000_000;

// ----------------------------------------------------------------------------
// Execute la suite de tests de la session Particle.
// ----------------------------------------------------------------------------
function runParticleSessionTests(): void {
  it("cree une session sans stocker le mot de passe", () => {
    const session = createSessionFromToken(
      {
        access_token: "token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "refresh",
      },
      FIXED_NOW,
      "device",
    );

    expect(session.accessToken).toBe("token");
    expect(session.tokenType).toBe("bearer");
    expect(session.expiresAt).toBe(FIXED_NOW + 3_600_000);
    expect(session.refreshToken).toBe("refresh");
    expect(session.deviceId).toBe("device");
    expect(JSON.stringify(session)).not.toContain("password");
  });

  it("sauvegarde et recharge la session locale", () => {
    const storage = createMemoryStorage();
    const session = createSessionFromToken(
      {
        access_token: "token",
        token_type: "bearer",
        expires_in: 3600,
      },
      FIXED_NOW,
    );

    saveParticleSession(storage, session);

    expect(loadParticleSession(storage)).toEqual(session);
  });

  it("supprime une session locale illisible", () => {
    const storage = createMemoryStorage();
    storage.setItem("l3d-studio.particle.session", "{");

    expect(loadParticleSession(storage)).toBeNull();
    expect(storage.getItem("l3d-studio.particle.session")).toBeNull();
  });

  it("detecte une session expiree", () => {
    const session = createSessionFromToken(
      {
        access_token: "token",
        token_type: "bearer",
        expires_in: 1,
      },
      FIXED_NOW,
    );

    expect(isParticleSessionExpired(session, FIXED_NOW)).toBe(false);
    expect(isParticleSessionExpired(session, FIXED_NOW + 1000)).toBe(true);
  });

  it("efface la session locale", () => {
    const storage = createMemoryStorage();
    const session = createSessionFromToken(
      {
        access_token: "token",
        token_type: "bearer",
        expires_in: 3600,
      },
      FIXED_NOW,
    );

    saveParticleSession(storage, session);
    clearParticleSession(storage);

    expect(loadParticleSession(storage)).toBeNull();
  });
}

// ----------------------------------------------------------------------------
// Cree un stockage memoire compatible avec localStorage.
//
// Retour :
// - stockage minimal utilise par les tests de session.
// ----------------------------------------------------------------------------
function createMemoryStorage(): ParticleSessionStorage {
  const values = new Map<string, string>();

  return {
    getItem(key: string): string | null {
      return values.get(key) ?? null;
    },

    setItem(key: string, value: string): void {
      values.set(key, value);
    },

    removeItem(key: string): void {
      values.delete(key);
    },
  };
}

describe("ParticleSession", runParticleSessionTests);
