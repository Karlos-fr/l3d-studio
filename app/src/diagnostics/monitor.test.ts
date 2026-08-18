// ============================================================================
// DiagnosticsMonitorTest - Tests de l'orchestration periodique
// ----------------------------------------------------------------------------
// Ce fichier verifie timers, chevauchements, visibilite et backoff avec des
// horloges simulees. Il ne lance aucun appel reseau.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDiagnosticsMonitor } from "./monitor";
import type { DiagnosticsSample } from "./types";

// Echantillon minimal retourne par les lectures factices.
const SAMPLE = { source: "lan" } as DiagnosticsSample;

// ----------------------------------------------------------------------------
// Execute les tests du moniteur periodique.
// ----------------------------------------------------------------------------
function runDiagnosticsMonitorTests(): void {
  // Active les horloges factices avant chaque scenario.
  beforeEach(() => vi.useFakeTimers());

  // Restaure les horloges reelles apres chaque scenario.
  afterEach(() => vi.useRealTimers());

  // --------------------------------------------------------------------------
  // Verifie que la lecture suivante attend la fin de la precedente.
  // --------------------------------------------------------------------------
  it("interdit les appels superposes", async () => {
    let resolveRead: ((sample: DiagnosticsSample) => void) | null = null;
    const readSample = vi.fn(
      () =>
        new Promise<DiagnosticsSample>((resolve) => {
          resolveRead = resolve;
        }),
    );
    const monitor = createDiagnosticsMonitor({
      readSample,
      onSample: vi.fn(),
      onError: vi.fn(),
      isPageHidden: () => false,
    });

    monitor.start(5);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(readSample).toHaveBeenCalledOnce();
    const finishRead = resolveRead as ((sample: DiagnosticsSample) => void) | null;
    finishRead?.(SAMPLE);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(readSample).toHaveBeenCalledTimes(2);
  });

  // --------------------------------------------------------------------------
  // Verifie la suspension masquee et la reprise sans lecture immediate.
  // --------------------------------------------------------------------------
  it("suspend un onglet masque et reprend sans rafale", async () => {
    let hidden = true;
    const readSample = vi.fn(async () => SAMPLE);
    const monitor = createDiagnosticsMonitor({
      readSample,
      onSample: vi.fn(),
      onError: vi.fn(),
      isPageHidden: () => hidden,
    });

    monitor.start(5);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(readSample).not.toHaveBeenCalled();
    hidden = false;
    monitor.pageVisibilityChanged();
    await vi.advanceTimersByTimeAsync(4_999);
    expect(readSample).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(readSample).toHaveBeenCalledOnce();
  });

  // --------------------------------------------------------------------------
  // Verifie le doublement du delai apres une erreur et son plafond progressif.
  // --------------------------------------------------------------------------
  it("ralentit la surveillance apres un echec", async () => {
    const readSample = vi.fn().mockRejectedValueOnce(new Error("indisponible")).mockResolvedValue(SAMPLE);
    const onError = vi.fn();
    const monitor = createDiagnosticsMonitor({
      readSample,
      onSample: vi.fn(),
      onError,
      isPageHidden: () => false,
    });

    monitor.start(5);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 1);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(readSample).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(readSample).toHaveBeenCalledTimes(2);
  });

  // --------------------------------------------------------------------------
  // Verifie que stop annule le timer futur et que refresh reste ponctuel.
  // --------------------------------------------------------------------------
  it("annule les timers et permet une actualisation ponctuelle", async () => {
    const readSample = vi.fn(async () => SAMPLE);
    const monitor = createDiagnosticsMonitor({
      readSample,
      onSample: vi.fn(),
      onError: vi.fn(),
      isPageHidden: () => false,
    });

    monitor.start(5);
    monitor.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(readSample).not.toHaveBeenCalled();
    await expect(monitor.refresh()).resolves.toBe(true);
    expect(readSample).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(readSample).toHaveBeenCalledOnce();
  });
}

describe("moniteur de diagnostics", runDiagnosticsMonitorTests);
