// ============================================================================
// Main - Implementation de l'orchestration applicative
// ----------------------------------------------------------------------------
// Ce fichier initialise l'application et connecte les modules UI. Il ne porte
// pas les appels Particle Cloud ni la construction du protocole firmware.
// ============================================================================

import "./styles.css";
import { attachShellEvents } from "./ui/events";
import { renderShell } from "./ui/render";
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

  const state = createInitialState();
  renderShell(rootElement, state);
  attachShellEvents(rootElement, state);
}

bootstrapApplication();
