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
  type AppWorkspace,
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

// Description d'une destination de la navigation principale.
interface WorkspaceDefinition {
  id: AppWorkspace;
  label: string;
  mobileLabel: string;
  description: string;
}

// Catalogue ordonne des six espaces fonctionnels de l'application.
const WORKSPACE_DEFINITIONS: readonly WorkspaceDefinition[] = [
  { id: "cube", label: "Cube", mobileLabel: "Cube", description: "État général du cube" },
  { id: "animations", label: "Animations", mobileLabel: "Anim.", description: "Animations natives embarquées dans le Photon" },
  { id: "streaming", label: "Streaming", mobileLabel: "Stream", description: "Animations web et peinture" },
  { id: "procedural", label: "Procédural", mobileLabel: "Code", description: "Création et installation bytecode" },
  { id: "firmware", label: "Firmware", mobileLabel: "Firmware", description: "Réglages et commandes avancées" },
  { id: "diagnostics", label: "Diagnostics", mobileLabel: "Diag.", description: "Santé et performances du Photon" },
];

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
      ${renderDesktopSidebar(state)}
      <div class="app-frame">
        ${renderHeader(state)}
        ${state.connectionPanelOpen ? renderTransportPanel(state) : ""}
        <main class="app-main" id="workspace-content">
          ${renderWorkspace(state)}
        </main>
        ${renderMobileNavigation(state)}
      </div>
    </section>
  `;
}

// ----------------------------------------------------------------------------
// Rend la marque et la navigation persistante des ecrans larges.
//
// Parametres :
// - state : etat contenant l'espace selectionne.
//
// Retour :
// - barre laterale masquee sur les petits ecrans.
// ----------------------------------------------------------------------------
function renderDesktopSidebar(state: AppState): string {
  return `
    <aside class="app-sidebar" aria-label="Navigation principale">
      <div class="app-brand" aria-label="${escapeHtml(state.applicationName)}">
        <span class="app-brand-mark">L3D</span><span>Studio</span>
      </div>
      ${renderWorkspaceNavigation(state, "desktop")}
      <button class="sidebar-connection ${state.connectionPanelOpen ? "is-active" : ""}" data-action="toggle-connection" type="button" aria-controls="connection-panel" aria-expanded="${state.connectionPanelOpen}" aria-pressed="${state.connectionPanelOpen}">
        <span class="nav-symbol" aria-hidden="true">${renderConnectionIcon()}</span>
        <span>Connexion</span>
      </button>
    </aside>
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
  // Textes de l'espace actif affiches comme titre de page.
  const workspace = getWorkspaceDefinition(state.activeWorkspace);
  // Destination compacte visible sans ouvrir la configuration.
  const destination = state.lanHost.trim().length === 0
    ? "Photon non configuré"
    : `${state.lanHost}:${state.lanPort}`;
  // Indicateur visuel derive d'un test ou d'un transport deja utilise.
  const connected = state.lastTransportUsed !== null || state.lanTestStatus?.includes("réussi") === true;
  // Libelle coherent meme lorsqu'une lecture reussit avant le test explicite.
  const connectionLabel = connected ? "LAN connecté" : state.connectionStatus;
  return `
    <header class="app-header">
      <div class="app-header-copy">
        <h1 class="app-title">${escapeHtml(workspace.label)}</h1>
        <span class="app-status">${escapeHtml(workspace.description)}</span>
      </div>
      <button class="connection-summary ${connected ? "is-connected" : ""} ${state.connectionPanelOpen ? "is-active" : ""}" data-action="toggle-connection" type="button" aria-controls="connection-panel" aria-expanded="${state.connectionPanelOpen}">
        <span class="connection-dot" aria-hidden="true"></span>
        <span class="connection-summary-copy">
          <strong>${escapeHtml(connectionLabel)}</strong>
          <small>${escapeHtml(destination)}</small>
        </span>
      </button>
      <p class="global-status" role="status">${escapeHtml(state.statusMessage)}</p>
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
    <section class="panel connection-panel" id="connection-panel" aria-label="Configuration de la connexion LAN">
      <div class="panel-heading">
        <h2>Transport du cube</h2>
        <div class="button-row">
          <span class="status-pill">Dernier : ${escapeHtml(actualTransport)}</span>
          <button class="icon-action" data-action="toggle-connection" type="button" aria-label="Fermer la configuration LAN">×</button>
        </div>
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
  if (state.activeWorkspace === "animations") return renderAnimationsWorkspace(state);
  if (state.activeWorkspace === "streaming") return renderStreamingPanel(state);
  if (state.activeWorkspace === "procedural") return renderBytecodePanel(state);
  if (state.activeWorkspace === "firmware") return renderFirmwareWorkspace(state);
  if (state.activeWorkspace === "diagnostics") return renderDiagnosticsPanel(state);
  return renderCubeWorkspace(state);
}

// ----------------------------------------------------------------------------
// Regroupe les informations générales du cube.
//
// Parametres :
// - state : etat courant lu depuis le firmware.
//
// Retour :
// - espace Cube limite aux indicateurs généraux.
// ----------------------------------------------------------------------------
function renderCubeWorkspace(state: AppState): string {
  return `
    <div class="workspace-stack cube-workspace">
      ${renderFirmwareStatePanel(state)}
    </div>
  `;
}

// ----------------------------------------------------------------------------
// Regroupe les animations natives et tous leurs parametres dynamiques.
//
// Parametres :
// - state : catalogue des modes et valeurs du formulaire SetMode.
//
// Retour :
// - espace dedie aux animations calculees et embarquees dans le Photon.
// ----------------------------------------------------------------------------
function renderAnimationsWorkspace(state: AppState): string {
  return `
    <div class="workspace-stack animations-workspace">
      ${renderModePanel(state)}
      <p class="workspace-note">Ces animations sont embarquées et calculées directement par le Photon. Elles restent distinctes des animations web envoyées depuis l'onglet Streaming.</p>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// Regroupe les commandes avancees et la reponse brute du serveur.
