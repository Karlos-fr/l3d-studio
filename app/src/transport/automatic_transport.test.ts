// ============================================================================
// AutomaticTransportTest - Tests du choix LAN et Particle
// ----------------------------------------------------------------------------
// Ce fichier verifie le repli des lectures et l'absence de duplication des
// commandes incertaines. Il ne lance aucun appel reseau reel.
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import type { LanClient } from "../lan/types";
import { createAutomaticTransport } from "./automatic_transport";
import type { SparkPixelsTransport, TransportKind } from "./types";

// Resultat de lecture minimal partage par les doublures.
const EMPTY_SNAPSHOT = {
  modeName: "Off",
  brightness: 2,
  speedIndex: 4,
  colors: [],
  switches: [],
  modes: [],
  auxSwitches: [],
  deviceInfoEntries: [],
  wifiRssi: null,
  debugMessage: null,
};

// ----------------------------------------------------------------------------
// Execute les tests du transport automatique.
// ----------------------------------------------------------------------------
function runAutomaticTransportTests(): void {
  // --------------------------------------------------------------------------
  // Verifie que le LAN est prioritaire pour une lecture disponible.
  // --------------------------------------------------------------------------
  it("lit le LAN sans appeler Particle lorsqu'il repond", async () => {
    const lanTransport = createTransport("lan");
    const particleTransport = createTransport("particle");
    const automatic = createAutomaticTransport(
      createLanClientDouble(),
      lanTransport,
      particleTransport,
    );

    await expect(automatic.readCube()).resolves.toMatchObject({ source: "lan" });
    expect(particleTransport.readCube).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Verifie qu'une lecture sans effet de bord peut se replier sur Particle.
  // --------------------------------------------------------------------------
  it("replie une lecture LAN en echec sur Particle", async () => {
    const lanTransport = createTransport("lan");
    vi.mocked(lanTransport.readCube).mockRejectedValueOnce(new Error("LAN absent"));
    const particleTransport = createTransport("particle");
    const automatic = createAutomaticTransport(
      createLanClientDouble(),
      lanTransport,
      particleTransport,
    );

    await expect(automatic.readCube()).resolves.toMatchObject({ source: "particle" });
    expect(particleTransport.readCube).toHaveBeenCalledOnce();
  });

  // --------------------------------------------------------------------------
  // Verifie que l'echec du preflight choisit Particle avant tout POST LAN.
  // --------------------------------------------------------------------------
  it("choisit Particle si le preflight LAN echoue", async () => {
    const lanClient = createLanClientDouble();
    vi.mocked(lanClient.health).mockRejectedValueOnce(new Error("LAN absent"));
    const lanTransport = createTransport("lan");
    const particleTransport = createTransport("particle");
    const automatic = createAutomaticTransport(lanClient, lanTransport, particleTransport);

    await expect(automatic.sendMode("M:Off,B:1,")).resolves.toMatchObject({ source: "particle" });
    expect(lanTransport.sendMode).not.toHaveBeenCalled();
    expect(particleTransport.sendMode).toHaveBeenCalledOnce();
  });

  // --------------------------------------------------------------------------
  // Verifie qu'un POST LAN lance puis echoue n'est jamais rejoue sur Particle.
  // --------------------------------------------------------------------------
  it("ne duplique jamais une commande LAN d'issue incertaine", async () => {
    const lanTransport = createTransport("lan");
    vi.mocked(lanTransport.sendMode).mockRejectedValueOnce(new Error("timeout apres POST"));
    const particleTransport = createTransport("particle");
    const automatic = createAutomaticTransport(
      createLanClientDouble(),
      lanTransport,
      particleTransport,
    );

    await expect(automatic.sendMode("M:ColorAll,B:1,")).rejects.toThrow("timeout apres POST");
    expect(lanTransport.sendMode).toHaveBeenCalledOnce();
    expect(particleTransport.sendMode).not.toHaveBeenCalled();
  });
}

// ----------------------------------------------------------------------------
// Cree une doublure complete d'un transport Spark Pixels.
//
// Parametres :
// - source : source inscrite dans chaque resultat.
//
// Retour :
// - transport dont toutes les operations sont espionnables.
// ----------------------------------------------------------------------------
function createTransport(source: TransportKind): SparkPixelsTransport {
  return {
    readCube: vi.fn(async () => ({ source, value: EMPTY_SNAPSHOT })),
    readAuxSwitches: vi.fn(async () => ({ source, value: [] })),
    readDiagnostics: vi.fn(),
    resetDiagnostics: vi.fn(),
    sendCommand: vi.fn(async () => ({ source, value: { result: 1 } })),
    sendMode: vi.fn(async () => ({ source, value: { result: 1 } })),
    sendText: vi.fn(async () => ({ source, value: { result: 1 } })),
    sendCubePainter: vi.fn(async () => ({ source, value: { result: 1 } })),
  };
}

// ----------------------------------------------------------------------------
// Cree une doublure du client LAN dont la sante est disponible.
//
// Retour :
// - client complet avec fonctions espionnables.
// ----------------------------------------------------------------------------
function createLanClientDouble(): LanClient {
  return {
    health: vi.fn(async () => ({
      protocolVersion: 1 as const,
      firmwareRevision: "1.4",
      deviceOsVersion: "2.3.1",
      uptimeSeconds: 1,
      wifiReady: true,
      particleConnected: true,
    })),
    diagnostics: vi.fn(),
    resetDiagnostics: vi.fn(),
    state: vi.fn(),
    modes: vi.fn(),
    auxSwitches: vi.fn(),
    command: vi.fn(),
    mode: vi.fn(),
    text: vi.fn(),
    cubePainter: vi.fn(),
    streamFrame: vi.fn(),
  };
}

describe("transport automatique", runAutomaticTransportTests);
