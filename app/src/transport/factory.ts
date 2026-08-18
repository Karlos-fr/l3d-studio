// ============================================================================
// TransportFactory - Construction du transport configure
// ----------------------------------------------------------------------------
// Ce fichier assemble les clients LAN et Particle selon la preference. Il ne
// lance aucun appel et ne connait pas le DOM.
// ============================================================================

import { createLanClient } from "../lan/client";
import type { ParticleClient } from "../particle/client";
import { createAutomaticTransport } from "./automatic_transport";
import { createLanTransport } from "./lan_transport";
import { createParticleTransport } from "./particle_transport";
import type { SparkPixelsTransport, TransportPreference } from "./types";

export interface TransportFactoryOptions {
  preference: TransportPreference;
  lanHost: string;
  lanPort: number;
  particleClient: ParticleClient;
  particleDeviceId: string | null;
  particleAvailable: boolean;
  fetchFn?: typeof fetch;
}

// ----------------------------------------------------------------------------
// Construit le transport demande avec ses replis disponibles.
//
// Parametres :
// - options : preference et configurations LAN et Particle courantes.
//
// Retour :
// - adaptateur commun pret a lire ou commander le cube.
// ----------------------------------------------------------------------------
export function createConfiguredTransport(options: TransportFactoryOptions): SparkPixelsTransport {
  const particleTransport =
    options.particleAvailable && options.particleDeviceId !== null
      ? createParticleTransport(options.particleClient, options.particleDeviceId)
      : null;

  if (options.preference === "particle") {
    if (particleTransport === null) {
      throw new Error("Selectionne un device Particle online.");
    }
    return particleTransport;
  }

  if (options.lanHost.trim().length === 0) {
    if (options.preference === "automatic" && particleTransport !== null) {
      return particleTransport;
    }
    throw new Error("Configure l'adresse locale du Photon.");
  }

  const lanClient = createLanClient({
    host: options.lanHost,
    port: options.lanPort,
    fetchFn: options.fetchFn,
  });
  const lanTransport = createLanTransport(lanClient);
  if (options.preference === "lan") return lanTransport;
  return createAutomaticTransport(lanClient, lanTransport, particleTransport);
}