//
// Parametres :
// - state : etat des fonctions firmware et de la derniere reponse.
//
// Retour :
// - espace Firmware autonome.
// ----------------------------------------------------------------------------
function renderFirmwareWorkspace(state: AppState): string {
  return `
    <div class="workspace-stack firmware-workspace">
      ${renderAdvancedPanel(state)}
      ${renderResponsePanel(state)}
    </div>
  `;
}

// ----------------------------------------------------------------------------
// Rend une navigation principale adaptee a son emplacement.
//
// Parametres :
// - state : etat contenant l'espace actif.
// - variant : barre laterale ou barre mobile.
//
// Retour :
// - navigation avec une action stable par espace.
// ----------------------------------------------------------------------------
function renderWorkspaceNavigation(state: AppState, variant: "desktop" | "mobile"): string {
  // Boutons ordonnes dont le libelle est raccourci uniquement sur mobile.
  const items = WORKSPACE_DEFINITIONS.map((workspace) => {
    // Etat selectionne partage par la classe et l'attribut ARIA.
    const selected = workspace.id === state.activeWorkspace;
    // Libelle abrege seulement lorsque la largeur est contrainte.
    const label = variant === "mobile" ? workspace.mobileLabel : workspace.label;
    return `
      <button class="workspace-nav-item ${selected ? "is-active" : ""}" data-action="show-workspace-${workspace.id}" type="button" aria-current="${selected ? "page" : "false"}">
        <span class="nav-symbol" aria-hidden="true">${renderWorkspaceIcon(workspace.id)}</span>
        <span>${escapeHtml(label)}</span>
      </button>
    `;
  }).join("");
  return `<nav class="workspace-navigation workspace-navigation-${variant}" aria-label="Espaces de travail">${items}</nav>`;
}

// ----------------------------------------------------------------------------
// Rend la navigation fixe utilisee sur telephone.
//
// Parametres :
// - state : etat contenant l'espace actif.
//
// Retour :
// - navigation basse masquee sur les ecrans larges.
// ----------------------------------------------------------------------------
function renderMobileNavigation(state: AppState): string {
  return renderWorkspaceNavigation(state, "mobile");
}

