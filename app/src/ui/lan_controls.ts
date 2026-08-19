// ============================================================================
// LanControls - Etat interactif des controles de connexion locale
// ----------------------------------------------------------------------------
// Ce fichier synchronise le bouton de test avec la saisie LAN. Il ne lance
// aucun appel reseau et ne reconstruit aucun champ de formulaire.
// ============================================================================

import type { AppState } from "./state";

// Selecteur du bouton qui teste exclusivement la route de sante LAN.
const LAN_TEST_BUTTON_SELECTOR = "[data-action='test-lan']";

// ----------------------------------------------------------------------------
// Verifie que l'adresse et le port permettent de tenter une connexion LAN.
//
// Parametres :
// - state : etat contenant l'adresse et le port saisis.
//
// Retour :
// - vrai si un hote existe et si le port appartient a la plage TCP valide.
// ----------------------------------------------------------------------------
export function isLanTestConfigurationValid(state: AppState): boolean {
  return (
    state.lanHost.trim().length > 0 &&
    Number.isInteger(state.lanPort) &&
    state.lanPort >= 1 &&
    state.lanPort <= 65_535
  );
}

// ----------------------------------------------------------------------------
// Synchronise le bouton de test pendant la saisie de l'adresse LAN.
//
// Parametres :
// - rootElement : racine DOM contenant le bouton eventuel.
// - state : etat courant de l'application.
//
// Effet de bord :
// - active ou desactive le bouton sans remplacer les champs de formulaire.
// ----------------------------------------------------------------------------
export function syncLanTestButton(rootElement: HTMLElement, state: AppState): void {
  const buttonElement = rootElement.querySelector<HTMLButtonElement>(LAN_TEST_BUTTON_SELECTOR);
  if (buttonElement === null) return;
  buttonElement.disabled = state.isBusy || !isLanTestConfigurationValid(state);
}
