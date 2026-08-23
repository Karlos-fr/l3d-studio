// ============================================================================
// UiState - Implementation de l'etat applicatif minimal
// ----------------------------------------------------------------------------
// Ce fichier decrit l'etat applicatif partage par le rendu et les evenements.
// Il ne lit pas Particle Cloud et ne construit pas de commande firmware.
// ============================================================================

import type { DiagnosticsMonitorState } from "../diagnostics/types";
import { createDiagnosticsHistory } from "../diagnostics/history";
import type {
  SparkPixelsAuxSwitch,
  SparkPixelsModeDefinition,
} from "../sparkpixels/types";
import type { AppPreferences } from "./preferences";
import type { TransportKind } from "../transport/types";
import type { StreamingFps } from "../streaming/engine";
import { DEFAULT_STREAMING_ANIMATION_ID } from "../streaming/registry";
import type { LanBytecodeStatus } from "../lan/types";
import type { BytecodeLibraryEntry } from "../bytecode/library";
import { BYTECODE_REFERENCE_PROGRAMS } from "../bytecode/reference_programs";
import type { BytecodeSimulationSnapshot } from "../bytecode/simulation";
import type { PainterTool } from "../painting/model";

// Deux ateliers partagent le transport et l'apercu du panneau Streaming.
export type StreamingWorkspace = "animations" | "painting";

// Cinq espaces fonctionnels remplacent la page verticale historique.
export type AppWorkspace = "cube" | "streaming" | "procedural" | "firmware" | "diagnostics";

// Trois vues mobiles organisent l'atelier procedural sans dupliquer son etat.
export type BytecodeWorkspaceView = "editor" | "simulation" | "photon";

// Etat visible de la session de streaming web.
export interface StreamingUiState {
  active: boolean;
  workspace: StreamingWorkspace;
  selectedAnimationId: string;
  targetFps: StreamingFps;
  movementStepsPerSecond: number;
  brightnessPercent: number;
  sentFrames: number;
  droppedFrames: number;
  measuredFps: number;
  statusMessage: string;
  painterTool: PainterTool;
  painterColor: string;
}

// Etat visible de l'editeur et de la VM procedurale.
export interface BytecodeUiState {
  activeView: BytecodeWorkspaceView;
  selectedSourceKey: string;
  sourceName: string;
  sourceText: string;
  library: BytecodeLibraryEntry[];
  compiledContainer: Uint8Array | null;
  compiledSize: number;
  compiledCapabilities: number;
  compileMessage: string;
  simulation: BytecodeSimulationSnapshot;
  photonStatus: LanBytecodeStatus | null;
  operationMessage: string;
}

export interface AppState {
  applicationName: string;
  activeWorkspace: AppWorkspace;
  connectionPanelOpen: boolean;
  connectionStatus: string;
  lanHost: string;
  lanPort: number;
  lastTransportUsed: TransportKind | null;
  lanTestStatus: string | null;
  diagnostics: DiagnosticsMonitorState;
  streaming: StreamingUiState;
  bytecode: BytecodeUiState;
  currentModeName: string | null;
  currentBrightnessPercent: number;
  currentSpeedIndex: number;
  modes: SparkPixelsModeDefinition[];
  auxSwitches: SparkPixelsAuxSwitch[];
  selectedModeName: string | null;
  colorValues: string[];
  switchValues: boolean[];
  textValue: string;
  persistentTextValue: string;
  timezoneOffset: number;
  colorQueryIndex: number;
  switchQueryIndex: number;
  wifiRssi: number | null;
  debugMessage: string | null;
  isBusy: boolean;
  statusMessage: string;
  lastResponse: string | null;
}

// Nom affiche dans l'en-tete de l'application.
const APPLICATION_NAME = "L3D Studio";

// Espace principal propose lors du premier chargement.
const INITIAL_APP_WORKSPACE: AppWorkspace = "cube";

// Statut initial affiche avant toute lecture du serveur local.
const INITIAL_CONNECTION_STATUS = "LAN non teste";

// Adresse LAN initialement vide afin de ne pas versionner une configuration personnelle.
const INITIAL_LAN_HOST = "";

// Port contractuel du premier serveur LAN.
const INITIAL_LAN_PORT = 8080;

// Intervalle de surveillance propose initialement, en secondes.
const INITIAL_DIAGNOSTICS_INTERVAL_SECONDS = 10;

// Luminosite initiale affichee tant que le firmware n'a pas ete lu.
const INITIAL_BRIGHTNESS_PERCENT = 50;

// Index de vitesse initial affiche tant que le firmware n'a pas ete lu.
const INITIAL_SPEED_INDEX = 4;

// Fuseau horaire initial propose aux commandes FnRouter.
const INITIAL_TIMEZONE_OFFSET = 0;

// Index initial de couleur interrogee via FnRouter.
const INITIAL_COLOR_QUERY_INDEX = 1;

// Index initial de switch local interroge via FnRouter.
const INITIAL_SWITCH_QUERY_INDEX = 1;