// ----------------------------------------------------------------------------
// Retrouve les textes d'un espace connu avec un repli sur Cube.
//
// Parametres :
// - workspaceId : identifiant courant potentiellement restaure du stockage.
//
// Retour :
// - definition toujours valide pour le rendu.
// ----------------------------------------------------------------------------
function getWorkspaceDefinition(workspaceId: AppWorkspace): WorkspaceDefinition {
  for (const workspace of WORKSPACE_DEFINITIONS) {
    if (workspace.id === workspaceId) return workspace;
  }
  return WORKSPACE_DEFINITIONS[0] as WorkspaceDefinition;
}

// ----------------------------------------------------------------------------
// Rend l'icone vectorielle associee a un espace principal.
//
// Parametres :
// - workspaceId : espace dont le pictogramme doit etre affiche.
//
// Retour :
// - SVG monochrome qui suit la couleur CSS du bouton.
// ----------------------------------------------------------------------------
function renderWorkspaceIcon(workspaceId: AppWorkspace): string {
  if (workspaceId === "cube") {
    return `<svg viewBox="0 0 24 24" focusable="false"><path d="M12 3 4.5 7.2v9.6L12 21l7.5-4.2V7.2L12 3Z M4.5 7.2 12 12l7.5-4.8 M12 12v9" /></svg>`;
  }
  if (workspaceId === "animations") {
    return `<svg viewBox="0 0 24 24" focusable="false"><path d="m9 7 8 5-8 5V7Z" /><path d="M4 4v16M20 4v16" /></svg>`;
  }
  if (workspaceId === "streaming") {
    return `<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="1.7" /><path d="M8.7 8.7a4.7 4.7 0 0 0 0 6.6M15.3 8.7a4.7 4.7 0 0 1 0 6.6M5.9 5.9a8.6 8.6 0 0 0 0 12.2M18.1 5.9a8.6 8.6 0 0 1 0 12.2" /></svg>`;
  }
  if (workspaceId === "procedural") {
    return `<svg viewBox="0 0 24 24" focusable="false"><path d="m8.5 6-6 6 6 6M15.5 6l6 6-6 6M14 3l-4 18" /></svg>`;
  }
  if (workspaceId === "firmware") {
    return `<svg viewBox="0 0 24 24" focusable="false"><rect x="6" y="6" width="12" height="12" rx="1.5" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></svg>`;
  }
  return `<svg viewBox="0 0 24 24" focusable="false"><path d="M2 13h4l2.4-7 4.2 13L16 10l2 3h4" /></svg>`;
}

