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

// Diagnostic compact correspondant a la sequence 7.
const DIAGNOSTICS_RESPONSE =
  "v=1,y=7,m=0,u=4,r=0,d=0,s=34000,f=33000,n=32000,b=33000,a=33000,q=32000,c=1,l=1000,g=1000,w=1000,p=100,x=1,i=1,k=1,o=-1,z=0";

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

  // --------------------------------------------------------------------------
  // Verifie la sequence GETDIAG puis deviceInfo et son cout Particle.
  // --------------------------------------------------------------------------
  it("attend la sequence Particle demandee", async () => {
    const client = createParticleClientDouble([DIAGNOSTICS_RESPONSE]);
    vi.mocked(client.callFunction).mockResolvedValueOnce({ return_value: 7 });
    const transport = createParticleTransport(client, DEVICE_ID);

    await expect(transport.readDiagnostics()).resolves.toMatchObject({
      source: "particle",
      dataOperations: 2,
      value: { sequence: 7, minimumFreeMemory: 32_000 },
    });
    expect(client.callFunction).toHaveBeenCalledWith(
      DEVICE_ID,
      "Function",
      "GETDIAG",
      expect.any(AbortSignal),
    );
    expect(client.getVariable).toHaveBeenCalledWith(
      DEVICE_ID,
      "deviceInfo",
      expect.any(AbortSignal),
    );
  });

  // --------------------------------------------------------------------------
  // Verifie que seul l'appel explicite utilise RESETDIAG.
  // --------------------------------------------------------------------------
  it("reserve RESETDIAG a la methode de remise a zero", async () => {
    const client = createParticleClientDouble([DIAGNOSTICS_RESPONSE]);
    vi.mocked(client.callFunction).mockResolvedValueOnce({ return_value: 7 });
    const transport = createParticleTransport(client, DEVICE_ID);

    await transport.resetDiagnostics();

    expect(client.callFunction).toHaveBeenCalledWith(
      DEVICE_ID,
      "Function",
      "RESETDIAG",
      expect.any(AbortSignal),
    );
  });

  // --------------------------------------------------------------------------
  // Verifie qu'une requete Cloud bloquee est reellement annulee.
  // --------------------------------------------------------------------------
  it("borne la sequence de diagnostics Particle", async () => {
    vi.useFakeTimers();
    try {
      const client = createParticleClientDouble([]);
      vi.mocked(client.callFunction).mockImplementation(
        (_deviceId, _functionName, _command, signal) =>
          new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
          }),
      );
      const transport = createParticleTransport(client, DEVICE_ID);

      const pendingRead = transport.readDiagnostics();
      const rejection = expect(pendingRead).rejects.toMatchObject({ name: "AbortError" });
      await vi.advanceTimersByTimeAsync(15_000);

      await rejection;
    } finally {
      vi.useRealTimers();
    }
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
