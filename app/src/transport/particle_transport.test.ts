// ============================================================================
// ParticleTransportTest - Tests de l'adaptateur Particle commun
// ----------------------------------------------------------------------------
// Ce fichier verifie que l'adaptateur conserve les variables et fonctions
// historiques. Il ne contacte pas Particle Cloud.
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import type { ParticleClient } from "../particle/client";
import { createParticleTransport } from "./particle_transport";
import { SparkPixelsCommandRefusedError } from "./types";

// Identifiant factice du Photon cible.
const DEVICE_ID = "photon-test";

// ----------------------------------------------------------------------------
// Execute les tests de l'adaptateur Particle.
// ----------------------------------------------------------------------------
function runParticleTransportTests(): void {
  // --------------------------------------------------------------------------
  // Verifie la reconstruction de l'instantane historique.
  // --------------------------------------------------------------------------
  it("lit les variables Particle historiques sans changer leur ordre", async () => {
    const client = createParticleClientDouble([
      "Off",
      2,
      4,
      "Off;",
      "N;",
      "",
      "Firmware,1.4;",
      -52,
      "",
    ]);
    const transport = createParticleTransport(client, DEVICE_ID);

    const response = await transport.readCube();

    expect(response.source).toBe("particle");
    expect(response.value).toMatchObject({
      modeName: "Off",
      brightness: 2,
      speedIndex: 4,
      wifiRssi: -52,
      debugMessage: null,
    });
    expect(client.getVariable).toHaveBeenCalledTimes(9);
  });

  // --------------------------------------------------------------------------
  // Verifie le nom de fonction et la commande transmis sans transformation.
  // --------------------------------------------------------------------------
  it("adapte SetMode vers la fonction Particle historique", async () => {
    const client = createParticleClientDouble([]);
    vi.mocked(client.callFunction).mockResolvedValueOnce({ return_value: 14 });
    const transport = createParticleTransport(client, DEVICE_ID);

    await expect(transport.sendMode("M:ColorAll,B:1,")).resolves.toEqual({
      source: "particle",
      value: { result: 14 },
    });
    expect(client.callFunction).toHaveBeenCalledWith(
      DEVICE_ID,
      "SetMode",
      "M:ColorAll,B:1,",
    );
  });

  // --------------------------------------------------------------------------
  // Verifie qu'un code negatif devient une erreur de commande distincte.
  // --------------------------------------------------------------------------
  it("classe un refus firmware Particle", async () => {
    const client = createParticleClientDouble([]);
    vi.mocked(client.callFunction).mockResolvedValueOnce({ return_value: -103 });
    const transport = createParticleTransport(client, DEVICE_ID);

    await expect(transport.sendMode("M:Inconnu,")).rejects.toBeInstanceOf(
      SparkPixelsCommandRefusedError,
    );
  });
}

// ----------------------------------------------------------------------------
// Cree une doublure Particle avec une file de valeurs de variables.
//
// Parametres :
// - variableValues : valeurs retournees successivement par getVariable.
//
// Retour :
// - client complet dont les appels sont espionnables.
// ----------------------------------------------------------------------------
function createParticleClientDouble(variableValues: unknown[]): ParticleClient {
  return {
    login: vi.fn(),
    setToken: vi.fn(),
    listDevices: vi.fn(),
    getDevice: vi.fn(),
    getVariable: vi.fn(async () => variableValues.shift()),
    callFunction: vi.fn(),
  } as ParticleClient;
}

describe("transport Particle", runParticleTransportTests);
