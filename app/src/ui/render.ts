// ============================================================================
// UiRender - Implementation du rendu de l'application
// ----------------------------------------------------------------------------
// Ce fichier met a jour le DOM pour afficher l'etat courant. Il ne realise
// aucun appel Particle Cloud et ne construit aucune commande firmware.
// ============================================================================

import {
  canCallAdvancedFunction,
  canSendSetModeCommand,
  getSelectedModeDefinition,
  hasAvailableConfiguredTransport,
  type AppState,
} from "./state";
import { renderDiagnosticsPanel } from "./diagnostics_render";
import { isLanTestConfigurationValid } from "./lan_controls";
import { listStreamingAnimations } from "../streaming/registry";
import { renderBytecodePanel } from "./bytecode_render";

// Libelle affiche quand aucune valeur LAN n'est encore disponible.
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
        ${renderTransportPanel(state)}
        ${renderWorkspace(state)}
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
    </header>
  `;
}

// ----------------------------------------------------------------------------
// Rend la configuration du transport et du serveur local.
//
// Parametres :
// - state : etat applicatif contenant l'adresse LAN.
//
// Retour :
// - fragment HTML de configuration locale.
// ----------------------------------------------------------------------------
function renderTransportPanel(state: AppState): string {
  const actualTransport = state.lastTransportUsed ?? "Aucun";
  const lanDisabled = !isLanTestConfigurationValid(state) || state.isBusy;
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Transport du cube</h2>
        <span class="status-pill">Dernier : ${escapeHtml(actualTransport)}</span>
      </div>
      <div class="form-grid">
        <label>
          Adresse ou nom local du Photon
          <input data-field="lan-host" inputmode="url" placeholder="photon.local ou 192.168.1.50" value="${escapeHtml(state.lanHost)}" />
        </label>
        <label>
          Port LAN
          <input data-field="lan-port" max="65535" min="1" type="number" value="${state.lanPort}" />
        </label>
        <button class="secondary-action" data-action="test-lan" type="button" ${lanDisabled ? "disabled" : ""}>
          Tester le LAN
        </button>
        <button class="primary-action" data-action="load-firmware-state" type="button" ${state.isBusy || !hasAvailableConfiguredTransport(state) ? "disabled" : ""}>
          Lire le cube
        </button>
      </div>
      ${state.lanTestStatus === null ? "" : `<p>${escapeHtml(state.lanTestStatus)}</p>`}
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
    ${renderFirmwareStatePanel(state)}
    ${renderModePanel(state)}
    ${renderStreamingPanel(state)}
    ${renderBytecodePanel(state)}
    ${renderAdvancedPanel(state)}
    ${renderDiagnosticsPanel(state)}
    ${renderResponsePanel(state)}
  `;
}

