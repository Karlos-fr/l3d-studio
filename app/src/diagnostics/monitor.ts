// ============================================================================
// DiagnosticsMonitor - Orchestration periodique sans chevauchement
// ----------------------------------------------------------------------------
// Ce fichier planifie les lectures et applique un ralentissement sur erreur. Il
// ne connait ni Particle, ni le LAN, ni le DOM de rendu.
// ============================================================================

import type { DiagnosticsSample } from "./types";

export interface DiagnosticsMonitorOptions {
  readSample: () => Promise<DiagnosticsSample>;
  onSample: (sample: DiagnosticsSample) => void;
  onError: (error: unknown, consecutiveErrors: number) => void;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}

export interface DiagnosticsMonitor {
  start(intervalSeconds: number): void;
  stop(): void;
  refresh(): Promise<boolean>;
  isRunning(): boolean;
  isBusy(): boolean;
}

// Delai maximal applique apres plusieurs erreurs consecutives.
const MAX_DIAGNOSTICS_BACKOFF_MILLISECONDS = 60_000;

// ----------------------------------------------------------------------------
// Cree un moniteur recursif qui interdit les appels superposes.
//
// Parametres :
// - options : lecture, notifications et timers injectables.
//
// Retour :
// - controleur demarrable, arretable et testable independamment du DOM.
// ----------------------------------------------------------------------------
export function createDiagnosticsMonitor(
  options: DiagnosticsMonitorOptions,
): DiagnosticsMonitor {
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let inFlight = false;
  let intervalMilliseconds = 10_000;
  let consecutiveErrors = 0;

  // Annule le prochain passage sans interrompre une requete deja partie.
  const cancelTimer = (): void => {
    if (timerId === null) return;
    clearTimer(timerId);
    timerId = null;
  };

  // Programme le prochain passage seulement si le suivi peut avancer.
  const scheduleNext = (delayMilliseconds: number): void => {
    cancelTimer();
    if (!running) return;
    timerId = setTimer(() => {
      timerId = null;
      void executePeriodicRead();
    }, delayMilliseconds);
  };

  // Execute une lecture et planifie la suivante apres sa terminaison.
  const executePeriodicRead = async (): Promise<void> => {
    if (!running || inFlight) return;
    inFlight = true;
    try {
      const sample = await options.readSample();
      consecutiveErrors = 0;
      options.onSample(sample);
    } catch (error) {
      consecutiveErrors += 1;
      options.onError(error, consecutiveErrors);
    } finally {
      inFlight = false;
      const multiplier = 2 ** Math.min(consecutiveErrors, 3);
      const nextDelay = Math.min(
        intervalMilliseconds * multiplier,
        MAX_DIAGNOSTICS_BACKOFF_MILLISECONDS,
      );
      scheduleNext(nextDelay);
    }
  };

  return {
    start(intervalSeconds: number): void {
      intervalMilliseconds = intervalSeconds * 1_000;
      running = true;
      consecutiveErrors = 0;
      scheduleNext(intervalMilliseconds);
    },

    stop(): void {
      running = false;
      cancelTimer();
    },

    async refresh(): Promise<boolean> {
      if (inFlight) return false;
      cancelTimer();
      inFlight = true;
      try {
        const sample = await options.readSample();
        consecutiveErrors = 0;
        options.onSample(sample);
        return true;
      } catch (error) {
        consecutiveErrors += 1;
        options.onError(error, consecutiveErrors);
        return false;
      } finally {
        inFlight = false;
        if (running) scheduleNext(intervalMilliseconds);
      }
    },

    isRunning(): boolean {
      return running;
    },

    isBusy(): boolean {
      return inFlight;
    },
  };
}
