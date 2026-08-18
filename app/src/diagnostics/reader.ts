// ============================================================================
// DiagnosticsReader - Lecture horodatee par le transport configure
// ----------------------------------------------------------------------------
// Ce fichier mesure la latence et enrichit les valeurs brutes du firmware. Il
// ne conserve aucun historique et ne gere aucun timer.
// ============================================================================

import type { ParticleClient } from "../particle/client";
import type { AppState } from "../ui/state";
import { createTransportForState } from "../ui/transport";
import type { DiagnosticsSample } from "./types";

// ----------------------------------------------------------------------------
// Lit un echantillon sans reinitialiser les statistiques du firmware.
//
// Parametres :
// - state : configuration de transport courante.
// - particleClient : client Particle partage.
//
// Retour :
// - valeurs brutes accompagnees de la source, de l'heure et de la latence.
// ----------------------------------------------------------------------------
export async function readDiagnosticsSample(
  state: AppState,
  particleClient: ParticleClient,
): Promise<DiagnosticsSample> {
  return readDiagnosticsOperation(state, particleClient, false);
}

// ----------------------------------------------------------------------------
// Reinitialise explicitement les minimums puis lit leur echantillon.
//
// Parametres :
// - state : configuration de transport courante.
// - particleClient : client Particle partage.
//
// Retour :
// - nouvel echantillon obtenu apres le reset demande.
// ----------------------------------------------------------------------------
export async function resetDiagnosticsSample(
  state: AppState,
  particleClient: ParticleClient,
): Promise<DiagnosticsSample> {
  return readDiagnosticsOperation(state, particleClient, true);
}

// ----------------------------------------------------------------------------
// Execute l'operation de diagnostic demandee et mesure son aller-retour.
//
// Parametres :
// - state : configuration de transport courante.
// - particleClient : client Particle partage.
// - resetRequested : vrai uniquement pour une action utilisateur confirmee.
//
// Retour :
// - echantillon enrichi commun aux deux transports.
// ----------------------------------------------------------------------------
async function readDiagnosticsOperation(
  state: AppState,
  particleClient: ParticleClient,
  resetRequested: boolean,
): Promise<DiagnosticsSample> {
  const startedAt = performance.now();
  const transport = createTransportForState(state, particleClient);
  const response = resetRequested
    ? await transport.resetDiagnostics()
    : await transport.readDiagnostics();
  return {
    capturedAtMilliseconds: Date.now(),
    source: response.source,
    latencyMilliseconds: Math.max(0, performance.now() - startedAt),
    dataOperations: response.dataOperations ?? 0,
    diagnostics: response.value,
  };
}
