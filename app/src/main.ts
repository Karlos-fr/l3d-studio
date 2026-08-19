// ============================================================================
// Main - Implementation de l'orchestration applicative
// ----------------------------------------------------------------------------
// Ce fichier initialise l'application et connecte les modules UI. Il ne porte
// pas les appels Particle Cloud ni la construction du protocole firmware.
// ============================================================================

import "./styles.css";
import { appendDiagnosticsSample } from "./diagnostics/history";
import { createDiagnosticsMonitor } from "./diagnostics/monitor";
import { readDiagnosticsSample } from "./diagnostics/reader";
import type { DiagnosticsSample } from "./diagnostics/types";
import { createParticleClient } from "./particle/client";
import { createLanClient, LanClientError, normalizeLanHost, normalizeLanPort } from "./lan/client";
import { loadParticleSession } from "./particle/session";
import { attachAppEvents, hydrateAuthenticatedSession } from "./ui/events";
import { loadAppPreferences } from "./ui/preferences";
import { renderApp } from "./ui/render";
import { updateDiagnosticsView } from "./ui/diagnostics_render";
import { createInitialState } from "./ui/state";
import { createStreamingEngine, type StreamingFps } from "./streaming/engine";
import { createStreamingAnimation, getStreamingAnimationLabel } from "./streaming/registry";
import type { StreamingAnimation } from "./streaming/animation";
import type { LanClient } from "./lan/types";
import { updateStreamingView } from "./ui/streaming_render";

// Identifiant du conteneur DOM racine fourni par index.html.
const APP_ROOT_ID = "app";

// Identifiant firmware stable du mode Stream.
const STREAM_MODE_ID = 76;

// Attente apres le dernier mouvement du slider avant la commande Photon.
const STREAMING_BRIGHTNESS_DEBOUNCE_MS = 150;

