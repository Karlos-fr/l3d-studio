// ============================================================================
// UiEvents - Implementation des evenements applicatifs
// ----------------------------------------------------------------------------
// Ce fichier relie les interactions utilisateur aux transports et a
// SparkPixels. Il ne construit pas le HTML et ne stocke pas le mot de passe.
// ============================================================================

import { LanClientError, normalizeLanHost, normalizeLanPort } from "../lan/client";
import type { DiagnosticsMonitor } from "../diagnostics/monitor";
import {
  appendDiagnosticsSample,
  clearDiagnosticsHistory,
} from "../diagnostics/history";
import { resetDiagnosticsSample } from "../diagnostics/reader";
import type { DiagnosticsChartWindow } from "../diagnostics/types";
import {
  buildGetColorCommand,
  buildGetSwitchStateCommand,
  buildRebootCommand,
  buildSetAuxSwitchCommand,
  buildSetModeCommand,
  buildSetTimezoneCommand,
  convertFirmwareBrightnessToAppPercent,
  normalizeHexColor,
  validateSetText,
} from "../sparkpixels/protocol";
import {
  SparkPixelsCommandRefusedError,
} from "../transport/types";
import { saveAppPreferences, type AppPreferencesStorage } from "./preferences";
import {
  canCallAdvancedFunction,
  canSendSetModeCommand,
  getSelectedModeDefinition,
  type AppState,
} from "./state";
import { createTransportForState } from "./transport";
import { updateDiagnosticsView } from "./diagnostics_render";
import { syncLanConnectionButton } from "./lan_controls";
import { normalizeStreamingFps, type StreamingFps } from "../streaming/engine";
import type { PainterTool } from "../painting/model";
import { getStreamingLayerVoxelAtPoint } from "./streaming_render";
import type { AppWorkspace, StreamingWorkspace } from "./state";

export interface UiEventContext {
  rootElement: HTMLElement;
  state: AppState;
  diagnosticsMonitor: DiagnosticsMonitor;
  storage: AppPreferencesStorage;
  rerender: () => void;
  startStreaming: (targetFps: StreamingFps) => Promise<void>;
  selectStreamingAnimation: (animationId: string) => void;
  updateStreamingCadence: () => void;
  updateStreamingSettings: () => void;
  stopStreaming: (returnToOff?: boolean) => void;
  selectStreamingWorkspace: (workspace: StreamingWorkspace) => void;
  selectPainterTool: (tool: PainterTool) => void;
  paintStreamingVoxel: (x: number, y: number, z: number) => void;
  clearPainter: () => void;
  updatePainterGlobalBrightness: (persistChange: boolean) => void;
  exportCurrentPainterDrawing: () => void;
  importCurrentPainterDrawing: (file: File) => Promise<void>;
  handleBytecodeAction: (action: string) => Promise<void>;
  handleBytecodeField: (
    fieldElement: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    commitChange: boolean,
  ) => Promise<void>;
}

// Selecteur des boutons d'action declaratifs.
const ACTION_BUTTON_SELECTOR = "[data-action]";

// Nom de l'action unique qui valide le LAN puis lit l'etat du cube.
const CONNECT_LAN_ACTION = "connect-lan";

// Nom de l'action qui ferme la session logique locale sans couper le Photon.
const DISCONNECT_LAN_ACTION = "disconnect-lan";

// Nom de l'action qui force un echantillon de diagnostics.
const REFRESH_DIAGNOSTICS_ACTION = "refresh-diagnostics";

// Nom de l'action explicite qui remet les minimums a zero.
const RESET_DIAGNOSTICS_ACTION = "reset-diagnostics";

// Nom de l'action qui efface seulement l'historique utilise par les graphiques.
const CLEAR_DIAGNOSTICS_HISTORY_ACTION = "clear-diagnostics-history";

// Nom de l'action qui envoie la commande SetMode.
const SEND_SET_MODE_ACTION = "send-set-mode";

// Nom de l'action qui envoie le texte persistant du firmware.
const SEND_SET_TEXT_ACTION = "send-set-text";

// Nom de l'action qui applique le fuseau horaire via FnRouter.
const SET_TIMEZONE_ACTION = "set-timezone";

// Nom de l'action qui lit une couleur courante via FnRouter.
const GET_COLOR_ACTION = "get-color";

// Nom de l'action qui lit un switch local courant via FnRouter.
const GET_SWITCH_STATE_ACTION = "get-switch-state";

// Nom de l'action qui demande le redemarrage du Photon via FnRouter.
const REBOOT_DEVICE_ACTION = "reboot-device";

// Nom de l'action qui demarre l'animation web pilote.
const START_STREAMING_ACTION = "start-streaming";

// Nom de l'action qui arrete immediatement l'envoi des frames.
const STOP_STREAMING_ACTION = "stop-streaming";

// Nom de l'action qui affiche l'atelier des animations web.
const SHOW_STREAMING_ANIMATIONS_ACTION = "show-streaming-animations";

// Nom de l'action qui affiche l'atelier de peinture.
const SHOW_STREAMING_PAINTING_ACTION = "show-streaming-painting";

// Nom de l'action qui selectionne le crayon.
const PAINTER_DRAW_ACTION = "painter-tool-draw";

// Nom de l'action qui selectionne la gomme.
const PAINTER_ERASE_ACTION = "painter-tool-erase";

// Nom de l'action qui efface le dessin local complet.
const CLEAR_PAINTER_ACTION = "clear-painter";

// Nom de l'action qui telecharge le document JSON du peintre.
const EXPORT_PAINTER_ACTION = "export-painter";

