// ============================================================================
// DiagnosticsHistory - Gestion de l'historique borne des KPI
// ----------------------------------------------------------------------------
// Ce fichier ajoute des echantillons, detecte les ruptures et les alertes. Il
// ne connait ni les timers, ni le reseau, ni le rendu SVG.
// ============================================================================

import {
  circularBufferValues,
  clearCircularBuffer,
  createCircularBuffer,
  pushCircularBuffer,
} from "./circular_buffer";
import type { CircularBuffer } from "./circular_buffer";
import type {
  DiagnosticsBreakReason,
  DiagnosticsHistoryPoint,
  DiagnosticsMonitorState,
  DiagnosticsSample,
} from "./types";

// Nombre maximal d'echantillons conserve par defaut dans le navigateur.
export const DIAGNOSTICS_HISTORY_CAPACITY = 360;

// Multiplicateur qui distingue une interruption d'un retard reseau ordinaire.
const INTERRUPTION_INTERVAL_MULTIPLIER = 2.5;

// Delai minimal qui peut etre qualifie d'interruption, en millisecondes.
const MINIMUM_INTERRUPTION_MILLISECONDS = 15_000;

// ----------------------------------------------------------------------------
// Cree l'historique circulaire des diagnostics avec une capacite configurable.
//
// Parametres :
// - capacity : nombre maximal de points conserves.
//
// Retour :
// - buffer circulaire vide de points enrichis.
// ----------------------------------------------------------------------------
export function createDiagnosticsHistory(
  capacity = DIAGNOSTICS_HISTORY_CAPACITY,
): CircularBuffer<DiagnosticsHistoryPoint> {
  return createCircularBuffer<DiagnosticsHistoryPoint>(capacity);
}

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
  const point: DiagnosticsHistoryPoint = {
    sample,
    breakReason: findBreakReason(state, previousSample, sample),
    modeChanged: hasModeChanged(previousSample, sample),
    outOfMemoryOccurred: hasOutOfMemoryOccurred(previousSample, sample),
  };
  pushCircularBuffer(state.history, point);
  state.latestSample = sample;
  state.lastError = null;
  state.consecutiveErrors = 0;
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
  clearCircularBuffer(state.history);
  state.warningMessage = null;
}

// ----------------------------------------------------------------------------
// Restitue les points historiques dans leur ordre chronologique.
//
// Parametres :
// - state : etat du moniteur contenant le buffer circulaire.
//
// Retour :
// - copie dense allant du point le plus ancien au plus recent.
// ----------------------------------------------------------------------------
export function diagnosticsHistoryValues(
  state: DiagnosticsMonitorState,
): DiagnosticsHistoryPoint[] {
  return circularBufferValues(state.history);
}

// ----------------------------------------------------------------------------
// Determine si le nouveau point doit commencer une nouvelle portion de courbe.
//
// Parametres :
// - state : etat portant l'intervalle et les echecs precedents.
// - previousSample : dernier echantillon valide eventuel.
// - currentSample : nouvel echantillon valide.
//
// Retour :
// - raison de rupture ou `null` si la serie reste continue.
// ----------------------------------------------------------------------------
function findBreakReason(
  state: DiagnosticsMonitorState,
  previousSample: DiagnosticsSample | null,
  currentSample: DiagnosticsSample,
): DiagnosticsBreakReason {
  if (previousSample === null) return null;
  if (currentSample.diagnostics.uptimeSeconds < previousSample.diagnostics.uptimeSeconds) {
    return "restart";
  }
  const elapsedMilliseconds =
    currentSample.capturedAtMilliseconds - previousSample.capturedAtMilliseconds;
  const interruptionThreshold = Math.max(
    state.intervalSeconds * 1_000 * INTERRUPTION_INTERVAL_MULTIPLIER,
    MINIMUM_INTERRUPTION_MILLISECONDS,
  );
  if (state.consecutiveErrors > 0 || elapsedMilliseconds > interruptionThreshold) {
    return "interruption";
  }
  return null;
}

// ----------------------------------------------------------------------------
// Detecte un changement de mode entre deux echantillons valides.
//
// Parametres :
// - previousSample : dernier echantillon valide eventuel.
// - currentSample : nouvel echantillon valide.
//
// Retour :
// - vrai si l'identifiant ou le compteur de changements a progresse.
// ----------------------------------------------------------------------------
function hasModeChanged(
  previousSample: DiagnosticsSample | null,
  currentSample: DiagnosticsSample,
): boolean {
  if (previousSample === null) return false;
  return (
    currentSample.diagnostics.modeId !== previousSample.diagnostics.modeId ||
    currentSample.diagnostics.modeChangeCount > previousSample.diagnostics.modeChangeCount
  );
}

// ----------------------------------------------------------------------------
// Detecte une hausse du compteur OOM entre deux echantillons valides.
//
// Parametres :
// - previousSample : dernier echantillon valide eventuel.
// - currentSample : nouvel echantillon valide.
//
// Retour :
// - vrai si un evenement memoire insuffisante est apparu.
// ----------------------------------------------------------------------------
function hasOutOfMemoryOccurred(
  previousSample: DiagnosticsSample | null,
  currentSample: DiagnosticsSample,
): boolean {
  return (
    previousSample !== null &&
    currentSample.diagnostics.outOfMemoryCount > previousSample.diagnostics.outOfMemoryCount
  );
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