// ----------------------------------------------------------------------------
// Rend le controle dedie au streaming d'animations calculees dans le navigateur.
//
// Parametres :
// - state : etat de cadence et compteurs de la session courante.
//
// Retour :
// - panneau HTML autonome reutilisant l'adresse LAN generale.
// ----------------------------------------------------------------------------
function renderStreamingPanel(state: AppState): string {
  const lanConfigured = state.lanHost.trim().length > 0 && Number.isInteger(state.lanPort);
  const animationWorkspaceSelected = state.streaming.workspace === "animations";
  let animationOptions = "";
  for (const animation of listStreamingAnimations()) {
    animationOptions += renderStreamingAnimationOption(
      animation.id,
      animation.label,
      state.streaming.selectedAnimationId,
    );
  }
  return `
    <section class="panel streaming-panel" data-streaming-panel>
      <div class="panel-heading">
        <h2>Streaming web</h2>
        <span class="status-pill" data-streaming-status>${escapeHtml(state.streaming.statusMessage)}</span>
      </div>
      <p>
        ${animationWorkspaceSelected
          ? "L'animation est calculée par cette page puis envoyée directement au Photon sur le LAN. Garde l'application locale ouverte pendant la lecture."
          : "Dessine dans les couches du cube puis affiche l'image par le serveur LAN. Le brouillon reste conservé dans ce navigateur."}
      </p>
      <div class="streaming-workspace-tabs" role="tablist" aria-label="Atelier web">
        <button class="streaming-workspace-tab ${animationWorkspaceSelected ? "is-active" : ""}" data-action="show-streaming-animations" type="button" role="tab" aria-selected="${animationWorkspaceSelected}">Animations</button>
        <button class="streaming-workspace-tab ${animationWorkspaceSelected ? "" : "is-active"}" data-action="show-streaming-painting" type="button" role="tab" aria-selected="${!animationWorkspaceSelected}">Peinture</button>
      </div>
      ${animationWorkspaceSelected
        ? renderAnimationStreamingControls(state, animationOptions, lanConfigured)
        : renderPaintingControls(state, lanConfigured)}
      <div class="streaming-preview-tabs" role="tablist" aria-label="Représentation du cube">
        <button class="streaming-preview-tab is-active" data-streaming-preview-mode="3d" type="button" role="tab" aria-selected="true">Vue 3D</button>
        <button class="streaming-preview-tab" data-streaming-preview-mode="layers" type="button" role="tab" aria-selected="false" tabindex="-1">Couches z</button>
      </div>
      <canvas class="streaming-preview ${animationWorkspaceSelected ? "" : "is-painting"}" data-streaming-preview role="tabpanel" aria-label="Aperçu 3D rotatif du cube"></canvas>
      <p class="field-help">Destination : ${escapeHtml(state.lanHost || "adresse LAN non configurée")}:${state.lanPort}</p>
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Rend les reglages et statistiques du streaming anime.
//
// Parametres :
// - state : etat de cadence, luminosite et activite.
// - animationOptions : options deja echappees du registre.
// - lanConfigured : vrai lorsque le bouton peut ouvrir une session.
//
// Retour :
// - controles HTML propres aux animations web.
// ----------------------------------------------------------------------------
function renderAnimationStreamingControls(
  state: AppState,
  animationOptions: string,
  lanConfigured: boolean,
): string {
  return `
      <div class="form-grid streaming-controls">
        <label>
          Animation
          <select data-field="streaming-animation">
            ${animationOptions}
          </select>
        </label>
        <label>
          Cadence cible
          <input data-field="streaming-fps" type="range" min="10" max="30" step="1" value="${state.streaming.targetFps}">
          <span class="streaming-slider-value" data-range-output data-range-suffix=" FPS" data-streaming-fps-value>${state.streaming.targetFps} FPS</span>
        </label>
        <label>
          Vitesse
          <input data-field="streaming-speed" type="range" min="1" max="30" step="1" value="${state.streaming.movementStepsPerSecond}">
          <span class="streaming-slider-value" data-range-output data-range-suffix=" /s" data-streaming-speed-value>${state.streaming.movementStepsPerSecond} /s</span>
        </label>
        <label>
          Luminosité
          <input data-field="streaming-brightness" type="range" min="1" max="100" step="1" value="${state.streaming.brightnessPercent}">
          <span class="streaming-slider-value" data-range-output data-range-suffix=" %" data-streaming-brightness-value>${state.streaming.brightnessPercent} %</span>
        </label>
        <button class="${state.streaming.active ? "secondary-action" : "primary-action"}" data-action="${state.streaming.active ? "stop-streaming" : "start-streaming"}" data-streaming-toggle type="button" ${state.isBusy || (!state.streaming.active && !lanConfigured) ? "disabled" : ""}>
          ${state.streaming.active ? "Arrêter" : "Démarrer"}
        </button>
      </div>
      <div class="streaming-stats" aria-live="polite">
        <span>Cible : ${state.streaming.targetFps} FPS</span>
        <span>Mesurée : <strong data-streaming-measured>${state.streaming.measuredFps.toFixed(1)}</strong> FPS</span>
        <span>Envoyées : <strong data-streaming-sent>${state.streaming.sentFrames}</strong></span>
        <span title="Frames calculées mais non envoyées car un POST était déjà actif">Ignorées : <strong data-streaming-dropped>${state.streaming.droppedFrames}</strong></span>
      </div>
      <p class="field-help">Une frame ignorée n'a pas été perdue sur le réseau : elle n'est volontairement pas envoyée si la précédente est encore en cours.</p>
  `;
}

// ----------------------------------------------------------------------------
// Rend les quatre outils essentiels du peintre de voxels.
//
// Parametres :
// - state : couleur, outil et activite de la session partagee.
// - lanConfigured : vrai lorsque le bouton peut joindre le Photon.
//
// Retour :
// - controles HTML propres a la peinture.
// ----------------------------------------------------------------------------
function renderPaintingControls(state: AppState, lanConfigured: boolean): string {
  return `
      <div class="painting-controls">
        <label>
          Couleur
          <input data-field="painter-color" type="color" value="${escapeHtml(state.streaming.painterColor)}">
        </label>
        <div class="painting-tools" role="group" aria-label="Outil de peinture">
          <button class="secondary-action ${state.streaming.painterTool === "draw" ? "is-selected" : ""}" data-action="painter-tool-draw" type="button" aria-pressed="${state.streaming.painterTool === "draw"}">Crayon</button>
          <button class="secondary-action ${state.streaming.painterTool === "erase" ? "is-selected" : ""}" data-action="painter-tool-erase" type="button" aria-pressed="${state.streaming.painterTool === "erase"}">Gomme</button>
          <button class="secondary-action danger-action" data-action="clear-painter" type="button">Tout effacer</button>
        </div>
        <button class="${state.streaming.active ? "secondary-action" : "primary-action"}" data-action="${state.streaming.active ? "stop-streaming" : "start-streaming"}" data-streaming-toggle type="button" ${state.isBusy || (!state.streaming.active && !lanConfigured) ? "disabled" : ""}>
          ${state.streaming.active ? "Arrêter" : "Afficher sur le cube"}
        </button>
      </div>
      <p class="field-help">Peins par clic-glisser dans l'onglet Couches z. L'image affichée reste sur le cube sans envoi périodique.</p>
  `;
}

// ----------------------------------------------------------------------------
// Rend une option du registre en echappant ses donnees visibles.
//
// Parametres :
// - animationId : valeur stable envoyee par le selecteur.
// - label : libelle destine a l'utilisateur.
// - selectedAnimationId : identifiant actuellement selectionne.
//
// Retour :
// - option HTML prete a etre inseree dans le panneau de streaming.
// ----------------------------------------------------------------------------
function renderStreamingAnimationOption(
  animationId: string,
  label: string,
  selectedAnimationId: string,
): string {
  return `
    <option value="${escapeHtml(animationId)}" ${animationId === selectedAnimationId ? "selected" : ""}>
      ${escapeHtml(label)}
    </option>
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
        <div>
          <dt>Wi-Fi RSSI</dt>
          <dd>${state.wifiRssi === null ? EMPTY_VALUE_LABEL : `${state.wifiRssi} dBm`}</dd>
        </div>
      </dl>
      ${
        state.debugMessage === null
          ? ""
          : `<p class="status-message">${escapeHtml(state.debugMessage)}</p>`
      }
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
        <span data-range-output data-range-suffix="%">${state.currentBrightnessPercent}%</span>
      </label>
      <label>
        Vitesse
        <input data-field="speed" max="8" min="0" type="range" value="${state.currentSpeedIndex}" />
        <span data-range-output>${state.currentSpeedIndex}</span>
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
// Rend le panneau de fonctions avancees du firmware.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML du panneau avance.
// ----------------------------------------------------------------------------
function renderAdvancedPanel(state: AppState): string {
  return `
    <section class="panel">
      <h2>Fonctions firmware</h2>
      ${renderAuxSwitchControls(state)}
      ${renderPersistentTextControls(state)}
      ${renderFnRouterControls(state)}
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Rend les interrupteurs auxiliaires globaux.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML des interrupteurs auxiliaires.
// ----------------------------------------------------------------------------
function renderAuxSwitchControls(state: AppState): string {
  if (state.auxSwitches.length === 0) {
    return "<p>Lis le cube pour charger les interrupteurs globaux.</p>";
  }

  const controls = state.auxSwitches
    .map((auxSwitch) => {
      const checked = auxSwitch.enabled ? "checked" : "";
      const currentLabel = auxSwitch.enabled ? auxSwitch.onName : auxSwitch.offName;

      return `
        <label class="inline-control">
          <input data-field="aux-switch" data-index="${auxSwitch.id}" type="checkbox" ${checked} ${canCallAdvancedFunction(state) ? "" : "disabled"} />
          <span>${escapeHtml(auxSwitch.title)} : ${escapeHtml(currentLabel)}</span>
        </label>
      `;
    })
    .join("");

  return `<fieldset><legend>Switches globaux</legend><div class="control-grid">${controls}</div></fieldset>`;
}

// ----------------------------------------------------------------------------
// Rend le controle du texte persistant firmware.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML du controle SetText.
// ----------------------------------------------------------------------------
function renderPersistentTextControls(state: AppState): string {
  return `
    <fieldset>
      <legend>Texte persistant</legend>
      <div class="form-grid">
        <label>
          Message
          <input data-field="persistent-text" maxlength="63" type="text" value="${escapeHtml(state.persistentTextValue)}" />
        </label>
        <button class="secondary-action" type="button" data-action="send-set-text" ${canCallAdvancedFunction(state) ? "" : "disabled"}>
          Envoyer SetText
        </button>
      </div>
    </fieldset>
  `;
}

// ----------------------------------------------------------------------------
// Rend les commandes generales routees par `FnRouter`.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML des commandes FnRouter.
// ----------------------------------------------------------------------------
function renderFnRouterControls(state: AppState): string {
  const disabled = canCallAdvancedFunction(state) ? "" : "disabled";

  return `
    <fieldset>
      <legend>FnRouter</legend>
      <div class="form-grid">
        <label>
          Fuseau horaire
          <input data-field="timezone-offset" max="14" min="-12" step="1" type="number" value="${state.timezoneOffset}" />
        </label>
        <button class="secondary-action" type="button" data-action="set-timezone" ${disabled}>
          Appliquer
        </button>
        <label>
          Couleur a lire
          <input data-field="color-query-index" max="6" min="1" step="1" type="number" value="${state.colorQueryIndex}" />
        </label>
        <button class="secondary-action" type="button" data-action="get-color" ${disabled}>
          Lire couleur
        </button>
        <label>
          Switch local a lire
          <input data-field="switch-query-index" max="4" min="1" step="1" type="number" value="${state.switchQueryIndex}" />
        </label>
        <button class="secondary-action" type="button" data-action="get-switch-state" ${disabled}>
          Lire switch
        </button>
        <button class="secondary-action danger-action" type="button" data-action="reboot-device" ${disabled}>
          Redemarrer
        </button>
      </div>
    </fieldset>
  `;
}

// ----------------------------------------------------------------------------
// Rend le panneau de derniere reponse LAN.
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

  if (!hasAvailableConfiguredTransport(state)) {
    return '<p class="status-message">Configure l adresse LAN du Photon avant d envoyer une commande.</p>';
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