// Prefixe commun des actions de navigation sans routeur externe.
const SHOW_WORKSPACE_ACTION_PREFIX = "show-workspace-";

// Action qui ouvre ou ferme la configuration LAN globale.
const TOGGLE_CONNECTION_ACTION = "toggle-connection";

// Action qui copie la derniere reponse technique dans le presse-papiers.
const COPY_LAST_RESPONSE_ACTION = "copy-last-response";

// Selecteur des champs de formulaire controles par l'etat applicatif.
const STATE_FIELD_SELECTOR = "[data-field]";

// ----------------------------------------------------------------------------
// Branche les evenements de l'application sur le DOM courant.
//
// Parametres :
// - context : dependances necessaires aux gestionnaires d'evenements.
//
// Effet de bord :
// - ajoute des gestionnaires submit, click, input et change.
// ----------------------------------------------------------------------------
export function attachAppEvents(context: UiEventContext): void {
  attachActionButtons(context);
  attachStateFields(context);
  attachPainterCanvasEvents(context);
  attachDiagnosticsChartEvents(context.rootElement);
}

// ----------------------------------------------------------------------------
// Branche le clic-glisser du peintre sur la vue par couches.
//
// Parametres :
// - context : etat et commande de peinture du panneau courant.
//
// Effet de bord :
// - capture le pointeur et modifie chaque voxel traverse une seule fois.
// ----------------------------------------------------------------------------
function attachPainterCanvasEvents(context: UiEventContext): void {
  if (context.state.streaming.workspace !== "painting") return;
  const canvas = context.rootElement.querySelector<HTMLCanvasElement>("[data-streaming-preview]");
  if (canvas === null) return;
  const painterCanvas = canvas;
  let activePointerId: number | null = null;
  let lastVoxelKey = "";

  // --------------------------------------------------------------------------
  // Peint le voxel sous le pointeur sans repeter la meme cellule.
  //
  // Parametres :
  // - event : mouvement ou appui exprime dans les coordonnees de la fenetre.
  // --------------------------------------------------------------------------
  function paintPointerVoxel(event: PointerEvent): void {
    const voxel = getStreamingLayerVoxelAtPoint(painterCanvas, event.clientX, event.clientY);
    if (voxel === null) return;
    const voxelKey = `${voxel.x}:${voxel.y}:${voxel.z}`;
    if (voxelKey === lastVoxelKey) return;
    lastVoxelKey = voxelKey;
    context.paintStreamingVoxel(voxel.x, voxel.y, voxel.z);
  }

  // --------------------------------------------------------------------------
  // Commence un trait uniquement sur une cellule des couches.
  //
  // Parametres :
  // - event : appui du pointeur a capturer.
  // --------------------------------------------------------------------------
  function startPainterStroke(event: PointerEvent): void {
    if (getStreamingLayerVoxelAtPoint(painterCanvas, event.clientX, event.clientY) === null) return;
    event.preventDefault();
    activePointerId = event.pointerId;
    lastVoxelKey = "";
    painterCanvas.setPointerCapture(event.pointerId);
    paintPointerVoxel(event);
  }

  // --------------------------------------------------------------------------
  // Continue le trait du seul pointeur capture.
  //
  // Parametres :
  // - event : mouvement candidat du pointeur.
  // --------------------------------------------------------------------------
  function continuePainterStroke(event: PointerEvent): void {
    if (activePointerId !== event.pointerId) return;
    event.preventDefault();
    paintPointerVoxel(event);
  }

  // --------------------------------------------------------------------------
  // Termine ou annule le trait courant.
  //
  // Parametres :
  // - event : relachement du pointeur capture.
  // --------------------------------------------------------------------------
  function finishPainterStroke(event: PointerEvent): void {
    if (activePointerId !== event.pointerId) return;
    activePointerId = null;
    lastVoxelKey = "";
  }

  painterCanvas.addEventListener("pointerdown", startPainterStroke);
  painterCanvas.addEventListener("pointermove", continuePainterStroke);
  painterCanvas.addEventListener("pointerup", finishPainterStroke);
  painterCanvas.addEventListener("pointercancel", finishPainterStroke);
}

// ----------------------------------------------------------------------------
// Branche les boutons d'action declares dans le rendu.
//
// Parametres :
// - context : dependances necessaires aux actions.
//
// Effet de bord :
// - ajoute un gestionnaire click a chaque bouton d'action.
// ----------------------------------------------------------------------------
function attachActionButtons(context: UiEventContext): void {
  const buttonElements = context.rootElement.querySelectorAll<HTMLButtonElement>(
    ACTION_BUTTON_SELECTOR,
  );

  buttonElements.forEach((buttonElement) => {
    buttonElement.addEventListener("click", () => {
      void handleAction(context, buttonElement.dataset.action ?? "");
    });
  });
}

// ----------------------------------------------------------------------------
// Branche les champs controles par l'etat applicatif.
//
// Parametres :
// - context : dependances necessaires a la mise a jour d'etat.
//
// Effet de bord :
// - ajoute des gestionnaires input et change aux champs controles.
// ----------------------------------------------------------------------------
function attachStateFields(context: UiEventContext): void {
  const fieldElements = context.rootElement.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >(
    STATE_FIELD_SELECTOR,
  );

  fieldElements.forEach((fieldElement) => {
    if (fieldElement instanceof HTMLInputElement && fieldElement.type === "range") {
      updateRangeAppearance(fieldElement);
    }
    fieldElement.addEventListener("input", () => {
      if (fieldElement instanceof HTMLInputElement && fieldElement.type === "file") {
        return;
      }
      if (
        fieldElement.dataset.field === "aux-switch" ||
        fieldElement.dataset.field === "diagnostics-enabled" ||
        fieldElement.dataset.field === "diagnostics-interval" ||
        fieldElement.dataset.field === "diagnostics-window"
      ) {
        return;
      }

      // Un range doit conserver le meme noeud pendant toute la capture du
      // pointeur. Sa valeur reste vivante, mais le rendu complet attend change.
      if (fieldElement instanceof HTMLInputElement && fieldElement.type === "range") {
        handleFieldChange(context, fieldElement, false);
        updateRangeOutput(fieldElement);
        updateRangeAppearance(fieldElement);
        return;
      }

      handleFieldChange(context, fieldElement, true);
    });

    fieldElement.addEventListener("change", () => {
      handleFieldChange(context, fieldElement, true);
    });
  });
}

