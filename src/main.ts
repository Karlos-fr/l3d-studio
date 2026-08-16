// ============================================================================
// Main - Implementation de l'orchestration applicative
// ----------------------------------------------------------------------------
// Ce fichier initialise l'application et connecte les modules UI. Il ne porte
// pas les appels Particle Cloud ni la construction du protocole firmware.
// ============================================================================

import "./styles.css";
import { createParticleClient } from "./particle/client";
import { loadParticleSession } from "./particle/session";
import { attachAppEvents, hydrateAuthenticatedSession } from "./ui/events";
import { loadAppPreferences } from "./ui/preferences";
import { renderApp } from "./ui/render";
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

  const session = loadParticleSession(window.localStorage);
  const preferences = loadAppPreferences(window.localStorage);
  const particleClient = createParticleClient({
    token: session?.accessToken,
  });
  const state = createInitialState(session, preferences);

  // ----------------------------------------------------------------------------
  // Relance le rendu et rebranche les evenements sur le DOM remplace.
  //
  // Effet de bord :
  // - remplace l'interface courante et ajoute les gestionnaires d'evenements.
  // ----------------------------------------------------------------------------
  const rerender = (): void => {
    renderApp(rootElement, state);
    attachAppEvents({
      rootElement,
      state,
      particleClient,
      storage: window.localStorage,
      rerender,
    });
  };

  rerender();
  void hydrateAuthenticatedSession({
    rootElement,
    state,
    particleClient,
    storage: window.localStorage,
    rerender,
  });
}

bootstrapApplication();
