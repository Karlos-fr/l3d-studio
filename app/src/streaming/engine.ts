// ============================================================================
// StreamingEngine - Cadence et backpressure du streaming web
// ----------------------------------------------------------------------------
// Le moteur calcule au plus une frame par echeance et ne conserve jamais de
// file d'envoi : une frame est comptee comme perdue si le POST precedent dure.
// ============================================================================

import type { StreamingAnimation } from "./animation";
import { StreamingFramebuffer } from "./framebuffer";
import { serializeRgb332 } from "./serializer";

// Cadence entiere acceptee entre les deux limites de l'interface.
export type StreamingFps = number;

// Bornes du moteur, exprimees en images par seconde.
export const STREAMING_MIN_FPS = 10;
export const STREAMING_MAX_FPS = 30;

// ----------------------------------------------------------------------------
// Borne une cadence entiere sans la ramener a des paliers predefinis.
//
// Parametres :
// - requestedFps : valeur candidate issue de l'interface ou d'un appel direct.
//
// Retour :
// - entier conserve entre 10 et 30, inclusivement.
// ----------------------------------------------------------------------------
export function normalizeStreamingFps(requestedFps: number): StreamingFps {
  if (!Number.isFinite(requestedFps)) return STREAMING_MIN_FPS;
  return Math.max(
    STREAMING_MIN_FPS,
    Math.min(STREAMING_MAX_FPS, Math.round(requestedFps)),
  );
}

// Statistiques compactes publiees vers l'interface.
export interface StreamingStats {
  active: boolean;
  targetFps: StreamingFps;
  sentFrames: number;
  droppedFrames: number;
  measuredFps: number;
}

// Dependances injectables du moteur pour le navigateur et les tests.
export interface StreamingEngineOptions {
  animation: StreamingAnimation;
  sendFrame: (frame: Uint8Array, signal: AbortSignal) => Promise<void>;
  onFrame: (framebuffer: StreamingFramebuffer) => void;
  onStats: (stats: StreamingStats) => void;
  onError: (error: unknown) => void;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
}

// API publique minimale du moteur de streaming.
export interface StreamingEngine {
  start(targetFps: StreamingFps): void;
  setAnimation(animation: StreamingAnimation): void;
  setTargetFps(targetFps: StreamingFps): void;
  stop(): void;
  getFramebuffer(): StreamingFramebuffer;
  getStats(): StreamingStats;
}