// ----------------------------------------------------------------------------
// Actualise la valeur textuelle associee a un slider sans remplacer son DOM.
//
// Parametres :
// - fieldElement : range dont le parent contient une sortie annotee.
// ----------------------------------------------------------------------------
function updateRangeOutput(fieldElement: HTMLInputElement): void {
  const outputElement = fieldElement.parentElement?.querySelector<HTMLElement>("[data-range-output]");
  if (outputElement === null || outputElement === undefined) return;
  const suffix = outputElement.dataset.rangeSuffix ?? "";
  outputElement.textContent = `${fieldElement.value}${suffix}`;
}

// ----------------------------------------------------------------------------
// Calcule la progression visuelle violette d'un slider natif.
//
// Parametres :
// - fieldElement : range dont les bornes et la valeur pilotent le degrade CSS.
//
// Effet de bord :
// - actualise la variable CSS locale sans reconstruire le champ.
// ----------------------------------------------------------------------------
function updateRangeAppearance(fieldElement: HTMLInputElement): void {
  // Borne minimale native avec un repli compatible HTML.
  const minimum = Number(fieldElement.min || "0");
  // Borne maximale native avec un repli compatible HTML.
  const maximum = Number(fieldElement.max || "100");
  // Valeur numerique courante du controle.
  const value = Number(fieldElement.value);
  // Amplitude protegee contre une division par zero.
  const range = Math.max(maximum - minimum, 1);
  // Pourcentage borne utilise par les pistes Chromium et Safari.
  const progress = Math.min(100, Math.max(0, ((value - minimum) / range) * 100));
  fieldElement.style.setProperty("--range-progress", `${progress}%`);
}

// ----------------------------------------------------------------------------
// Branche par delegation les survols et focus des points des graphiques.
//
// Parametres :
// - rootElement : racine contenant le panneau Diagnostics eventuel.
//
// Effet de bord :
// - actualise la sortie textuelle partagee sans reconstruire les graphiques.
// ----------------------------------------------------------------------------
function attachDiagnosticsChartEvents(rootElement: HTMLElement): void {
  const panelElement = rootElement.querySelector<HTMLElement>("[data-diagnostics-panel]");
  if (panelElement === null) return;
  panelElement.addEventListener("pointerover", showDiagnosticsChartTooltip);
  panelElement.addEventListener("focusin", showDiagnosticsChartTooltip);
  panelElement.addEventListener("pointerout", clearDiagnosticsChartTooltip);
  panelElement.addEventListener("focusout", clearDiagnosticsChartTooltip);
}

// ----------------------------------------------------------------------------
// Affiche les valeurs du point survole ou selectionne au clavier.
//
// Parametres :
// - event : evenement dont la cible peut porter `data-chart-point`.
//
// Effet de bord :
// - remplace le texte de la sortie partagee du panneau courant.
// ----------------------------------------------------------------------------
function showDiagnosticsChartTooltip(event: Event): void {
  const targetElement = event.target instanceof Element
    ? event.target.closest<SVGElement>("[data-chart-point]")
    : null;
  const panelElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  const outputElement = panelElement?.querySelector<HTMLElement>("[data-chart-tooltip]") ?? null;
  if (targetElement === null || outputElement === null) return;
  outputElement.textContent = targetElement.dataset.tooltip ?? "Valeur indisponible.";
}

// ----------------------------------------------------------------------------
// Retablit l'aide lorsque le pointeur ou le focus quitte un point.
//
// Parametres :
// - event : evenement emis par la delegation du panneau.
//
// Effet de bord :
// - remet le texte d'aide si aucun autre point ne recoit immediatement le focus.
// ----------------------------------------------------------------------------
function clearDiagnosticsChartTooltip(event: Event): void {
  const targetElement = event.target instanceof Element
    ? event.target.closest<SVGElement>("[data-chart-point]")
    : null;
  if (targetElement === null) return;
  const panelElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  const outputElement = panelElement?.querySelector<HTMLElement>("[data-chart-tooltip]") ?? null;
  if (outputElement !== null) {
    outputElement.textContent = "Survole ou selectionne un point pour afficher ses valeurs.";
  }
}

