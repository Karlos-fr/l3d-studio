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
import { loadParticleSession } from "./particle/session";
import { attachAppEvents, hydrateAuthenticatedSession } from "./ui/events";
import { loadAppPreferences } from "./ui/preferences";
import { renderApp } from "./ui/render";
import { updateDiagnosticsView } from "./ui/diagnostics_render";
import { createInitialState } from "./ui/state";

// Identifiant du conteneur DOM racine fourni par index.html.
const APP_ROOT_ID = "app";

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

  // ----------------------------------------------------------------------------
  // Indique si la page courante est masquee par le navigateur.
  //
  // Retour :
  // - vrai lorsque la collecte doit rester suspendue.
  // ----------------------------------------------------------------------------
  function isDiagnosticsPageHidden(): boolean {
    return document.hidden;
  }

  const diagnosticsMonitor = createDiagnosticsMonitor({
    readSample: readCurrentDiagnosticsSample,
    onSample: handleDiagnosticsSample,
    onError: handleDiagnosticsError,
    isPageHidden: isDiagnosticsPageHidden,
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
    });
  }

  // ----------------------------------------------------------------------------
  // Transmet les changements de visibilite au moniteur periodique.
  //
  // Effet de bord :
  // - suspend ou reprogramme le prochain echantillon sans lancer de rafale.
  // ----------------------------------------------------------------------------
  function handleVisibilityChange(): void {
    diagnosticsMonitor.pageVisibilityChanged();
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

  document.addEventListener("visibilitychange", handleVisibilityChange);

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
  });
}

bootstrapApplication();
