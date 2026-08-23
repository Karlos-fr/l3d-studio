// ============================================================================
// UiTransport - Construction du transport depuis l'etat applicatif
// ----------------------------------------------------------------------------
// Ce fichier relie la configuration UI aux adaptateurs reseau. Il ne rend pas
// de HTML et ne modifie pas l'etat du cube.
// ============================================================================

import { createConfiguredTransport } from "../transport/factory";
import type { SparkPixelsTransport } from "../transport/types";
import type { AppState } from "./state";

// ----------------------------------------------------------------------------
// Construit le transport correspondant a l'etat courant.
//
// Parametres :
// - state : adresse et port LAN courants.
//
// Retour :
// - transport LAN pret a l'emploi.
// ----------------------------------------------------------------------------
export function createTransportForState(
  state: AppState,
): SparkPixelsTransport {
  return createConfiguredTransport({
    lanHost: state.lanHost,
    lanPort: state.lanPort,
  });
}