// ----------------------------------------------------------------------------
// Route une action utilisateur vers son gestionnaire.
//
// Parametres :
// - context : dependances necessaires a l'action.
// - action : nom de l'action declaree dans le DOM.
//
// Effet de bord :
// - modifie l'etat ou appelle le serveur LAN selon l'action.
// ----------------------------------------------------------------------------
async function handleAction(context: UiEventContext, action: string): Promise<void> {
  if (action.startsWith(SHOW_WORKSPACE_ACTION_PREFIX)) {
    selectAppWorkspace(context, action.slice(SHOW_WORKSPACE_ACTION_PREFIX.length));
    return;
  }

  if (action === TOGGLE_CONNECTION_ACTION) {
    context.state.connectionPanelOpen = !context.state.connectionPanelOpen;
    context.rerender();
    return;
  }

  if (action === COPY_LAST_RESPONSE_ACTION) {
    await copyLastResponse(context);
    return;
  }

  if (context.state.isBusy) {
    return;
  }

  if (action.startsWith("bytecode-")) {
    await context.handleBytecodeAction(action);
    return;
  }

  if (action === CONNECT_LAN_ACTION) {
    await connectLan(context);
    return;
  }

  if (action === DISCONNECT_LAN_ACTION) {
    disconnectLan(context);
    return;
  }

  if (action === START_STREAMING_ACTION) {
    await context.startStreaming(context.state.streaming.targetFps);
    return;
  }

  if (action === STOP_STREAMING_ACTION) {
    context.stopStreaming();
    return;
  }

  if (action === SHOW_STREAMING_ANIMATIONS_ACTION) {
    context.selectStreamingWorkspace("animations");
    return;
  }

  if (action === SHOW_STREAMING_PAINTING_ACTION) {
    context.selectStreamingWorkspace("painting");
    return;
  }

  if (action === PAINTER_DRAW_ACTION) {
    context.selectPainterTool("draw");
    return;
  }

  if (action === PAINTER_ERASE_ACTION) {
    context.selectPainterTool("erase");
    return;
  }

  if (action === CLEAR_PAINTER_ACTION && confirm("Effacer tous les voxels du dessin ?")) {
    context.clearPainter();
    return;
  }

  if (action === EXPORT_PAINTER_ACTION) {
    context.exportCurrentPainterDrawing();
    return;
  }

  if (action === REFRESH_DIAGNOSTICS_ACTION) {
    await refreshDiagnostics(context);
    return;
  }

  if (
    action === RESET_DIAGNOSTICS_ACTION &&
    confirm("Remettre a zero les minimums et statistiques de diagnostics ?")
  ) {
    await resetDiagnostics(context);
    return;
  }

  if (action === CLEAR_DIAGNOSTICS_HISTORY_ACTION) {
    clearDiagnosticsHistory(context.state.diagnostics);
    updateDiagnosticsView(context.rootElement, context.state);
    return;
  }

  if (action === SEND_SET_MODE_ACTION) {
    if (context.state.streaming.active) context.stopStreaming(false);
    await sendSetMode(context);
    return;
  }

  if (action === SEND_SET_TEXT_ACTION) {
    await sendSetText(context);
    return;
  }

  if (action === SET_TIMEZONE_ACTION) {
    await setTimezone(context);
    return;
  }

  if (action === GET_COLOR_ACTION) {
    await getFirmwareColor(context);
    return;
  }

  if (action === GET_SWITCH_STATE_ACTION) {
    await getFirmwareSwitchState(context);
    return;
  }

  if (action === REBOOT_DEVICE_ACTION && confirm("Redemarrer le Photon selectionne ?")) {
    await callFnRouter(context, buildRebootCommand());
  }
}

