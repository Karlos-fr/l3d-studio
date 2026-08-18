// ============================================================================
// AutomaticTransport - Implementation du repli LAN vers Particle
// ----------------------------------------------------------------------------
// Ce fichier choisit un transport sans rejouer un POST dont l'issue est
// incertaine. Il ne connait ni la configuration utilisateur ni le DOM.
// ============================================================================

import type { LanClient } from "../lan/types";
import type { SparkPixelsTransport } from "./types";

// ----------------------------------------------------------------------------
// Cree le transport automatique priorisant le LAN.
//
// Parametres :
// - lanClient : client utilise pour tester la sante avant chaque commande.
// - lanTransport : adaptateur LAN complet.
// - particleTransport : repli Particle disponible, ou `null`.
//
// Retour :
// - transport qui replie les lectures et les preflights, jamais un POST lance.
// ----------------------------------------------------------------------------
export function createAutomaticTransport(
  lanClient: LanClient,
  lanTransport: SparkPixelsTransport,
  particleTransport: SparkPixelsTransport | null,
): SparkPixelsTransport {
  return {
    readCube: () => fallbackRead(() => lanTransport.readCube(), () => requireParticle(particleTransport).readCube()),
    readAuxSwitches: () =>
      fallbackRead(
        () => lanTransport.readAuxSwitches(),
        () => requireParticle(particleTransport).readAuxSwitches(),
      ),
    readDiagnostics: () =>
      fallbackRead(
        () => lanTransport.readDiagnostics(),
        () => requireParticle(particleTransport).readDiagnostics(),
      ),
    resetDiagnostics: () =>
      dispatchCommand(
        lanClient,
        lanTransport,
        particleTransport,
        (transport) => transport.resetDiagnostics(),
      ),
    sendCommand: (command) =>
      dispatchCommand(lanClient, lanTransport, particleTransport, (transport) => transport.sendCommand(command)),
    sendMode: (command) =>
      dispatchCommand(lanClient, lanTransport, particleTransport, (transport) => transport.sendMode(command)),
    sendText: (text) =>
      dispatchCommand(lanClient, lanTransport, particleTransport, (transport) => transport.sendText(text)),
    sendCubePainter: (command) =>
      dispatchCommand(
        lanClient,
        lanTransport,
        particleTransport,
        (transport) => transport.sendCubePainter(command),
      ),
  };
}

// ----------------------------------------------------------------------------
// Tente une lecture LAN puis replie sur Particle en cas d'echec.
//
// Parametres :
// - lanOperation : lecture locale sans effet de bord.
// - particleOperation : lecture Cloud de secours.
//
// Retour :
// - premier resultat disponible.
// ----------------------------------------------------------------------------
async function fallbackRead<TValue>(
  lanOperation: () => Promise<TValue>,
  particleOperation: () => Promise<TValue>,
): Promise<TValue> {
  try {
    return await lanOperation();
  } catch {
    return particleOperation();
  }
}

// ----------------------------------------------------------------------------
// Choisit une seule destination avant d'envoyer une commande.
//
// Parametres :
// - lanClient : client servant au preflight sans effet de bord.
// - lanTransport : destination locale prioritaire.
// - particleTransport : destination Cloud facultative.
// - operation : commande a executer une seule fois sur la destination choisie.
//
// Retour :
// - resultat du seul POST effectivement lance.
// ----------------------------------------------------------------------------
async function dispatchCommand<TValue>(
  lanClient: LanClient,
  lanTransport: SparkPixelsTransport,
  particleTransport: SparkPixelsTransport | null,
  operation: (transport: SparkPixelsTransport) => Promise<TValue>,
): Promise<TValue> {
  try {
    await lanClient.health();
  } catch {
    return operation(requireParticle(particleTransport));
  }
  return operation(lanTransport);
}

// ----------------------------------------------------------------------------
// Exige que le repli Particle soit configure.
//
// Parametres :
// - transport : adaptateur Particle facultatif.
//
// Retour :
// - adaptateur present.
// ----------------------------------------------------------------------------
function requireParticle(transport: SparkPixelsTransport | null): SparkPixelsTransport {
  if (transport === null) {
    throw new Error("Le LAN est indisponible et aucun device Particle online n'est configure.");
  }
  return transport;
}
