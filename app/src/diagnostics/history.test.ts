// ============================================================================
// DiagnosticsHistoryTest - Tests de l'historique borne
// ----------------------------------------------------------------------------
// Ce fichier verifie capacite et alertes memoire. Il ne gere ni timer, ni
// reseau, ni graphique.
// ============================================================================

import { describe, expect, it } from "vitest";
import { appendDiagnosticsSample, DIAGNOSTICS_HISTORY_CAPACITY } from "./history";
import type { DiagnosticsMonitorState, DiagnosticsSample } from "./types";

// ----------------------------------------------------------------------------
// Execute les tests de l'historique des diagnostics.
// ----------------------------------------------------------------------------
function runDiagnosticsHistoryTests(): void {
  // --------------------------------------------------------------------------
  // Verifie que la capacite elimine exactement le point le plus ancien.
  // --------------------------------------------------------------------------
  it("borne strictement le nombre d'echantillons", () => {
    const state = createMonitorState();
    for (let index = 0; index <= DIAGNOSTICS_HISTORY_CAPACITY; index += 1) {
      appendDiagnosticsSample(state, createSample(index, 32_000, 0));
    }

    expect(state.history).toHaveLength(DIAGNOSTICS_HISTORY_CAPACITY);
    expect(state.history[0]?.capturedAtMilliseconds).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Verifie les alertes sur minimum memoire et compteur OOM.
  // --------------------------------------------------------------------------
  it("signale une degradation memoire", () => {
    const state = createMonitorState();
    appendDiagnosticsSample(state, createSample(1, 32_000, 0));
    appendDiagnosticsSample(state, createSample(2, 31_000, 0));
    expect(state.warningMessage).toContain("minimum");
    appendDiagnosticsSample(state, createSample(3, 31_000, 1));
    expect(state.warningMessage).toContain("insuffisante");
  });
}

// ----------------------------------------------------------------------------
// Cree l'etat vide du moniteur.
//
// Retour :
// - etat mutable sans echantillon.
// ----------------------------------------------------------------------------
function createMonitorState(): DiagnosticsMonitorState {
  return {
    enabled: false,
    intervalSeconds: 10,
    latestSample: null,
    history: [],
    lastError: null,
    consecutiveErrors: 0,
    estimatedParticleDataOperations: 0,
    warningMessage: null,
  };
}

// ----------------------------------------------------------------------------
// Cree un echantillon minimal avec les compteurs controles par le test.
//
// Parametres :
// - capturedAtMilliseconds : ordre du point.
// - minimumFreeMemory : minimum memoire simule.
// - outOfMemoryCount : compteur OOM simule.
//
// Retour :
// - echantillon suffisamment type pour la logique d'historique.
// ----------------------------------------------------------------------------
function createSample(
  capturedAtMilliseconds: number,
  minimumFreeMemory: number,
  outOfMemoryCount: number,
): DiagnosticsSample {
  return {
    capturedAtMilliseconds,
    source: "lan",
    latencyMilliseconds: 1,
    dataOperations: 0,
    diagnostics: {
      formatVersion: 1,
      sequence: capturedAtMilliseconds,
      modeId: 0,
      uptimeSeconds: 1,
      resetReason: 0,
      resetReasonData: 0,
      startupFreeMemory: 34_000,
      freeMemory: 33_000,
      minimumFreeMemory,
      frameMemoryBefore: 33_000,
      frameMemoryAfter: 33_000,
      modeMinimumFreeMemory: minimumFreeMemory,
      frameCount: 1,
      lastFrameMicros: 1_000,
      averageFrameMicros: 1_000,
      worstFrameMicros: 1_000,
      fpsTimesTen: 100,
      modeChangeCount: 1,
      wifiReady: true,
      particleConnected: true,
      lastOutOfMemoryBytes: -1,
      outOfMemoryCount,
    },
  };
}

describe("historique des diagnostics", runDiagnosticsHistoryTests);
