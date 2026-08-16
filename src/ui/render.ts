// ============================================================================
// UiRender - Implementation du rendu de l'application
// ----------------------------------------------------------------------------
// Ce fichier met a jour le DOM pour afficher l'etat courant. Il ne realise
// aucun appel Particle Cloud et ne construit aucune commande firmware.
// ============================================================================

import {
  canSendSetModeCommand,
  getSelectedDevice,
  getSelectedModeDefinition,
  isSelectedDeviceOnline,
  type AppState,
} from "./state";

// Libelle affiche quand aucune valeur Particle n'est encore disponible.
const EMPTY_VALUE_LABEL = "Non lu";

// Nombre de couleurs maximum expose par les controles MVP.
const MAX_RENDERED_COLOR_INPUTS = 6;

// ----------------------------------------------------------------------------
// Rend l'application L3D Studio complete.
//
// Parametres :
// - rootElement : element DOM qui recoit l'application.
// - state : etat applicatif a afficher.
//
// Effet de bord :
// - remplace le contenu HTML de `rootElement`.
// ----------------------------------------------------------------------------
export function renderApp(rootElement: HTMLElement, state: AppState): void {
  rootElement.innerHTML = `
    <section class="app-shell" aria-label="${escapeHtml(state.applicationName)}">
      ${renderHeader(state)}
      <div class="app-main">
        ${state.session === null ? renderLoginPanel(state) : renderWorkspace(state)}
      </div>
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Rend l'en-tete global de l'application.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML de l'en-tete.
// ----------------------------------------------------------------------------
function renderHeader(state: AppState): string {
  return `
    <header class="app-header">
      <div>
        <h1 class="app-title">${escapeHtml(state.applicationName)}</h1>
        <span class="app-status">${escapeHtml(state.connectionStatus)}</span>
      </div>
      ${
        state.session === null
          ? ""
          : '<button class="secondary-action" type="button" data-action="logout">Deconnexion</button>'
      }
    </header>
  `;
}

// ----------------------------------------------------------------------------
// Rend le panneau de connexion Particle.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML du formulaire de connexion.
// ----------------------------------------------------------------------------
function renderLoginPanel(state: AppState): string {
  return `
    <section class="panel">
      <h2>Connexion Particle</h2>
      <form class="form-grid" data-form="login">
        <label>
          Email Particle
          <input autocomplete="username" name="email" required type="email" />
        </label>
        <label>
          Mot de passe
          <input autocomplete="current-password" name="password" required type="password" />
        </label>
        <button class="primary-action" type="submit" ${state.isBusy ? "disabled" : ""}>
          ${state.isBusy ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      ${renderStatusMessage(state)}
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Rend l'espace principal apres authentification.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML de l'espace de travail.
// ----------------------------------------------------------------------------
function renderWorkspace(state: AppState): string {
  return `
    ${renderDevicePanel(state)}
    ${renderFirmwareStatePanel(state)}
    ${renderModePanel(state)}
    ${renderResponsePanel(state)}
  `;
}

// ----------------------------------------------------------------------------
// Rend le panneau de selection du device Particle.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML du panneau devices.
// ----------------------------------------------------------------------------
function renderDevicePanel(state: AppState): string {
  const selectedDevice = getSelectedDevice(state);
  const onlineLabel = selectedDevice === null ? "Aucun device" : isSelectedDeviceOnline(state) ? "Online" : "Offline";

  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Device Particle</h2>
        <span class="status-pill ${isSelectedDeviceOnline(state) ? "is-online" : "is-offline"}">${onlineLabel}</span>
        <button class="secondary-action" type="button" data-action="refresh-devices" ${state.isBusy ? "disabled" : ""}>
          Rafraichir
        </button>
      </div>
      ${
        state.devices.length === 0
          ? "<p>Aucun device charge. Utilise le bouton de rafraichissement.</p>"
          : renderDeviceSelect(state)
      }
      ${renderStatusMessage(state)}
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Rend la liste deroulante des devices Particle.
//
// Parametres :
// - state : etat applicatif contenant les devices.
//
// Retour :
// - fragment HTML de selection device.
// ----------------------------------------------------------------------------
function renderDeviceSelect(state: AppState): string {
  const options = state.devices
    .map((device) => {
      const selected = device.id === state.selectedDeviceId ? "selected" : "";
      const status = device.connected || device.online === true ? "online" : "offline";

      return `<option value="${escapeHtml(device.id)}" ${selected}>${escapeHtml(device.name)} (${status})</option>`;
    })
    .join("");

  return `
    <label>
      Photon
      <select data-field="device-id">
        ${options}
      </select>
    </label>
    <button class="primary-action" type="button" data-action="load-firmware-state" ${state.isBusy || !isSelectedDeviceOnline(state) ? "disabled" : ""}>
      Lire le cube
    </button>
  `;
}

// ----------------------------------------------------------------------------
// Rend le panneau d'etat courant du firmware.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML du panneau d'etat.
// ----------------------------------------------------------------------------
function renderFirmwareStatePanel(state: AppState): string {
  return `
    <section class="panel metrics-panel">
      <h2>Etat du cube</h2>
      <dl class="metrics-grid">
        <div>
          <dt>Mode courant</dt>
          <dd>${escapeHtml(state.currentModeName ?? EMPTY_VALUE_LABEL)}</dd>
        </div>
        <div>
          <dt>Luminosite</dt>
          <dd>${state.currentBrightnessPercent}%</dd>
        </div>
        <div>
          <dt>Vitesse</dt>
          <dd>${state.currentSpeedIndex}</dd>
        </div>
      </dl>
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Rend le panneau de choix et configuration du mode.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML du panneau de mode.
// ----------------------------------------------------------------------------
function renderModePanel(state: AppState): string {
  const selectedMode = getSelectedModeDefinition(state);

  return `
    <section class="panel">
      <h2>Commande SetMode</h2>
      ${
        state.modes.length === 0
          ? "<p>Lis d'abord le cube pour charger les modes exposes par le firmware.</p>"
          : renderModeControls(state)
      }
      ${selectedMode === null ? "" : renderDynamicModeControls(state)}
      ${renderCommandReadiness(state)}
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Rend les controles communs a tous les modes.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML des controles communs.
// ----------------------------------------------------------------------------
function renderModeControls(state: AppState): string {
  const options = state.modes
    .map((mode) => {
      const selected = mode.name === state.selectedModeName ? "selected" : "";

      return `<option value="${escapeHtml(mode.name)}" ${selected}>${escapeHtml(mode.name)}</option>`;
    })
    .join("");

  return `
    <div class="form-grid">
      <label>
        Animation
        <select data-field="mode-name">
          ${options}
        </select>
      </label>
      <label>
        Luminosite
        <input data-field="brightness" max="100" min="0" type="range" value="${state.currentBrightnessPercent}" />
        <span>${state.currentBrightnessPercent}%</span>
      </label>
      <label>
        Vitesse
        <input data-field="speed" max="8" min="0" type="range" value="${state.currentSpeedIndex}" />
        <span>${state.currentSpeedIndex}</span>
      </label>
      <button class="primary-action" type="button" data-action="send-set-mode" ${canSendSetModeCommand(state) ? "" : "disabled"}>
        Envoyer
      </button>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// Rend les controles dependant du mode selectionne.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML des controles dynamiques.
// ----------------------------------------------------------------------------
function renderDynamicModeControls(state: AppState): string {
  const selectedMode = getSelectedModeDefinition(state);

  if (selectedMode === null) {
    return "";
  }

  return `
    <div class="mode-options">
      ${renderColorControls(state, selectedMode.parameters.colorCount)}
      ${renderSwitchControls(state, selectedMode.parameters.switchLabels)}
      ${selectedMode.parameters.acceptsText ? renderTextControl(state) : ""}
    </div>
  `;
}

// ----------------------------------------------------------------------------
// Rend les controles de couleurs requis par un mode.
//
// Parametres :
// - state : etat applicatif a afficher.
// - colorCount : nombre de couleurs attendues par le mode.
//
// Retour :
// - fragment HTML des controles couleur.
// ----------------------------------------------------------------------------
function renderColorControls(state: AppState, colorCount: number): string {
  if (colorCount === 0) {
    return "";
  }

  const inputs = Array.from({ length: Math.min(colorCount, MAX_RENDERED_COLOR_INPUTS) }, (_, index) => {
    const colorValue = state.colorValues[index] ?? "FFFFFF";

    return `
      <label>
        Couleur ${index + 1}
        <input data-field="color" data-index="${index}" type="color" value="#${escapeHtml(colorValue)}" />
      </label>
    `;
  }).join("");

  return `<fieldset><legend>Couleurs</legend><div class="control-grid">${inputs}</div></fieldset>`;
}

// ----------------------------------------------------------------------------
// Rend les switches locaux requis par un mode.
//
// Parametres :
// - state : etat applicatif a afficher.
// - switchLabels : libelles de switches publies par le firmware.
//
// Retour :
// - fragment HTML des controles switch.
// ----------------------------------------------------------------------------
function renderSwitchControls(state: AppState, switchLabels: string[]): string {
  if (switchLabels.length === 0) {
    return "";
  }

  const inputs = switchLabels
    .map((label, index) => {
      const checked = state.switchValues[index] === true ? "checked" : "";

      return `
        <label class="inline-control">
          <input data-field="switch" data-index="${index}" type="checkbox" ${checked} />
          ${escapeHtml(label.length === 0 ? `Switch ${index + 1}` : label)}
        </label>
      `;
    })
    .join("");

  return `<fieldset><legend>Switches</legend><div class="control-grid">${inputs}</div></fieldset>`;
}

// ----------------------------------------------------------------------------
// Rend le champ texte pour les modes compatibles.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML du controle texte.
// ----------------------------------------------------------------------------
function renderTextControl(state: AppState): string {
  return `
    <label>
      Texte
      <input data-field="text" maxlength="63" type="text" value="${escapeHtml(state.textValue)}" />
    </label>
  `;
}

// ----------------------------------------------------------------------------
// Rend le panneau de derniere reponse Particle.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML de la derniere reponse.
// ----------------------------------------------------------------------------
function renderResponsePanel(state: AppState): string {
  if (state.lastResponse === null) {
    return "";
  }

  return `
    <section class="panel">
      <h2>Derniere reponse</h2>
      <pre class="response-output">${escapeHtml(state.lastResponse)}</pre>
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Rend le message de statut courant.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML du message de statut.
// ----------------------------------------------------------------------------
function renderStatusMessage(state: AppState): string {
  return `<p class="status-message">${escapeHtml(state.statusMessage)}</p>`;
}

// ----------------------------------------------------------------------------
// Rend la raison qui empeche ou autorise l'envoi de commande.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML de diagnostic de commande.
// ----------------------------------------------------------------------------
function renderCommandReadiness(state: AppState): string {
  if (state.modes.length === 0) {
    return "";
  }

  if (canSendSetModeCommand(state)) {
    return '<p class="status-message">Commande prete a envoyer.</p>';
  }

  if (state.selectedDeviceId === null) {
    return '<p class="status-message">Selectionne un device Particle avant d envoyer une commande.</p>';
  }

  if (!isSelectedDeviceOnline(state)) {
    return '<p class="status-message">Le Photon selectionne est offline. Reconnecte-le avant d envoyer une commande.</p>';
  }

  if (getSelectedModeDefinition(state) === null) {
    return '<p class="status-message">Selectionne un mode charge depuis le firmware.</p>';
  }

  return '<p class="status-message">Une action est deja en cours.</p>';
}

// ----------------------------------------------------------------------------
// Echappe une valeur avant insertion dans un fragment HTML.
//
// Parametres :
// - value : valeur a echapper.
//
// Retour :
// - chaine protegee pour une insertion HTML.
// ----------------------------------------------------------------------------
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
