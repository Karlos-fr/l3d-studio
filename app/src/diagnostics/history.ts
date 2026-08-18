// ============================================================================
// DiagnosticsHistory - Gestion de l'historique borne des KPI
// ----------------------------------------------------------------------------
// Ce fichier ajoute des echantillons et detecte les alertes simples. Il ne
// connait ni les timers, ni le reseau, ni le rendu SVG de la phase suivante.
// ============================================================================

import type { DiagnosticsMonitorState, DiagnosticsSample } from "./types";

// Nombre maximal d'echantillons conserves avant le buffer circulaire de phase 8.
export const DIAGNOSTICS_HISTORY_CAPACITY = 360;

// ----------------------------------------------------------------------------
// Ajoute un echantillon et conserve une taille maximale fixe.
//
// Parametres :
// - state : etat du moniteur a mettre a jour.
// - sample : nouvel echantillon valide.
//
// Effet de bord :
// - remplace le plus ancien point si la capacite est atteinte et leve une alerte.
// ----------------------------------------------------------------------------
export function appendDiagnosticsSample(
  state: DiagnosticsMonitorState,
  sample: DiagnosticsSample,
): void {
  const previousSample = state.latestSample;
  if (state.history.length >= DIAGNOSTICS_HISTORY_CAPACITY) state.history.shift();
  state.history.push(sample);
  state.latestSample = sample;
  state.lastError = null;
  state.consecutiveErrors = 0;
  state.estimatedParticleDataOperations += sample.dataOperations;
  state.warningMessage = findDiagnosticsWarning(previousSample, sample);
}

// ----------------------------------------------------------------------------
// Efface uniquement les points historiques et alertes derivees.
//
// Parametres :
// - state : etat du moniteur a nettoyer.
//
// Effet de bord :
// - conserve le dernier echantillon affiche mais vide son historique.
// ----------------------------------------------------------------------------
export function clearDiagnosticsHistory(state: DiagnosticsMonitorState): void {
  state.history = [];
  state.warningMessage = null;
}

// ----------------------------------------------------------------------------
// Detecte une degradation de minimum memoire ou un nouvel evenement OOM.
//
// Parametres :
// - previousSample : echantillon precedent, s'il existe.
// - currentSample : nouvel echantillon.
//
// Retour :
// - alerte lisible ou `null` si aucun compteur ne se degrade.
// ----------------------------------------------------------------------------
function findDiagnosticsWarning(
  previousSample: DiagnosticsSample | null,
  currentSample: DiagnosticsSample,
): string | null {
  if (previousSample === null) return null;
  if (
    currentSample.diagnostics.outOfMemoryCount >
    previousSample.diagnostics.outOfMemoryCount
  ) {
    return "Le compteur d'evenements memoire insuffisante a augmente.";
  }
  if (
    currentSample.diagnostics.minimumFreeMemory <
    previousSample.diagnostics.minimumFreeMemory
  ) {
    return "Un nouveau minimum de memoire libre a ete observe.";
  }
  return null;
}