// Couleurs par defaut proposees aux modes qui attendent plusieurs couleurs.
const DEFAULT_MODE_COLORS = ["FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "00FFFF"];

// ----------------------------------------------------------------------------
// Cree l'etat initial de la coquille applicative.
//
// Parametres :
// - preferences : derniers reglages locaux sauvegardes, quand ils existent.
//
// Retour :
// - etat minimal utilise par le premier rendu.
// ----------------------------------------------------------------------------
export function createInitialState(
  preferences: AppPreferences | null,
): AppState {
  const initialProgram = BYTECODE_REFERENCE_PROGRAMS[0];
  if (initialProgram === undefined) throw new Error("Le corpus bytecode est vide.");
  return {
    applicationName: APPLICATION_NAME,
    activeWorkspace:
      preferences?.activeWorkspace === "cube" ||
      preferences?.activeWorkspace === "streaming" ||
      preferences?.activeWorkspace === "procedural" ||
      preferences?.activeWorkspace === "firmware" ||
      preferences?.activeWorkspace === "diagnostics"
        ? preferences.activeWorkspace
        : INITIAL_APP_WORKSPACE,
    connectionPanelOpen: false,
    connectionStatus: INITIAL_CONNECTION_STATUS,
    lanHost: preferences?.lanHost ?? INITIAL_LAN_HOST,
    lanPort: preferences?.lanPort ?? INITIAL_LAN_PORT,
    lastTransportUsed: null,
    lanTestStatus: null,
    diagnostics: {
      enabled: false,
      intervalSeconds: INITIAL_DIAGNOSTICS_INTERVAL_SECONDS,
      latestSample: null,
      history: createDiagnosticsHistory(),
      chartWindow: "recent",
      lastError: null,
      consecutiveErrors: 0,
      warningMessage: null,
    },
    streaming: {
      active: false,
      workspace: "animations",
      selectedAnimationId: DEFAULT_STREAMING_ANIMATION_ID,
      targetFps: 10,
      movementStepsPerSecond: 10,
      brightnessPercent: 1,
      sentFrames: 0,
      droppedFrames: 0,
      measuredFps: 0,
      statusMessage: "Streaming arrêté.",
      painterTool: "draw",
      painterColor: "#2dd4bf",
    },
    bytecode: {
      activeView: "editor",
      selectedSourceKey: `example:${initialProgram.id}`,
      sourceName: "Rain",
      sourceText: initialProgram.source,
      library: [],
      compiledContainer: null,
      compiledSize: 0,
      compiledCapabilities: 0,
      compileMessage: "Source non compilée.",
      simulation: {
        state: "stopped",
        instructionCount: 0,
        shownFrames: 0,
        measuredFps: 0,
        lastFault: null,
      },
      photonStatus: null,
      operationMessage: "Configure l'adresse LAN pour lire le Photon.",
    },
    currentModeName: null,
    currentBrightnessPercent: preferences?.brightnessPercent ?? INITIAL_BRIGHTNESS_PERCENT,
    currentSpeedIndex: preferences?.speedIndex ?? INITIAL_SPEED_INDEX,
    modes: [],
    auxSwitches: [],
    selectedModeName: preferences?.selectedModeName ?? null,
    colorValues: preferences?.colorValues ?? [...DEFAULT_MODE_COLORS],
    switchValues: preferences?.switchValues ?? [false, false, false, false],
    textValue: preferences?.textValue ?? "",
    persistentTextValue: preferences?.persistentTextValue ?? preferences?.textValue ?? "",
    timezoneOffset: preferences?.timezoneOffset ?? INITIAL_TIMEZONE_OFFSET,
    colorQueryIndex: INITIAL_COLOR_QUERY_INDEX,
    switchQueryIndex: INITIAL_SWITCH_QUERY_INDEX,
    wifiRssi: null,
    debugMessage: null,
    isBusy: false,
    statusMessage: "Configure l'adresse LAN du Photon puis lis le cube.",
    lastResponse: null,
  };
}

// ----------------------------------------------------------------------------
// Retourne la definition du mode actuellement selectionne.
//
// Parametres :
// - state : etat applicatif courant.
//
// Retour :
// - definition de mode selectionnee, ou `null` si aucun mode ne correspond.
// ----------------------------------------------------------------------------
export function getSelectedModeDefinition(state: AppState): SparkPixelsModeDefinition | null {
  if (state.selectedModeName === null) {
    return null;
  }

  return state.modes.find((mode) => mode.name === state.selectedModeName) ?? null;
}

// ----------------------------------------------------------------------------
// Indique si une commande `SetMode` peut etre envoyee.
//
// Parametres :
// - state : etat applicatif courant.
//
// Retour :
// - `true` si l'etat contient un device et un mode exploitables.
// ----------------------------------------------------------------------------
export function canSendSetModeCommand(state: AppState): boolean {
  return (
    state.isBusy === false &&
    hasAvailableConfiguredTransport(state) &&
    getSelectedModeDefinition(state) !== null
  );
}

// ----------------------------------------------------------------------------
// Indique si une fonction firmware avancee peut etre appelee.
//
// Parametres :
// - state : etat applicatif courant.
//
// Retour :
// - `true` si une adresse LAN est configuree et aucune action ne tourne.
// ----------------------------------------------------------------------------
export function canCallAdvancedFunction(state: AppState): boolean {
  return state.isBusy === false && hasAvailableConfiguredTransport(state);
}

// ----------------------------------------------------------------------------
// Indique si la preference courante possede au moins une destination possible.
//
// Parametres :
// - state : etat applicatif courant.
//
// Retour :
// - vrai quand l'adresse du serveur LAN est configuree.
// ----------------------------------------------------------------------------
export function hasAvailableConfiguredTransport(state: AppState): boolean {
  return state.lanHost.trim().length > 0;
}
