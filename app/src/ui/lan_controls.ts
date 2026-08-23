// ============================================================================
// LanControls - Etat interactif des controles de connexion locale
// ----------------------------------------------------------------------------
// Ce fichier synchronise le bouton de connexion avec la saisie LAN. Il ne lance
// aucun appel reseau et ne reconstruit aucun champ de formulaire.
// ============================================================================

import type { AppState } from "./state";

// Selecteur stable du bouton qui alterne connexion et deconnexion.
const LAN_CONNECTION_BUTTON_SELECTOR = "[data-role='lan-connection-toggle']";

// ----------------------------------------------------------------------------
// Verifie que l'adresse et le port permettent de tenter une connexion LAN.
//
// Parametres :
// - state : etat contenant l'adresse et le port saisis.
//
// Retour :
// - vrai si un hote existe et si le port appartient a la plage TCP valide.
// ----------------------------------------------------------------------------
export function isLanConnectionConfigurationValid(state: AppState): boolean {
  return (
    state.lanHost.trim().length > 0 &&
    Number.isInteger(state.lanPort) &&
    state.lanPort >= 1 &&
    state.lanPort <= 65_535
  );
}

// ----------------------------------------------------------------------------
// Synchronise le bouton de connexion pendant la saisie de l'adresse LAN.
//
// Parametres :
// - rootElement : racine DOM contenant le bouton eventuel.
// - state : etat courant de l'application.
//
// Effet de bord :
// - active ou desactive le bouton sans remplacer les champs de formulaire.
// ----------------------------------------------------------------------------
export function syncLanConnectionButton(rootElement: HTMLElement, state: AppState): void {
  const buttonElement = rootElement.querySelector<HTMLButtonElement>(
    LAN_CONNECTION_BUTTON_SELECTOR,
  );
  if (buttonElement === null) return;
  // Toute modification de cible invalide la session logique precedente.
  const connected = state.lastTransportUsed !== null;
  buttonElement.dataset.action = connected ? "disconnect-lan" : "connect-lan";
  buttonElement.textContent = connected ? "Déconnexion" : "Connexion";
  buttonElement.disabled = state.isBusy || (!connected && !isLanConnectionConfigurationValid(state));
}
