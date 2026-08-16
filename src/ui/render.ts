// ============================================================================
// UiRender - Implementation du rendu de la coquille
// ----------------------------------------------------------------------------
// Ce fichier met a jour le DOM pour afficher l'etat courant. Il ne realise
// aucun appel Particle Cloud et ne construit aucune commande firmware.
// ============================================================================

import type { AppState } from "./state";

// ----------------------------------------------------------------------------
// Rend la coquille initiale de L3D Studio.
//
// Parametres :
// - rootElement : element DOM qui recoit l'application.
// - state : etat applicatif a afficher.
//
// Effet de bord :
// - remplace le contenu HTML de `rootElement`.
// ----------------------------------------------------------------------------
export function renderShell(rootElement: HTMLElement, state: AppState): void {
  rootElement.innerHTML = `
    <section class="app-shell" aria-label="${state.applicationName}">
      <header class="app-header">
        <h1 class="app-title">${state.applicationName}</h1>
        <span class="app-status" data-role="connection-status">${state.connectionStatus}</span>
      </header>
      <div class="app-main">
        <section class="panel">
          <h2>Initialisation</h2>
          <p>La structure TypeScript est prete pour connecter Particle Cloud et le protocole SparkPixelsMega.</p>
          <button class="primary-action" type="button" data-action="noop">Verifier l'interface</button>
        </section>
      </div>
    </section>
  `;
}