// ----------------------------------------------------------------------------
// Met a jour l'etat depuis un champ de formulaire.
//
// Parametres :
// - context : dependances necessaires a la mise a jour.
// - fieldElement : champ DOM modifie par l'utilisateur.
//
// Effet de bord :
// - modifie l'etat applicatif et persiste les préférences ;
// - relance le rendu uniquement pour les champs qui modifient la structure UI.
// ----------------------------------------------------------------------------
function handleFieldChange(
  context: UiEventContext,
  fieldElement: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  commitChange: boolean,
): void {
  const fieldName = fieldElement.dataset.field ?? "";

  if (fieldName === "painter-import" && fieldElement instanceof HTMLInputElement) {
    // Premier fichier JSON choisi dans le selecteur natif.
    const file = fieldElement.files?.[0];
    if (file !== undefined) void context.importCurrentPainterDrawing(file);
    fieldElement.value = "";
    return;
  }

  if (fieldName.startsWith("bytecode-")) {
    void context.handleBytecodeField(fieldElement, commitChange);
    return;
  }

  if (fieldName === "lan-host") {
    context.stopStreaming();
    stopDiagnosticsMonitoring(context);
    context.state.lanHost = fieldElement.value.trim();
    context.state.lastTransportUsed = null;
    syncLanConnectionButton(context.rootElement, context.state);
  } else if (fieldName === "lan-port") {
    context.stopStreaming();
    stopDiagnosticsMonitoring(context);
    context.state.lanPort = Number.parseInt(fieldElement.value, 10);
    context.state.lastTransportUsed = null;
    syncLanConnectionButton(context.rootElement, context.state);
  } else if (fieldName === "auto-connect" && fieldElement instanceof HTMLInputElement) {
    context.state.autoConnect = fieldElement.checked;
  } else if (fieldName === "diagnostics-enabled" && fieldElement instanceof HTMLInputElement) {
    context.state.diagnostics.enabled = fieldElement.checked;
    if (fieldElement.checked) {
      context.diagnosticsMonitor.start(context.state.diagnostics.intervalSeconds);
    } else {
      context.diagnosticsMonitor.stop();
    }
  } else if (fieldName === "diagnostics-interval") {
    context.state.diagnostics.intervalSeconds = Number.parseInt(fieldElement.value, 10);
    if (context.state.diagnostics.enabled) {
      context.diagnosticsMonitor.start(context.state.diagnostics.intervalSeconds);
    }
  } else if (fieldName === "diagnostics-window") {
    context.state.diagnostics.chartWindow = fieldElement.value as DiagnosticsChartWindow;
    updateDiagnosticsView(context.rootElement, context.state);
  } else if (fieldName === "streaming-fps") {
    const requestedFps = Number.parseInt(fieldElement.value, 10);
    if (Number.isFinite(requestedFps)) {
      context.state.streaming.targetFps = normalizeStreamingFps(requestedFps);
      context.updateStreamingCadence();
    }
  } else if (fieldName === "streaming-animation") {
    context.selectStreamingAnimation(fieldElement.value);
  } else if (fieldName === "streaming-speed") {
    const requestedSpeed = Number.parseInt(fieldElement.value, 10);
    if (Number.isFinite(requestedSpeed)) {
      context.state.streaming.movementStepsPerSecond = Math.max(1, Math.min(30, requestedSpeed));
      context.updateStreamingSettings();
    }
  } else if (fieldName === "streaming-brightness") {
    const requestedBrightness = Number.parseInt(fieldElement.value, 10);
    if (Number.isFinite(requestedBrightness)) {
      context.state.streaming.brightnessPercent = Math.max(1, Math.min(100, requestedBrightness));
      context.updateStreamingSettings();
    }
  } else if (fieldName === "painter-color" && fieldElement instanceof HTMLInputElement) {
    context.state.streaming.painterColor = fieldElement.value;
  } else if (fieldName === "painter-brightness") {
    // Luminosite individuelle demandee par le slider du pinceau.
    const requestedBrightness = Number.parseInt(fieldElement.value, 10);
    if (Number.isFinite(requestedBrightness)) {
      context.state.streaming.painterBrightnessPercent = Math.max(1, Math.min(100, requestedBrightness));
    }
  } else if (fieldName === "painter-global-brightness") {
    // Luminosite globale demandee sans alterer les voxels enregistres.
    const requestedBrightness = Number.parseInt(fieldElement.value, 10);
    if (Number.isFinite(requestedBrightness)) {
      context.state.streaming.painterGlobalBrightnessPercent = Math.max(1, Math.min(100, requestedBrightness));
      context.updatePainterGlobalBrightness(commitChange);
    }
  } else if (fieldName === "mode-name") {
    context.state.selectedModeName = fieldElement.value;
  } else if (fieldName === "brightness") {
    context.state.currentBrightnessPercent = Number.parseInt(fieldElement.value, 10);
  } else if (fieldName === "speed") {
    context.state.currentSpeedIndex = Number.parseInt(fieldElement.value, 10);
  } else if (fieldName === "color" && fieldElement instanceof HTMLInputElement) {
    updateColorValue(context.state, fieldElement);
  } else if (fieldName === "switch" && fieldElement instanceof HTMLInputElement) {
    updateSwitchValue(context.state, fieldElement);
  } else if (fieldName === "aux-switch" && fieldElement instanceof HTMLInputElement) {
    void updateAuxSwitch(context, fieldElement);
    return;
  } else if (fieldName === "text") {
    context.state.textValue = fieldElement.value;
  } else if (fieldName === "persistent-text") {
    context.state.persistentTextValue = fieldElement.value;
  } else if (fieldName === "timezone-offset") {
    context.state.timezoneOffset = Number.parseInt(fieldElement.value, 10);
  } else if (fieldName === "color-query-index") {
    context.state.colorQueryIndex = Number.parseInt(fieldElement.value, 10);
  } else if (fieldName === "switch-query-index") {
    context.state.switchQueryIndex = Number.parseInt(fieldElement.value, 10);
  }

  if (!commitChange) return;

  saveAppPreferences(context.storage, context.state);

  // Les champs texte doivent conserver leur nœud DOM pendant la saisie. Un
  // rendu complet à chaque caractère remplacerait l'input et ferait perdre le
  // focus ainsi que la position du curseur.
  if (
    fieldName === "text" ||
    fieldName === "persistent-text" ||
    fieldName === "diagnostics-window" ||
    fieldName === "lan-host" ||
    fieldName === "lan-port" ||
    fieldName === "painter-color" ||
    fieldName === "painter-brightness" ||
    fieldName === "painter-global-brightness"
  ) {
    return;
  }

  context.rerender();
}

// ----------------------------------------------------------------------------
// Selectionne un espace connu et conserve ce choix dans le navigateur.
//
// Parametres :
// - context : etat, stockage et fonction de rendu courants.
// - requestedWorkspace : suffixe recu depuis l'action declarative.
//
// Effet de bord :
// - ferme le panneau LAN, persiste l'espace puis remplace le contenu principal.
// ----------------------------------------------------------------------------
function selectAppWorkspace(context: UiEventContext, requestedWorkspace: string): void {
  if (!isAppWorkspace(requestedWorkspace)) return;
  context.state.activeWorkspace = requestedWorkspace;
  context.state.connectionPanelOpen = false;
  saveAppPreferences(context.storage, context.state);
  context.rerender();
}

// ----------------------------------------------------------------------------
// Verifie qu'une valeur correspond a l'un des six espaces autorises.
//
// Parametres :
// - value : valeur issue du nom d'action DOM.
//
// Retour :
// - vrai pour un identifiant de navigation pris en charge.
// ----------------------------------------------------------------------------
function isAppWorkspace(value: string): value is AppWorkspace {
  return value === "cube" || value === "animations" || value === "streaming" ||
    value === "procedural" || value === "firmware" || value === "diagnostics";
}

