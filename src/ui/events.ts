// ============================================================================
// UiEvents - Implementation des evenements de la coquille
// ----------------------------------------------------------------------------
// Ce fichier relie les interactions utilisateur au rendu courant. Il ne porte
// pas les appels Particle Cloud ni la construction des commandes firmware.
// ============================================================================

import type { AppState } from "./state";

// Selecteur du bouton de verification affiche dans la coquille initiale.
const NOOP_ACTION_SELECTOR = "[data-action='noop']";

// Selecteur de l'indicateur de statut de connexion.
const CONNECTION_STATUS_SELECTOR = "[data-role='connection-status']";

// ----------------------------------------------------------------------------
// Branche les evenements de la coquille initiale.
//
// Parametres :
// - rootElement : element DOM contenant la coquille applicative.
// - state : etat applicatif actuellement affiche.
//
// Effet de bord :
// - ajoute un gestionnaire de clic au bouton de verification.
// ----------------------------------------------------------------------------
export function attachShellEvents(rootElement: HTMLElement, state: AppState): void {
  const buttonElement = rootElement.querySelector<HTMLButtonElement>(NOOP_ACTION_SELECTOR);
  const statusElement = rootElement.querySelector<HTMLElement>(CONNECTION_STATUS_SELECTOR);

  if (buttonElement === null || statusElement === null) {
    return;
  }

  buttonElement.addEventListener("click", () => {
    statusElement.textContent = `${state.connectionStatus} - interface prete`;
  });
}
