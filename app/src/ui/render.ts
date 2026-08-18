// ============================================================================
// UiRender - Implementation du rendu de l'application
// ----------------------------------------------------------------------------
// Ce fichier met a jour le DOM pour afficher l'etat courant. Il ne realise
// aucun appel Particle Cloud et ne construit aucune commande firmware.
// ============================================================================

import {
  canCallAdvancedFunction,
  canSendSetModeCommand,
  getSelectedDevice,
  getSelectedModeDefinition,
  hasAvailableConfiguredTransport,
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
        ${renderTransportPanel(state)}
        ${state.session === null ? renderLoginPanel(state) : renderDevicePanel(state)}
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
// Rend la configuration du transport et du serveur local.
//
// Parametres :
// - state : etat applicatif contenant la preference et l'adresse LAN.
//
// Retour :
// - fragment HTML utilisable avec ou sans session Particle.
// ----------------------------------------------------------------------------
function renderTransportPanel(state: AppState): string {
  const actualTransport = state.lastTransportUsed ?? "Aucun";
  const lanDisabled = state.lanHost.trim().length === 0 || state.isBusy;
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Transport du cube</h2>
        <span class="status-pill">Dernier : ${escapeHtml(actualTransport)}</span>
      </div>
      <div class="form-grid">
        <label>
          Transport
          <select data-field="transport-preference">
            <option value="automatic" ${state.transportPreference === "automatic" ? "selected" : ""}>Automatique</option>
            <option value="lan" ${state.transportPreference === "lan" ? "selected" : ""}>LAN</option>
            <option value="particle" ${state.transportPreference === "particle" ? "selected" : ""}>Particle</option>
          </select>
        </label>
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
    ${renderAdvancedPanel(state)}
    ${renderDiagnosticsPanel(state)}
    ${renderDeviceInfoPanel(state)}
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
  `;
}

// ----------------------------------------------------------------------------
// Rend les controles et KPI instantanes de diagnostics.
//
// Parametres :
// - state : etat applicatif et dernier echantillon valide.
//
// Retour :
// - panneau distinct des informations Particle historiques.
// ----------------------------------------------------------------------------
function renderDiagnosticsPanel(state: AppState): string {
  const diagnosticsState = state.diagnostics;
  const disabled = state.isBusy || !hasAvailableConfiguredTransport(state) ? "disabled" : "";
  return `
    <section class="panel diagnostics-panel">
      <div class="panel-heading">
        <h2>Diagnostics</h2>
        <button class="secondary-action" data-action="refresh-diagnostics" type="button" ${disabled}>
          Actualiser maintenant
        </button>
        <button class="secondary-action danger-action" data-action="reset-diagnostics" type="button" ${disabled}>
          Remettre les minimums a zero
        </button>
      </div>
      <div class="form-grid diagnostics-controls">
        <label>
          <input data-field="diagnostics-enabled" type="checkbox" ${diagnosticsState.enabled ? "checked" : ""} ${disabled} />
          Surveillance periodique
        </label>
        <label>
          Intervalle
          <select data-field="diagnostics-interval" ${state.isBusy ? "disabled" : ""}>
            ${renderDiagnosticsIntervalOptions(diagnosticsState.intervalSeconds)}
          </select>
        </label>
      </div>
      ${renderDiagnosticsMessages(state)}
      ${renderDiagnosticsSample(state)}
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Rend les quatre intervalles de surveillance autorises.
//
// Parametres :
// - selectedInterval : intervalle actuellement choisi.
//
// Retour :
// - options HTML de 5, 10, 30 et 60 secondes.
// ----------------------------------------------------------------------------
function renderDiagnosticsIntervalOptions(selectedInterval: number): string {
  return [5, 10, 30, 60]
    .map((interval) => {
      const selected = interval === selectedInterval ? "selected" : "";
      return `<option value="${interval}" ${selected}>${interval} secondes</option>`;
    })
    .join("");
}

// ----------------------------------------------------------------------------
// Rend les alertes et le dernier echec sans supprimer les KPI valides.
//
// Parametres :
// - state : etat contenant messages et compteurs d'erreur.
//
// Retour :
// - messages HTML bornes ou chaine vide.
// ----------------------------------------------------------------------------
function renderDiagnosticsMessages(state: AppState): string {
  const warning = state.diagnostics.warningMessage;
  const error = state.diagnostics.lastError;
  return `
    ${warning === null ? "" : `<p class="diagnostics-warning">${escapeHtml(warning)}</p>`}
    ${
      error === null
        ? ""
        : `<p class="diagnostics-error">Dernier echec (${state.diagnostics.consecutiveErrors}) : ${escapeHtml(error)}</p>`
    }
  `;
}

// ----------------------------------------------------------------------------
// Rend le dernier echantillon de diagnostics dans ses unites d'affichage.
//
// Parametres :
// - state : etat contenant le dernier echantillon eventuel.
//
// Retour :
// - grille de KPI ou indication d'absence de lecture.
// ----------------------------------------------------------------------------
function renderDiagnosticsSample(state: AppState): string {
  const sample = state.diagnostics.latestSample;
  if (sample === null) return "<p>Aucun echantillon de diagnostics.</p>";
  const values = sample.diagnostics;
  const capturedAt = new Date(sample.capturedAtMilliseconds).toLocaleTimeString("fr-FR");
  return `
    <p>Dernier echantillon : ${escapeHtml(capturedAt)}, source ${sample.source}, latence ${sample.latencyMilliseconds.toFixed(0)} ms.</p>
    <dl class="metrics-grid diagnostics-metrics">
      <div><dt>Memoire libre</dt><dd>${formatMemory(values.freeMemory)}</dd></div>
      <div><dt>Minimum global</dt><dd>${formatMemory(values.minimumFreeMemory)}</dd></div>
      <div><dt>Minimum du mode</dt><dd>${formatMemory(values.modeMinimumFreeMemory)}</dd></div>
      <div><dt>Avant / apres frame</dt><dd>${formatMemory(values.frameMemoryBefore)} / ${formatMemory(values.frameMemoryAfter)}</dd></div>
      <div><dt>Frame derniere</dt><dd>${formatFrameMilliseconds(values.lastFrameMicros)}</dd></div>
      <div><dt>Frame moyenne</dt><dd>${formatFrameMilliseconds(values.averageFrameMicros)}</dd></div>
      <div><dt>Pire frame</dt><dd>${formatFrameMilliseconds(values.worstFrameMicros)}</dd></div>
      <div><dt>FPS moyen</dt><dd>${(values.fpsTimesTen / 10).toFixed(1)}</dd></div>
      <div><dt>Uptime</dt><dd>${values.uptimeSeconds} s</dd></div>
      <div><dt>Mode / frames</dt><dd>${values.modeId} / ${values.frameCount}</dd></div>
      <div><dt>Wi-Fi / Particle</dt><dd>${formatBooleanState(values.wifiReady)} / ${formatBooleanState(values.particleConnected)}</dd></div>
      <div><dt>Reset / OOM</dt><dd>${values.resetReason} / ${values.outOfMemoryCount}</dd></div>
    </dl>
    <p>Data Operations Particle estimees pour les diagnostics : ${state.diagnostics.estimatedParticleDataOperations}.</p>
  `;
}

// ----------------------------------------------------------------------------
// Formate une valeur memoire en octets et Kio.
//
// Parametres :
// - value : nombre d'octets brut du firmware.
//
// Retour :
// - representation double unite.
// ----------------------------------------------------------------------------
function formatMemory(value: number): string {
  return `${value} octets (${(value / 1024).toFixed(1)} Kio)`;
}

// ----------------------------------------------------------------------------
// Convertit des microsecondes firmware en millisecondes d'affichage.
//
// Parametres :
// - value : duree brute en microsecondes.
//
// Retour :
// - duree avec deux decimales.
// ----------------------------------------------------------------------------
function formatFrameMilliseconds(value: number): string {
  return `${(value / 1000).toFixed(2)} ms`;
}

// ----------------------------------------------------------------------------
// Formate un etat de connexion booleen.
//
// Parametres :
// - value : etat brut valide.
//
// Retour :
// - libelle lisible actif ou inactif.
// ----------------------------------------------------------------------------
function formatBooleanState(value: boolean): string {
  return value ? "actif" : "inactif";
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
// Rend les informations detaillees exposees par le firmware.
//
// Parametres :
// - state : etat applicatif a afficher.
//
// Retour :
// - fragment HTML des informations device.
// ----------------------------------------------------------------------------
function renderDeviceInfoPanel(state: AppState): string {
  if (state.deviceInfoEntries.length === 0) {
    return "";
  }

  const entries = state.deviceInfoEntries
    .map((entry) => {
      return `
        <div>
          <dt>${escapeHtml(entry.label)}</dt>
          <dd>${escapeHtml(entry.value)}</dd>
        </div>
      `;
    })
    .join("");

  return `
    <section class="panel metrics-panel">
      <h2>Device Info</h2>
      <dl class="metrics-grid">${entries}</dl>
    </section>
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
