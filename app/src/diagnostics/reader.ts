// ============================================================================
// DiagnosticsReader - Lecture horodatee par le transport configure
// ----------------------------------------------------------------------------
// Ce fichier mesure la latence et enrichit les valeurs brutes du firmware. Il
// ne conserve aucun historique et ne gere aucun timer.
// ============================================================================

import type { AppState } from "../ui/state";
import { createTransportForState } from "../ui/transport";
import type { DiagnosticsSample } from "./types";

// ----------------------------------------------------------------------------
// Lit un echantillon sans reinitialiser les statistiques du firmware.
//
// Parametres :
// - state : configuration de transport courante.
//
// Retour :
// - valeurs brutes accompagnees de la source, de l'heure et de la latence.
// ----------------------------------------------------------------------------
export async function readDiagnosticsSample(
  state: AppState,
): Promise<DiagnosticsSample> {
  return readDiagnosticsOperation(state, false);
}

// ----------------------------------------------------------------------------
// Reinitialise explicitement les minimums puis lit leur echantillon.
//
// Parametres :
// - state : configuration de transport courante.
//
// Retour :
// - nouvel echantillon obtenu apres le reset demande.
// ----------------------------------------------------------------------------
export async function resetDiagnosticsSample(
  state: AppState,
): Promise<DiagnosticsSample> {
  return readDiagnosticsOperation(state, true);
}

// ----------------------------------------------------------------------------
// Execute l'operation de diagnostic demandee et mesure son aller-retour.
//
// Parametres :
// - state : configuration de transport courante.
// - resetRequested : vrai uniquement pour une action utilisateur confirmee.
//
// Retour :
// - echantillon enrichi commun aux deux transports.
// ----------------------------------------------------------------------------
async function readDiagnosticsOperation(
  state: AppState,
  resetRequested: boolean,
): Promise<DiagnosticsSample> {
  const startedAt = performance.now();
  const transport = createTransportForState(state);
  const response = resetRequested
    ? await transport.resetDiagnostics()
    : await transport.readDiagnostics();
  return {
    capturedAtMilliseconds: Date.now(),
    source: response.source,
    latencyMilliseconds: Math.max(0, performance.now() - startedAt),
    diagnostics: response.value,
  };
}