// ----------------------------------------------------------------------------
// Copie la derniere reponse LAN lorsque l'API du navigateur est disponible.
//
// Parametres :
// - context : etat courant et fonction de rendu de l'application.
//
// Effet de bord :
// - ecrit dans le presse-papiers puis actualise le message global.
// ----------------------------------------------------------------------------
async function copyLastResponse(context: UiEventContext): Promise<void> {
  if (context.state.lastResponse === null) return;
  try {
    if (navigator.clipboard === undefined) throw new Error("Presse-papiers indisponible");
    await navigator.clipboard.writeText(context.state.lastResponse);
    context.state.statusMessage = "Dernière réponse LAN copiée.";
  } catch {
    context.state.statusMessage = "Copie impossible dans ce navigateur.";
  }
  context.rerender();
}

// ----------------------------------------------------------------------------
// Valide la connexion LAN puis charge l'etat complet du cube selectionne.
//
// Parametres :
// - context : dependances necessaires au transport configure.
//
// Effet de bord :
// - normalise la destination, lit sante et etat puis actualise l'interface.
// ----------------------------------------------------------------------------
export async function connectLan(context: UiEventContext): Promise<void> {
  if (!canCallAdvancedFunction(context.state)) {
    context.state.statusMessage = "Configure l'adresse LAN du Photon.";
    context.rerender();
    return;
  }

  await runBusyTask(context, "Connexion au cube et lecture de son état...", async () => {
    context.state.lanHost = normalizeLanHost(context.state.lanHost);
    context.state.lanPort = normalizeLanPort(context.state.lanPort);
    const response = await createTransportForState(context.state).readCube();
    const snapshot = response.value;
    context.state.lastTransportUsed = response.source;
    context.state.currentModeName = snapshot.modeName;
    context.state.currentPlaybackKind = snapshot.playbackKind;
    context.state.currentBrightnessPercent = convertFirmwareBrightnessToAppPercent(
      snapshot.brightness,
    );
    context.state.currentSpeedIndex = snapshot.speedIndex;
    context.state.modes = snapshot.modes;
    context.state.auxSwitches = snapshot.auxSwitches;
    context.state.wifiRssi = snapshot.wifiRssi;
    context.state.wifiReady = snapshot.wifiReady;
    context.state.particleConnected = snapshot.particleConnected;
    context.state.lastCommandResult = snapshot.lastCommandResult;
    context.state.firmwareRevision = snapshot.firmwareRevision;
    context.state.deviceOsVersion = snapshot.deviceOsVersion;
    context.state.uptimeSeconds = snapshot.uptimeSeconds;
    context.state.debugMessage = snapshot.debugMessage;
    context.state.connectionStatus = "LAN connecté";
    if (snapshot.colors.length > 0) context.state.colorValues = snapshot.colors;
    if (snapshot.switches.length > 0) context.state.switchValues = snapshot.switches;
    context.state.selectedModeName =
      context.state.modes.find((mode) => mode.name === snapshot.modeName)?.name ??
      context.state.selectedModeName ??
      context.state.modes[0]?.name ??
      null;
    context.state.statusMessage = "Connexion LAN validée et état du cube chargé.";
    saveAppPreferences(context.storage, context.state);
  });
}

// ----------------------------------------------------------------------------
// Ferme la session logique LAN conservee par l'interface.
//
// Parametres :
// - context : etat, moniteurs et moteur de streaming de la session courante.
//
// Effet de bord :
// - arrete les activites reseau locales et efface les donnees lues du cube ;
// - ne coupe ni le Wi-Fi ni le serveur HTTP du Photon.
// ----------------------------------------------------------------------------
function disconnectLan(context: UiEventContext): void {
  context.stopStreaming(false);
  stopDiagnosticsMonitoring(context);
  context.state.lastTransportUsed = null;
  context.state.connectionStatus = "LAN déconnecté";
  context.state.currentModeName = null;
  context.state.currentPlaybackKind = null;
  context.state.modes = [];
  context.state.auxSwitches = [];
  context.state.wifiRssi = null;
  context.state.wifiReady = null;
  context.state.particleConnected = null;
  context.state.lastCommandResult = null;
  context.state.firmwareRevision = null;
  context.state.deviceOsVersion = null;
  context.state.uptimeSeconds = null;
  context.state.debugMessage = null;
  context.state.diagnostics.latestSample = null;
  context.state.diagnostics.lastError = null;
  context.state.statusMessage = "Interface déconnectée du cube.";
  context.rerender();
}

// ----------------------------------------------------------------------------
// Demande un echantillon immediat sans superposer une lecture en cours.
//
// Parametres :
// - context : moniteur et etat applicatif courants.
//
// Effet de bord :
// - conserve le dernier echantillon valide lorsqu'une lecture echoue.
// ----------------------------------------------------------------------------
async function refreshDiagnostics(context: UiEventContext): Promise<void> {
  context.state.statusMessage = "Lecture immediate des diagnostics...";
  const refreshed = await context.diagnosticsMonitor.refresh();
  context.state.statusMessage = refreshed
    ? "Diagnostics actualises."
    : "Lecture ignoree ou echouee ; le dernier echantillon valide est conserve.";
}

// ----------------------------------------------------------------------------
// Execute la remise a zero confirmee puis conserve son nouvel echantillon.
//
// Parametres :
// - context : transport et etat applicatif courants.
//
// Effet de bord :
// - appelle l'unique endpoint de reset et ajoute sa reponse a l'historique.
// ----------------------------------------------------------------------------
async function resetDiagnostics(context: UiEventContext): Promise<void> {
  if (context.diagnosticsMonitor.isBusy()) {
    context.state.statusMessage = "Attends la fin de la lecture de diagnostics en cours.";
    context.rerender();
    return;
  }
  const restartMonitoring = context.state.diagnostics.enabled;
  context.diagnosticsMonitor.stop();
  await runBusyTask(context, "Remise a zero des diagnostics...", async () => {
    const sample = await resetDiagnosticsSample(context.state);
    appendDiagnosticsSample(context.state.diagnostics, sample);
    context.state.lastTransportUsed = sample.source;
    context.state.statusMessage = `Diagnostics remis a zero via ${sample.source}.`;
  });
  if (restartMonitoring) {
    context.diagnosticsMonitor.start(context.state.diagnostics.intervalSeconds);
  }
}

