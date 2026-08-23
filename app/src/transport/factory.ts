// ============================================================================
// TransportFactory - Construction du transport configure
// ----------------------------------------------------------------------------
// Ce fichier assemble le client et l'adaptateur LAN. Il ne
// lance aucun appel et ne connait pas le DOM.
// ============================================================================

import { createLanClient } from "../lan/client";
import { createLanTransport } from "./lan_transport";
import type { SparkPixelsTransport } from "./types";

export interface TransportFactoryOptions {
  lanHost: string;
  lanPort: number;
  fetchFn?: typeof fetch;
}

// ----------------------------------------------------------------------------
// Construit le transport LAN configure.
//
// Parametres :
// - options : adresse, port et implementation fetch optionnelle.
//
// Retour :
// - adaptateur commun pret a lire ou commander le cube.
// ----------------------------------------------------------------------------
export function createConfiguredTransport(options: TransportFactoryOptions): SparkPixelsTransport {
  if (options.lanHost.trim().length === 0) {
    throw new Error("Configure l'adresse locale du Photon.");
  }

  const lanClient = createLanClient({
    host: options.lanHost,
    port: options.lanPort,
    fetchFn: options.fetchFn,
  });
  return createLanTransport(lanClient);
}
