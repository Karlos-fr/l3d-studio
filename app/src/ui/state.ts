// ============================================================================
// UiState - Implementation de l'etat applicatif minimal
// ----------------------------------------------------------------------------
// Ce fichier decrit l'etat applicatif partage par le rendu et les evenements.
// Il ne lit pas Particle Cloud et ne construit pas de commande firmware.
// ============================================================================

import type { ParticleDeviceSummary, ParticleStoredSession } from "../particle/types";
import type { DiagnosticsMonitorState } from "../diagnostics/types";
import { createDiagnosticsHistory } from "../diagnostics/history";
import type {
  SparkPixelsAuxSwitch,
  SparkPixelsDeviceInfoEntry,
  SparkPixelsModeDefinition,
} from "../sparkpixels/types";
import type { AppPreferences } from "./preferences";
import type { TransportKind, TransportPreference } from "../transport/types";

export interface AppState {
  applicationName: string;
  connectionStatus: string;
  transportPreference: TransportPreference;
  lanHost: string;
  lanPort: number;
  lastTransportUsed: TransportKind | null;
  lanTestStatus: string | null;
  diagnostics: DiagnosticsMonitorState;
  session: ParticleStoredSession | null;
  devices: ParticleDeviceSummary[];
  selectedDeviceId: string | null;
  currentModeName: string | null;
  currentBrightnessPercent: number;
  currentSpeedIndex: number;
  modes: SparkPixelsModeDefinition[];
  auxSwitches: SparkPixelsAuxSwitch[];
  deviceInfoEntries: SparkPixelsDeviceInfoEntry[];
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

// Statut initial affiche avant toute connexion Particle.
const INITIAL_CONNECTION_STATUS = "Non connecte";

// Transport initial qui privilegie le LAN lorsque son adresse est configuree.
const INITIAL_TRANSPORT_PREFERENCE: TransportPreference = "automatic";

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
// - session : session Particle chargee depuis le stockage local, quand elle existe.
// - preferences : derniers reglages locaux sauvegardes, quand ils existent.
//
// Retour :
// - etat minimal utilise par le premier rendu.
// ----------------------------------------------------------------------------
export function createInitialState(
  session: ParticleStoredSession | null,
  preferences: AppPreferences | null,
): AppState {
  return {
    applicationName: APPLICATION_NAME,
    connectionStatus: session === null ? INITIAL_CONNECTION_STATUS : "Session restauree",
    transportPreference: preferences?.transportPreference ?? INITIAL_TRANSPORT_PREFERENCE,
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
      estimatedParticleDataOperations: 0,
      warningMessage: null,
    },
    session,
    devices: [],
    selectedDeviceId: session?.deviceId ?? null,
    currentModeName: null,
    currentBrightnessPercent: preferences?.brightnessPercent ?? INITIAL_BRIGHTNESS_PERCENT,
    currentSpeedIndex: preferences?.speedIndex ?? INITIAL_SPEED_INDEX,
    modes: [],
    auxSwitches: [],
    deviceInfoEntries: [],
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
    statusMessage: session === null ? "Connecte-toi a Particle pour charger les devices." : "Session chargee.",
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
// Retourne le device Particle actuellement selectionne.
//
// Parametres :
// - state : etat applicatif courant.
//
// Retour :
// - device selectionne, ou `null` si aucun device ne correspond.
// ----------------------------------------------------------------------------
export function getSelectedDevice(state: AppState): ParticleDeviceSummary | null {
  if (state.selectedDeviceId === null) {
    return null;
  }

  return state.devices.find((device) => device.id === state.selectedDeviceId) ?? null;
}

// ----------------------------------------------------------------------------
// Indique si le device Particle selectionne est connecte.
//
// Parametres :
// - state : etat applicatif courant.
//
// Retour :
// - `true` si le device selectionne est online, sinon `false`.
// ----------------------------------------------------------------------------
export function isSelectedDeviceOnline(state: AppState): boolean {
  const selectedDevice = getSelectedDevice(state);

  return selectedDevice?.connected === true || selectedDevice?.online === true;
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
// - `true` si un device Particle online est selectionne et aucune action ne tourne.
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
// - vrai pour un LAN configure ou un device Particle online compatible.
// ----------------------------------------------------------------------------
export function hasAvailableConfiguredTransport(state: AppState): boolean {
  const lanAvailable = state.lanHost.trim().length > 0;
  const particleAvailable = state.selectedDeviceId !== null && isSelectedDeviceOnline(state);
  if (state.transportPreference === "lan") return lanAvailable;
  if (state.transportPreference === "particle") return particleAvailable;
  return lanAvailable || particleAvailable;
}

// ----------------------------------------------------------------------------
// Reinitialise l'etat dependant du firmware apres un changement de device.
//
// Parametres :
// - state : etat applicatif a modifier.
//
// Effet de bord :
// - vide les donnees de mode et remet les controles aux valeurs par defaut.
// ----------------------------------------------------------------------------
export function resetFirmwareState(state: AppState): void {
  state.currentModeName = null;
  state.currentBrightnessPercent = INITIAL_BRIGHTNESS_PERCENT;
  state.currentSpeedIndex = INITIAL_SPEED_INDEX;
  state.modes = [];
  state.auxSwitches = [];
  state.deviceInfoEntries = [];
  state.selectedModeName = null;
  state.colorValues = [...DEFAULT_MODE_COLORS];
  state.switchValues = [false, false, false, false];
  state.textValue = "";
  state.wifiRssi = null;
  state.debugMessage = null;
  state.lastResponse = null;
  state.lastTransportUsed = null;
  state.diagnostics.enabled = false;
  state.diagnostics.latestSample = null;
  state.diagnostics.history = createDiagnosticsHistory(
    state.diagnostics.history.capacity,
  );
  state.diagnostics.chartWindow = "recent";
  state.diagnostics.lastError = null;
  state.diagnostics.consecutiveErrors = 0;
  state.diagnostics.estimatedParticleDataOperations = 0;
  state.diagnostics.warningMessage = null;
}