// ----------------------------------------------------------------------------
// Rend l'icone vectorielle de la configuration LAN.
//
// Retour :
// - engrenage monochrome utilise dans la barre laterale.
// ----------------------------------------------------------------------------
function renderConnectionIcon(): string {
  return `<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3.1 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>`;
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
      <div class="streaming-stage">
        <div class="streaming-control-column">
          ${animationWorkspaceSelected
            ? renderAnimationStreamingControls(state, animationOptions, lanConfigured)
            : renderPaintingControls(state, lanConfigured)}
        </div>
        <div class="streaming-preview-column">
          <div class="streaming-preview-tabs" role="tablist" aria-label="Représentation du cube">
            <button class="streaming-preview-tab is-active" data-streaming-preview-mode="3d" type="button" role="tab" aria-selected="true">Vue 3D</button>
            <button class="streaming-preview-tab" data-streaming-preview-mode="layers" type="button" role="tab" aria-selected="false" tabindex="-1">Couches z</button>
          </div>
          <div class="streaming-preview-surface">
            <canvas class="streaming-preview ${animationWorkspaceSelected ? "" : "is-painting"}" data-streaming-preview role="tabpanel" aria-label="Aperçu 3D rotatif du cube"></canvas>
            <span class="streaming-preview-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            <button class="streaming-fullscreen-action" data-streaming-fullscreen type="button" aria-label="Afficher l'aperçu en plein écran" title="Plein écran">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" /></svg>
            </button>
          </div>
          <p class="field-help streaming-destination">Destination : ${escapeHtml(state.lanHost || "adresse LAN non configurée")}:${state.lanPort}</p>
        </div>
      </div>
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
          <span class="range-control">
            <input data-field="streaming-fps" type="range" min="10" max="30" step="1" value="${state.streaming.targetFps}">
            <span class="streaming-slider-value" data-range-output data-range-suffix=" FPS" data-streaming-fps-value>${state.streaming.targetFps} FPS</span>
          </span>
        </label>
        <label>
          Vitesse
          <span class="range-control">
            <input data-field="streaming-speed" type="range" min="1" max="30" step="1" value="${state.streaming.movementStepsPerSecond}">
            <span class="streaming-slider-value" data-range-output data-range-suffix=" /s" data-streaming-speed-value>${state.streaming.movementStepsPerSecond} /s</span>
          </span>
        </label>
        <label>
          Luminosité
          <span class="range-control">
            <input data-field="streaming-brightness" type="range" min="1" max="100" step="1" value="${state.streaming.brightnessPercent}">
            <span class="streaming-slider-value" data-range-output data-range-suffix=" %" data-streaming-brightness-value>${state.streaming.brightnessPercent} %</span>
          </span>
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
  // Categorie lisible du moteur qui produit actuellement le framebuffer.
  const playbackLabel = formatPlaybackKind(state.currentPlaybackKind);
  // Detail utile sous la categorie sans confondre Stream et Peinture.
  const playbackDetail = formatPlaybackDetail(state);
  // Statut synthetique derive uniquement des informations LAN disponibles.
  const cubeStatus = getCubeStatusPresentation(state);
  // Uptime des diagnostics plus recent, ou valeur de la derniere lecture sante.
  const uptimeSeconds = state.diagnostics.latestSample?.diagnostics.uptimeSeconds ??
    state.uptimeSeconds;
  return `
    <section class="panel metrics-panel cube-state-panel">
      <h2>État du cube</h2>
      <dl class="metrics-grid cube-state-grid">
        <div class="cube-state-card cube-state-mode">
          <dt class="cube-state-label"><span class="cube-state-icon" aria-hidden="true">${renderCubeMetricIcon("mode")}</span>Mode courant</dt>
          <dd class="cube-state-value">${escapeHtml(playbackLabel)}<small>${escapeHtml(playbackDetail)}</small></dd>
        </div>
        <div class="cube-state-card cube-state-brightness">
          <dt class="cube-state-label"><span class="cube-state-icon" aria-hidden="true">${renderCubeMetricIcon("brightness")}</span>Luminosité</dt>
          <dd class="cube-state-value">${state.currentBrightnessPercent}<small> %</small></dd>
        </div>
        <div class="cube-state-card cube-state-speed">
          <dt class="cube-state-label"><span class="cube-state-icon" aria-hidden="true">${renderCubeMetricIcon("speed")}</span>Vitesse</dt>
          <dd class="cube-state-value">${state.currentSpeedIndex}</dd>
        </div>
        <div class="cube-state-card cube-state-rssi">
          <dt class="cube-state-label"><span class="cube-state-icon" aria-hidden="true">${renderCubeMetricIcon("wifi")}</span>Wi-Fi RSSI</dt>
          <dd class="cube-state-value">${state.wifiRssi === null ? EMPTY_VALUE_LABEL : `${state.wifiRssi}`} ${state.wifiRssi === null ? "" : "<small>dBm</small>"}</dd>
        </div>
      </dl>
      <div class="cube-info-strip">
        <span class="cube-info-status ${cubeStatus.tone}"><i aria-hidden="true"></i><strong>Statut :</strong> ${escapeHtml(cubeStatus.label)}</span>
        <span><strong>Firmware</strong> ${escapeHtml(state.firmwareRevision ?? EMPTY_VALUE_LABEL)}</span>
        <span><strong>Uptime</strong> ${escapeHtml(formatUptime(uptimeSeconds))}</span>
      </div>
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
    <section class="panel mode-panel">
      <div class="panel-heading">
        <h2>Animation courante</h2>
        <span class="status-pill">SetMode</span>
      </div>
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
        <span class="range-control">
          <input data-field="brightness" max="100" min="0" type="range" value="${state.currentBrightnessPercent}" />
          <span data-range-output data-range-suffix="%">${state.currentBrightnessPercent}%</span>
        </span>
      </label>
      <label>
        Vitesse
        <span class="range-control">
          <input data-field="speed" max="8" min="0" type="range" value="${state.currentSpeedIndex}" />
          <span data-range-output>${state.currentSpeedIndex}</span>
        </span>
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
    <details class="mode-options-disclosure" open>
      <summary>
        <span>Couleurs, switches et texte</span>
        <small>${renderModeOptionsSummary(selectedMode.parameters.colorCount, selectedMode.parameters.switchLabels.length, selectedMode.parameters.acceptsText)}</small>
      </summary>
      <div class="mode-options">
        ${renderColorControls(state, selectedMode.parameters.colorCount)}
        ${renderSwitchControls(state, selectedMode.parameters.switchLabels)}
        ${selectedMode.parameters.acceptsText ? renderTextControl(state) : ""}
      </div>
    </details>
  `;
}