// ----------------------------------------------------------------------------
// Arrete la surveillance lors d'un changement de cible ou de transport.
//
// Parametres :
// - context : moniteur et etat a synchroniser.
//
// Effet de bord :
// - annule le timer futur et desactive l'interrupteur de surveillance.
// ----------------------------------------------------------------------------
function stopDiagnosticsMonitoring(context: UiEventContext): void {
  context.diagnosticsMonitor.stop();
  context.state.diagnostics.enabled = false;
}

// ----------------------------------------------------------------------------
// Envoie le texte persistant via le transport configure.
//
// Parametres :
// - context : dependances necessaires a l'appel reseau.
//
// Effet de bord :
// - peut ecrire le texte en EEPROM cote firmware.
// ----------------------------------------------------------------------------
async function sendSetText(context: UiEventContext): Promise<void> {
  if (!canCallAdvancedFunction(context.state)) {
    context.state.statusMessage = "Configure un transport disponible avant d'envoyer SetText.";
    context.rerender();
    return;
  }

  const text = validateOrShowMessage(context, () => validateSetText(context.state.persistentTextValue));

  if (text === null) {
    return;
  }

  await runBusyTask(context, "Envoi du texte persistant...", async () => {
    const response = await createTransportForState(context.state).sendText(text);

    context.state.lastTransportUsed = response.source;
    context.state.lastResponse = JSON.stringify(
      { functionName: "SetText", text, response: response.value },
      null,
      2,
    );
    context.state.statusMessage = `Texte persistant envoye via ${response.source}.`;
    saveAppPreferences(context.storage, context.state);
  });
}

// ----------------------------------------------------------------------------
// Applique un fuseau horaire via `SETTIMEZONE`.
//
// Parametres :
// - context : dependances necessaires a l'appel reseau.
//
// Effet de bord :
// - appelle le routeur LAN et affiche sa reponse.
// ----------------------------------------------------------------------------
async function setTimezone(context: UiEventContext): Promise<void> {
  const command = validateOrShowMessage(context, () =>
    buildSetTimezoneCommand(context.state.timezoneOffset),
  );

  if (command === null) {
    return;
  }

  await callFnRouter(context, command);
}

// ----------------------------------------------------------------------------
// Appelle `FnRouter` avec une commande deja construite.
//
// Parametres :
// - context : dependances necessaires a l'appel reseau.
// - command : commande FnRouter prete a envoyer.
//
// Effet de bord :
// - appelle le routeur commun et affiche sa reponse.
// ----------------------------------------------------------------------------
async function callFnRouter(context: UiEventContext, command: string): Promise<void> {
  if (!canCallAdvancedFunction(context.state)) {
    context.state.statusMessage = "Configure un transport disponible avant d'appeler FnRouter.";
    context.rerender();
    return;
  }

  await runBusyTask(context, "Appel FnRouter...", async () => {
    const transport = createTransportForState(context.state);
    const response = await transport.sendCommand(command);

    context.state.lastTransportUsed = response.source;
    context.state.lastResponse = JSON.stringify(
      { functionName: "Function", command, response: response.value },
      null,
      2,
    );
    context.state.statusMessage = `Commande FnRouter envoyee via ${response.source}.`;

    if (command.startsWith("SETAUXSWITCH:")) {
      const auxSwitches = await transport.readAuxSwitches();
      context.state.lastTransportUsed = auxSwitches.source;
      context.state.auxSwitches = auxSwitches.value;
    }

    saveAppPreferences(context.storage, context.state);
  });
}

// ----------------------------------------------------------------------------
// Lit une couleur courante via `GETCOLOR`.
//
// Parametres :
// - context : dependances necessaires a l'appel reseau.
//
// Effet de bord :
// - appelle FnRouter et affiche la couleur retournee.
// ----------------------------------------------------------------------------
async function getFirmwareColor(context: UiEventContext): Promise<void> {
  const command = validateOrShowMessage(context, () =>
    buildGetColorCommand(context.state.colorQueryIndex),
  );

  if (command === null) {
    return;
  }

  await callFnRouter(context, command);
}

// ----------------------------------------------------------------------------
// Lit l'etat d'un switch local courant via `GETSWITCHSTATE`.
//
// Parametres :
// - context : dependances necessaires a l'appel reseau.
//
// Effet de bord :
// - appelle le routeur LAN et affiche sa reponse.
// ----------------------------------------------------------------------------
async function getFirmwareSwitchState(context: UiEventContext): Promise<void> {
  const command = validateOrShowMessage(context, () =>
    buildGetSwitchStateCommand(context.state.switchQueryIndex),
  );

  if (command === null) {
    return;
  }

  await callFnRouter(context, command);
}

