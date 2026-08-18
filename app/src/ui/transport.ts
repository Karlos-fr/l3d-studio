// ============================================================================
// UiTransport - Construction du transport depuis l'etat applicatif
// ----------------------------------------------------------------------------
// Ce fichier relie la configuration UI aux adaptateurs reseau. Il ne rend pas
// de HTML et ne modifie pas l'etat du cube.
// ============================================================================

import type { ParticleClient } from "../particle/client";
import { createConfiguredTransport } from "../transport/factory";
import type { SparkPixelsTransport } from "../transport/types";
import { isSelectedDeviceOnline, type AppState } from "./state";

// ----------------------------------------------------------------------------
// Construit le transport correspondant a l'etat courant.
//
// Parametres :
// - state : preference, adresse LAN et device Particle courants.
// - particleClient : client Particle partage par l'application.
//
// Retour :
// - transport LAN, Particle ou automatique pret a l'emploi.
// ----------------------------------------------------------------------------
export function createTransportForState(
  state: AppState,
  particleClient: ParticleClient,
): SparkPixelsTransport {
  return createConfiguredTransport({
    preference: state.transportPreference,
    lanHost: state.lanHost,
    lanPort: state.lanPort,
    particleClient,
    particleDeviceId: state.selectedDeviceId,
    particleAvailable: isSelectedDeviceOnline(state),
  });
}