// ----------------------------------------------------------------------------
// Rend le pictogramme vectoriel d'un indicateur de l'etat du cube.
//
// Parametres :
// - metric : indicateur dont la silhouette et la couleur sont attendues.
//
// Retour :
// - SVG monochrome colore par la classe de sa carte.
// ----------------------------------------------------------------------------
function renderCubeMetricIcon(
  metric: "mode" | "brightness" | "speed" | "wifi",
): string {
  if (metric === "mode") {
    return `<svg viewBox="0 0 24 24"><path d="M8 4v16l10-8L8 4Z" /></svg>`;
  }
  if (metric === "brightness") {
    return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>`;
  }
  if (metric === "speed") {
    return `<svg viewBox="0 0 24 24"><path d="M3 12h4l2.2-7 4.1 14 2.4-7H21" /></svg>`;
  }
  return `<svg viewBox="0 0 24 24"><path d="M3.5 9.5a13 13 0 0 1 17 0M6.5 13a8.5 8.5 0 0 1 11 0M9.5 16.5a4 4 0 0 1 5 0" /><circle cx="12" cy="20" r="1" /></svg>`;
}

// ----------------------------------------------------------------------------
// Traduit le moteur LAN en categorie courte destinee a la carte Mode.
//
// Parametres :
// - playbackKind : moteur courant ou absence de lecture.
//
// Retour :
// - libelle francais stable.
// ----------------------------------------------------------------------------
function formatPlaybackKind(playbackKind: AppState["currentPlaybackKind"]): string {
  if (playbackKind === "native") return "Animation embarquée";
  if (playbackKind === "streaming") return "Streaming";
  if (playbackKind === "painting") return "Peinture";
  if (playbackKind === "procedural") return "Procédural";
  return EMPTY_VALUE_LABEL;
}

// ----------------------------------------------------------------------------
// Complete la categorie courante avec une information non ambigue.
//
// Parametres :
// - state : etat contenant le mode et le moteur lus sur le Photon.
//
// Retour :
// - nom natif ou description du flux externe.
// ----------------------------------------------------------------------------
function formatPlaybackDetail(state: AppState): string {
  if (state.currentPlaybackKind === "native") {
    return state.currentModeName ?? EMPTY_VALUE_LABEL;
  }
  if (state.currentPlaybackKind === "streaming") return "Flux web animé";
  if (state.currentPlaybackKind === "painting") return "Image fixe";
  if (state.currentPlaybackKind === "procedural") return "Programme bytecode";
  return "Aucune lecture";
}

// Presentation textuelle et chromatique du statut synthetique.
interface CubeStatusPresentation {
  label: string;
  tone: "is-ready" | "is-busy" | "is-warning" | "is-error" | "is-unknown";
}

// ----------------------------------------------------------------------------
// Derive un statut court depuis les lectures LAN sans inventer de telemetrie.
//
// Parametres :
// - state : etat courant, derniere commande et diagnostic eventuel.
//
// Retour :
// - libelle et classe de couleur du bandeau.
// ----------------------------------------------------------------------------
function getCubeStatusPresentation(state: AppState): CubeStatusPresentation {
  if (state.isBusy) return { label: "Commande en cours", tone: "is-busy" };
  // Diagnostic recent prioritaire sur la derniere lecture generale.
  const wifiReady = state.diagnostics.latestSample?.diagnostics.wifiReady ?? state.wifiReady;
  if (wifiReady === null) return { label: "Non lu", tone: "is-unknown" };
  if (!wifiReady) return { label: "Wi-Fi indisponible", tone: "is-warning" };
  if (state.lastCommandResult !== null && state.lastCommandResult < 0) {
    return { label: `Erreur ${state.lastCommandResult}`, tone: "is-error" };
  }
  return { label: "Prêt", tone: "is-ready" };
}

// ----------------------------------------------------------------------------
// Formate un uptime borne sous la forme jours puis heures, minutes et secondes.
//
// Parametres :
// - uptimeSeconds : duree brute recue du firmware ou absence de lecture.
//
// Retour :
// - valeur compacte adaptee au bandeau d'information.
// ----------------------------------------------------------------------------
function formatUptime(uptimeSeconds: number | null): string {
  if (uptimeSeconds === null) return EMPTY_VALUE_LABEL;
  // Nombre entier de jours revolus.
  const days = Math.floor(uptimeSeconds / 86_400);
  // Heures restantes apres retrait des jours.
  const hours = Math.floor((uptimeSeconds % 86_400) / 3_600);
  // Minutes restantes apres retrait des heures.
  const minutes = Math.floor((uptimeSeconds % 3_600) / 60);
  // Secondes restantes dans la minute courante.
  const seconds = uptimeSeconds % 60;
  // Horodatage zero-padde coherent avec la maquette.
  const clock = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return days > 0 ? `${days} j ${clock}` : clock;
}

// ----------------------------------------------------------------------------
// Resume les options variables du mode dans l'entete repliable.
//
// Parametres :
// - colorCount : nombre de couleurs declare par le firmware.
// - switchCount : nombre de switches propres au mode.
// - acceptsText : vrai lorsque le mode accepte un texte de 63 caracteres.
//
// Retour :
// - trois compteurs courts separes par des puces.
// ----------------------------------------------------------------------------
function renderModeOptionsSummary(
  colorCount: number,
  switchCount: number,
  acceptsText: boolean,
): string {
  return `${Math.min(colorCount, MAX_RENDERED_COLOR_INPUTS)} couleur(s) • ${switchCount} switch(es) • ${acceptsText ? "texte" : "sans texte"}`;
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
    <section class="panel firmware-panel">
      <div class="panel-heading">
        <h2>Fonctions firmware</h2>
        <span class="status-pill">Commandes LAN</span>
      </div>
      <p>Réglages persistants et commandes techniques du Photon.</p>
      <div class="firmware-grid">
        <div class="firmware-card">${renderAuxSwitchControls(state)}</div>
        <div class="firmware-card">${renderPersistentTextControls(state)}</div>
        <div class="firmware-card firmware-card-wide">${renderFnRouterControls(state)}</div>
      </div>
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
        <div class="danger-zone">
          <p><strong>Action système</strong><br>Le Photon sera momentanément inaccessible.</p>
          <button class="secondary-action danger-action" type="button" data-action="reboot-device" ${disabled}>
            Redémarrer le Photon
          </button>
        </div>
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
    <details class="panel response-panel">
      <summary>
        <span>Dernière réponse LAN</span>
        <span class="status-pill">Données brutes</span>
      </summary>
      <div class="panel-heading">
        <p>Réponse technique conservée pour le diagnostic.</p>
        <button class="secondary-action" data-action="copy-last-response" type="button">Copier</button>
      </div>
      <pre class="response-output">${escapeHtml(state.lastResponse)}</pre>
    </details>
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