// ----------------------------------------------------------------------------
// Envoie une commande `SetMode` par le transport configure.
//
// Parametres :
// - context : dependances necessaires a l'appel reseau.
//
// Effet de bord :
// - appelle une seule destination et met a jour la derniere reponse affichee.
// ----------------------------------------------------------------------------
async function sendSetMode(context: UiEventContext): Promise<void> {
  if (!canSendSetModeCommand(context.state)) {
    context.state.statusMessage = "Commande incomplete : configure un transport et charge un mode.";
    context.rerender();
    return;
  }

  const selectedMode = getSelectedModeDefinition(context.state);

  if (selectedMode === null) {
    context.state.statusMessage = "Commande incomplete : selectionne un mode charge.";
    context.rerender();
    return;
  }

  await runBusyTask(context, "Envoi de la commande SetMode...", async () => {
    const command = buildSetModeCommand({
      modeName: context.state.selectedModeName ?? undefined,
      speedIndex: context.state.currentSpeedIndex,
      brightnessPercent: context.state.currentBrightnessPercent,
      colors: context.state.colorValues.slice(0, selectedMode.parameters.colorCount),
      switches: context.state.switchValues.slice(0, selectedMode.parameters.switchLabels.length),
      text: selectedMode.parameters.acceptsText ? context.state.textValue : undefined,
    });
    const response = await createTransportForState(context.state).sendMode(command);

    context.state.lastTransportUsed = response.source;
    context.state.currentModeName = context.state.selectedModeName;
    context.state.currentPlaybackKind = "native";
    context.state.lastCommandResult = response.value.result;
    context.state.lastResponse = JSON.stringify({ command, response: response.value }, null, 2);
    context.state.statusMessage = `Commande SetMode envoyee via ${response.source}.`;
    saveAppPreferences(context.storage, context.state);
  });
}

// ----------------------------------------------------------------------------
// Execute une tache asynchrone avec indicateur d'occupation et gestion d'erreur.
//
// Parametres :
// - context : dependances necessaires au rendu.
// - busyMessage : message affiche pendant la tache.
// - task : tache asynchrone a executer.
//
// Effet de bord :
// - modifie l'etat d'occupation et le message de statut.
// ----------------------------------------------------------------------------
async function runBusyTask(
  context: UiEventContext,
  busyMessage: string,
  task: () => Promise<void>,
): Promise<void> {
  context.state.isBusy = true;
  context.state.statusMessage = busyMessage;
  context.rerender();

  try {
    await task();
  } catch (error) {
    context.state.statusMessage = getErrorMessage(error);
  } finally {
    context.state.isBusy = false;
    context.rerender();
  }
}

// ----------------------------------------------------------------------------
// Met a jour une couleur depuis un champ color HTML.
//
// Parametres :
// - state : etat applicatif a modifier.
// - fieldElement : champ couleur modifie.
//
// Effet de bord :
// - modifie la couleur correspondante dans l'etat.
// ----------------------------------------------------------------------------
function updateColorValue(state: AppState, fieldElement: HTMLInputElement): void {
  const index = Number.parseInt(fieldElement.dataset.index ?? "0", 10);
  state.colorValues[index] = normalizeHexColor(fieldElement.value);
}

// ----------------------------------------------------------------------------
// Met a jour un switch local depuis une case a cocher.
//
// Parametres :
// - state : etat applicatif a modifier.
// - fieldElement : case a cocher modifiee.
//
// Effet de bord :
// - modifie le switch correspondant dans l'etat.
// ----------------------------------------------------------------------------
function updateSwitchValue(state: AppState, fieldElement: HTMLInputElement): void {
  const index = Number.parseInt(fieldElement.dataset.index ?? "0", 10);
  state.switchValues[index] = fieldElement.checked;
}

// ----------------------------------------------------------------------------
// Met a jour un interrupteur auxiliaire global via FnRouter.
//
// Parametres :
// - context : dependances necessaires a l'appel reseau.
// - fieldElement : case a cocher modifiee par l'utilisateur.
//
// Effet de bord :
// - appelle le transport configure et recharge la liste des interrupteurs.
// ----------------------------------------------------------------------------
async function updateAuxSwitch(
  context: UiEventContext,
  fieldElement: HTMLInputElement,
): Promise<void> {
  const id = Number.parseInt(fieldElement.dataset.index ?? "0", 10);
  const command = validateOrShowMessage(context, () =>
    buildSetAuxSwitchCommand(id, fieldElement.checked),
  );

  if (command === null) {
    fieldElement.checked = !fieldElement.checked;
    return;
  }

  await callFnRouter(context, command);
}

// ----------------------------------------------------------------------------
// Execute une validation locale et affiche l'erreur sans appel reseau.
//
// Parametres :
// - context : dependances necessaires au rendu.
// - validator : validation locale a executer.
//
// Retour :
// - valeur validee, ou `null` si la validation echoue.
//
// Effet de bord :
// - met a jour le message de statut en cas d'erreur locale.
// ----------------------------------------------------------------------------
function validateOrShowMessage<TValue>(
  context: UiEventContext,
  validator: () => TValue,
): TValue | null {
  try {
    return validator();
  } catch (error) {
    context.state.statusMessage = getErrorMessage(error);
    context.rerender();
    return null;
  }
}

// ----------------------------------------------------------------------------
// Convertit une erreur inconnue en message lisible.
//
// Parametres :
// - error : erreur capturee pendant une action UI.
//
// Retour :
// - message lisible pour l'utilisateur.
// ----------------------------------------------------------------------------
function getErrorMessage(error: unknown): string {
  if (error instanceof SparkPixelsCommandRefusedError) {
    return `Commande refusee via ${error.source} : ${error.result}.`;
  }

  if (error instanceof LanClientError) {
    if (error.category === "timeout") return "Le Photon LAN n'a pas repondu avant le timeout.";
    if (error.category === "connection") return "Le Photon est inaccessible a l'adresse LAN configuree.";
    if (error.category === "command-refused") return `Commande LAN refusee : ${error.result}.`;
    return `Protocole LAN invalide : ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur inconnue est survenue.";
}