// ----------------------------------------------------------------------------
// Cree un moteur borne a un seul POST actif.
//
// Parametres :
// - options : animation, transport, sorties UI et horloge optionnelle.
//
// Retour :
// - moteur controlable sans dependance a l'etat global de l'application.
// ----------------------------------------------------------------------------
export function createStreamingEngine(options: StreamingEngineOptions): StreamingEngine {
  const framebuffer = new StreamingFramebuffer();
  let animation = options.animation;
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const cancelFrame = options.cancelFrame ?? cancelAnimationFrame;
  let animationFrameHandle: number | null = null;
  let abortController: AbortController | null = null;
  let inFlight = false;
  let startedAt = 0;
  let animationStartedAt = 0;
  let lastComputedAt = Number.NEGATIVE_INFINITY;
  let stats: StreamingStats = {
    active: false,
    targetFps: 10,
    sentFrames: 0,
    droppedFrames: 0,
    measuredFps: 0,
  };

  // --------------------------------------------------------------------------
  // Publie une copie stable des compteurs courants.
  // --------------------------------------------------------------------------
  function publishStats(): void {
    options.onStats({ ...stats });
  }

  // --------------------------------------------------------------------------
  // Programme le prochain passage requestAnimationFrame si le moteur tourne.
  // --------------------------------------------------------------------------
  function scheduleNextFrame(): void {
    if (!stats.active) return;
    animationFrameHandle = requestFrame(processFrame);
  }

  // --------------------------------------------------------------------------
  // Calcule l'echeance courante et applique la politique sans file d'attente.
  //
  // Parametres :
  // - timestamp : horodatage haute resolution fourni par le navigateur.
  // --------------------------------------------------------------------------
  function processFrame(timestamp: number): void {
    animationFrameHandle = null;
    if (!stats.active) return;
    const frameInterval = 1000 / stats.targetFps;
    if (timestamp - lastComputedAt + 0.01 < frameInterval) {
      scheduleNextFrame();
      return;
    }
    if (startedAt === 0) startedAt = timestamp;
    if (animationStartedAt === 0) animationStartedAt = timestamp;
    lastComputedAt = timestamp;
    animation.frame(framebuffer, (timestamp - animationStartedAt) / 1000);
    options.onFrame(framebuffer);

    if (inFlight) {
      stats.droppedFrames += 1;
      publishStats();
      scheduleNextFrame();
      return;
    }

    const payload = serializeRgb332(framebuffer);
    const requestController = new AbortController();
    abortController = requestController;
    inFlight = true;
    void options.sendFrame(payload, requestController.signal)
      .then(() => {
        if (!stats.active) return;
        stats.sentFrames += 1;
        const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
        stats.measuredFps = stats.sentFrames / elapsedSeconds;
        publishStats();
      })
      .catch((error: unknown) => {
        if (!stats.active || requestController.signal.aborted) return;
        stop();
        options.onError(error);
      })
      .finally(() => {
        inFlight = false;
        if (abortController === requestController) abortController = null;
      });
    scheduleNextFrame();
  }

  // --------------------------------------------------------------------------
  // Demarre une nouvelle session et remet ses compteurs a zero.
  //
  // Parametres :
  // - targetFps : cadence entiere demandee entre 10 et 30 images par seconde.
  // --------------------------------------------------------------------------
  function start(targetFps: StreamingFps): void {
    stop();
    stats = {
      active: true,
      targetFps: normalizeStreamingFps(targetFps),
      sentFrames: 0,
      droppedFrames: 0,
      measuredFps: 0,
    };
    startedAt = 0;
    animationStartedAt = 0;
    lastComputedAt = Number.NEGATIVE_INFINITY;
    animation.init(framebuffer);
    options.onFrame(framebuffer);
    publishStats();
    scheduleNextFrame();
  }

  // --------------------------------------------------------------------------
  // Modifie la cadence d'une session sans reinitialiser son animation.
  //
  // Parametres :
  // - targetFps : nouvelle cadence entiere demandee entre 10 et 30 FPS.
  //
  // Effet de bord :
  // - publie immediatement la nouvelle cible dans les statistiques.
  // --------------------------------------------------------------------------
  function setTargetFps(targetFps: StreamingFps): void {
    stats.targetFps = normalizeStreamingFps(targetFps);
    publishStats();
  }

  // --------------------------------------------------------------------------
  // Remplace l'animation sans arreter le flux ni remettre les compteurs a zero.
  //
  // Parametres :
  // - nextAnimation : nouvelle instance creee par le registre.
  //
  // Effet de bord :
  // - initialise son framebuffer et redemarre seulement son horloge locale.
  // --------------------------------------------------------------------------
  function setAnimation(nextAnimation: StreamingAnimation): void {
    animation = nextAnimation;
    animation.init(framebuffer);
    animationStartedAt = stats.active ? performance.now() : 0;
    lastComputedAt = Number.NEGATIVE_INFINITY;
    options.onFrame(framebuffer);
  }

  // --------------------------------------------------------------------------
  // Arrete la cadence et annule le POST encore actif.
  // --------------------------------------------------------------------------
  function stop(): void {
    if (animationFrameHandle !== null) {
      cancelFrame(animationFrameHandle);
      animationFrameHandle = null;
    }
    stats.active = false;
    abortController?.abort();
    abortController = null;
    publishStats();
  }

  return {
    start,
    setAnimation,
    setTargetFps,
    stop,
    getFramebuffer: () => framebuffer,
    getStats: () => ({ ...stats }),
  };
}