// ----------------------------------------------------------------------------
// Initialise L3D Studio dans le conteneur DOM principal.
//
// Effet de bord :
// - lit le document courant, injecte le rendu initial et branche les evenements
//   utilisateur de la coquille applicative.
// ----------------------------------------------------------------------------
function bootstrapApplication(): void {
  const rootElement = document.getElementById(APP_ROOT_ID);

  if (rootElement === null) {
    throw new Error("Le conteneur principal de l'application est introuvable.");
  }

  const mountedRootElement = rootElement;

  // Derniere largeur traitee afin d'eviter une boucle de ResizeObserver.
  let previousDiagnosticsWidth = 0;

  const session = loadParticleSession(window.localStorage);
  const preferences = loadAppPreferences(window.localStorage);
  const particleClient = createParticleClient({
    token: session?.accessToken,
  });
  const state = createInitialState(session, preferences);

  // Client LAN propre a la session de streaming courante.
  let streamingLanClient: LanClient | null = null;

  // Derniere luminosite a appliquer apres la frame HTTP actuellement en cours.
  let pendingStreamingBrightness: number | null = null;

  // Temporisation qui regroupe les nombreux evenements produits par le slider.
  let streamingBrightnessTimer: number | null = null;

  // Animation creee depuis le registre et remplacable sans recreer le moteur.
  let activeStreamingAnimation: StreamingAnimation = createStreamingAnimation(
    state.streaming.selectedAnimationId,
  );
  const streamingEngine = createStreamingEngine({
    animation: activeStreamingAnimation,
    sendFrame: async (frame, signal) => {
      if (streamingLanClient === null) {
        throw new Error("Aucune destination LAN n'est configurée pour le streaming.");
      }
      await streamingLanClient.streamFrame(frame, signal);
      if (pendingStreamingBrightness !== null) {
        const brightnessPercent = pendingStreamingBrightness;
        pendingStreamingBrightness = null;
        try {
          await streamingLanClient.mode(`B:${brightnessPercent},`);
        } catch {
          // Une prochaine manipulation du slider pourra retenter sans couper
          // le streaming ni transformer cette commande annexe en erreur fatale.
        }
      }
    },
    onFrame: (framebuffer) => updateStreamingView(mountedRootElement, state, framebuffer),
    onStats: (stats) => {
      Object.assign(state.streaming, stats);
      updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
    },
    onError: handleStreamingError,
  });

  // ----------------------------------------------------------------------------
  // Convertit un echec de streaming en instruction directement exploitable.
  //
  // Parametres :
  // - error : erreur reseau ou de protocole recue par le moteur.
  //
  // Effet de bord :
  // - arrete la session et actualise uniquement son panneau.
  // ----------------------------------------------------------------------------
  function handleStreamingError(error: unknown): void {
    state.streaming.active = false;
    state.streaming.statusMessage = error instanceof LanClientError
      ? "Streaming interrompu : vérifie l'adresse LAN, le port 8080 et le firmware du Photon."
      : error instanceof Error
        ? `Streaming interrompu : ${error.message}`
        : "Streaming interrompu par une erreur inconnue.";
    state.statusMessage = state.streaming.statusMessage;
    updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
  }

  // ----------------------------------------------------------------------------
  // Applique les reglages modifiables pendant une session active.
  //
  // Effet de bord :
  // - modifie immediatement la vitesse locale ;
  // - remplace la luminosite en attente, envoyee apres la prochaine frame.
  // ----------------------------------------------------------------------------
  function updateStreamingSettings(): void {
    activeStreamingAnimation.setSpeed?.(state.streaming.movementStepsPerSecond);
    if (state.streaming.active && streamingLanClient !== null) {
      if (streamingBrightnessTimer !== null) {
        window.clearTimeout(streamingBrightnessTimer);
      }
      streamingBrightnessTimer = window.setTimeout(() => {
        streamingBrightnessTimer = null;
        if (state.streaming.active && streamingLanClient !== null) {
          pendingStreamingBrightness = state.streaming.brightnessPercent;
        }
      }, STREAMING_BRIGHTNESS_DEBOUNCE_MS);
    }
    updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
  }

  // ----------------------------------------------------------------------------
  // Selectionne une animation du registre sans interrompre une session active.
  //
  // Parametres :
  // - animationId : identifiant stable choisi dans l'interface.
  //
  // Effet de bord :
  // - remplace l'animation et remet uniquement sa timeline a zero.
  // ----------------------------------------------------------------------------
  function selectStreamingAnimation(animationId: string): void {
    state.streaming.selectedAnimationId = animationId;
    activeStreamingAnimation = createStreamingAnimation(animationId);
    activeStreamingAnimation.setSpeed?.(state.streaming.movementStepsPerSecond);
    streamingEngine.setAnimation(activeStreamingAnimation);
    state.streaming.statusMessage = state.streaming.active
      ? `${getStreamingAnimationLabel(animationId)} en cours.`
      : `${getStreamingAnimationLabel(animationId)} sélectionné.`;
    updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
  }

  // ----------------------------------------------------------------------------
  // Applique une nouvelle cadence sans interrompre la session courante.
  //
  // Effet de bord :
  // - modifie l'intervalle du moteur actif sans reinitialiser la sphere.
  // ----------------------------------------------------------------------------
  function updateStreamingCadence(): void {
    if (state.streaming.active) {
      streamingEngine.setTargetFps(state.streaming.targetFps);
      return;
    }
    updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
  }

  // ----------------------------------------------------------------------------
  // Selectionne le mode Stream puis lance la cadence du navigateur.
  //
  // Parametres :
  // - targetFps : cadence bornee choisie dans l'interface.
  //
  // Effet de bord :
  // - appelle le Photon sur le LAN et demarre le moteur apres confirmation.
  // ----------------------------------------------------------------------------
  async function startStreaming(targetFps: StreamingFps): Promise<void> {
    try {
      state.isBusy = true;
      const host = normalizeLanHost(state.lanHost);
      const port = normalizeLanPort(state.lanPort);
      streamingLanClient = createLanClient({ host, port });
      state.streaming.statusMessage = "Activation du mode Stream...";
      rerender();
      activeStreamingAnimation.setSpeed?.(state.streaming.movementStepsPerSecond);
      pendingStreamingBrightness = null;
      if (streamingBrightnessTimer !== null) {
        window.clearTimeout(streamingBrightnessTimer);
        streamingBrightnessTimer = null;
      }
      await streamingLanClient.mode(
        `M:Stream,S:0,B:${state.streaming.brightnessPercent},`,
      );
      const streamState = await streamingLanClient.state();
      if (streamState.modeId !== STREAM_MODE_ID) {
        throw new Error("Le Photon n'a pas confirmé l'activation du mode Stream.");
      }
      state.lastTransportUsed = "lan";
      state.currentModeName = "Stream";
      state.streaming.statusMessage = `${getStreamingAnimationLabel(state.streaming.selectedAnimationId)} en cours.`;
      state.isBusy = false;
      streamingEngine.start(targetFps);
      rerender();
    } catch (error) {
      state.isBusy = false;
      streamingLanClient = null;
      handleStreamingError(error);
      rerender();
    }
  }

  // ----------------------------------------------------------------------------
  // Arrete les frames et demande au cube de revenir au mode Off.
  //
  // Parametres :
  // - returnToOff : demande Off sauf lorsqu'une animation native va suivre.
  //
  // Effet de bord :
  // - annule requestAnimationFrame et le POST actif avant toute commande finale.
  // ----------------------------------------------------------------------------
  function stopStreaming(returnToOff = true): void {
    const wasActive = state.streaming.active;
    streamingEngine.stop();
    state.streaming.statusMessage = "Streaming arrêté.";
    if (returnToOff && wasActive && streamingLanClient !== null) {
      void streamingLanClient.mode("M:Off,S:0,B:1,").catch(() => {
        // Le timeout firmware ramene egalement le cube a Off si cette commande echoue.
      });
    }
    streamingLanClient = null;
    pendingStreamingBrightness = null;
    if (streamingBrightnessTimer !== null) {
      window.clearTimeout(streamingBrightnessTimer);
      streamingBrightnessTimer = null;
    }
    updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
  }

  // ----------------------------------------------------------------------------
  // Integre un nouvel echantillon puis actualise uniquement le panneau concerne.
  //
  // Parametres :
  // - sample : echantillon commun retourne par le transport actif.
  //
  // Effet de bord :
  // - enrichit l'historique et remplace la zone vivante des diagnostics.
  // ----------------------------------------------------------------------------
  function handleDiagnosticsSample(sample: DiagnosticsSample): void {
    appendDiagnosticsSample(state.diagnostics, sample);
    state.lastTransportUsed = sample.source;
    updateDiagnosticsView(mountedRootElement, state);
  }

  // ----------------------------------------------------------------------------
  // Conserve le dernier echec de collecte sans effacer les donnees valides.
  //
  // Parametres :
  // - error : erreur recue par le moniteur.
  // - consecutiveErrors : nombre d'echecs consecutifs courant.
  //
  // Effet de bord :
  // - met a jour le message d'erreur dans la seule zone Diagnostics.
  // ----------------------------------------------------------------------------
  function handleDiagnosticsError(error: unknown, consecutiveErrors: number): void {
    state.diagnostics.lastError =
      error instanceof Error ? error.message : "Erreur de diagnostic inconnue.";
    state.diagnostics.consecutiveErrors = consecutiveErrors;
    updateDiagnosticsView(mountedRootElement, state);
  }

  const diagnosticsMonitor = createDiagnosticsMonitor({
    readSample: readCurrentDiagnosticsSample,
    onSample: handleDiagnosticsSample,
    onError: handleDiagnosticsError,
  });

  // ----------------------------------------------------------------------------
  // Lit un echantillon avec l'etat et le client Particle courants.
  //
  // Retour :
  // - promesse du prochain echantillon de diagnostics.
  //
  // Effet de bord :
  // - appelle le transport LAN ou Particle configure.
  // ----------------------------------------------------------------------------
  function readCurrentDiagnosticsSample(): Promise<DiagnosticsSample> {
    return readDiagnosticsSample(state, particleClient);
  }

  // ----------------------------------------------------------------------------
  // Relance le rendu et rebranche les evenements sur le DOM remplace.
  //
  // Effet de bord :
  // - remplace l'interface courante et ajoute les gestionnaires d'evenements.
  // ----------------------------------------------------------------------------
  function rerender(): void {
    renderApp(mountedRootElement, state);
    attachAppEvents({
      rootElement: mountedRootElement,
      state,
      particleClient,
      diagnosticsMonitor,
      storage: window.localStorage,
      rerender,
      startStreaming,
      selectStreamingAnimation,
      updateStreamingCadence,
      updateStreamingSettings,
      stopStreaming,
    });
    updateStreamingView(mountedRootElement, state, streamingEngine.getFramebuffer());
  }

  // ----------------------------------------------------------------------------
  // Recalcule les SVG lorsque la largeur disponible change reellement.
  //
  // Parametres :
  // - _entries : notifications de redimensionnement emises par le navigateur.
  //
  // Effet de bord :
  // - actualise seulement les graphiques et ne lance aucune collecte reseau.
  // ----------------------------------------------------------------------------
  function handleDiagnosticsResize(_entries: ResizeObserverEntry[]): void {
    const currentWidth = mountedRootElement.clientWidth;
    if (currentWidth === previousDiagnosticsWidth) return;
    previousDiagnosticsWidth = currentWidth;
    updateDiagnosticsView(mountedRootElement, state);
  }

  // Observateur unique de la racine conserve pendant toute la vie de l'app.
  const diagnosticsResizeObserver = new ResizeObserver(handleDiagnosticsResize);
  diagnosticsResizeObserver.observe(mountedRootElement);

  rerender();
  void hydrateAuthenticatedSession({
    rootElement: mountedRootElement,
    state,
    particleClient,
    diagnosticsMonitor,
    storage: window.localStorage,
    rerender,
    startStreaming,
    selectStreamingAnimation,
    updateStreamingCadence,
    updateStreamingSettings,
    stopStreaming,
  });
}

bootstrapApplication();
