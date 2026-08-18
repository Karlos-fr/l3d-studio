// ============================================================================
// UiEvents - Implementation des evenements applicatifs
// ----------------------------------------------------------------------------
// Ce fichier relie les interactions utilisateur aux transports et a
// SparkPixels. Il ne construit pas le HTML et ne stocke pas le mot de passe.
// ============================================================================

import { createLanClient, LanClientError, normalizeLanHost, normalizeLanPort } from "../lan/client";
import type { DiagnosticsMonitor } from "../diagnostics/monitor";
import { appendDiagnosticsSample } from "../diagnostics/history";
import { resetDiagnosticsSample } from "../diagnostics/reader";
import { ParticleCloudError, type ParticleClient } from "../particle/client";
import {
  clearParticleSession,
  createSessionFromToken,
  isParticleSessionExpired,
  saveParticleSession,
  type ParticleSessionStorage,
} from "../particle/session";
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
  type TransportPreference,
} from "../transport/types";
import { saveAppPreferences } from "./preferences";
import {
  canCallAdvancedFunction,
  canSendSetModeCommand,
  getSelectedModeDefinition,
  isSelectedDeviceOnline,
  resetFirmwareState,
  type AppState,
} from "./state";
import { createTransportForState } from "./transport";

export interface UiEventContext {
  rootElement: HTMLElement;
  state: AppState;
  particleClient: ParticleClient;
  diagnosticsMonitor: DiagnosticsMonitor;
  storage: ParticleSessionStorage;
  rerender: () => void;
}

// Selecteur du formulaire de connexion Particle.
const LOGIN_FORM_SELECTOR = "[data-form='login']";

// Selecteur des boutons d'action declaratifs.
const ACTION_BUTTON_SELECTOR = "[data-action]";

// Nom de l'action qui deconnecte la session Particle.
const LOGOUT_ACTION = "logout";

// Nom de l'action qui recharge la liste des devices.
const REFRESH_DEVICES_ACTION = "refresh-devices";

// Nom de l'action qui lit l'etat firmware du cube.
const LOAD_FIRMWARE_STATE_ACTION = "load-firmware-state";

// Nom de l'action qui teste uniquement la route de sante LAN.
const TEST_LAN_ACTION = "test-lan";

// Nom de l'action qui force un echantillon de diagnostics.
const REFRESH_DIAGNOSTICS_ACTION = "refresh-diagnostics";

// Nom de l'action explicite qui remet les minimums a zero.
const RESET_DIAGNOSTICS_ACTION = "reset-diagnostics";

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
  attachLoginForm(context);
  attachActionButtons(context);
  attachStateFields(context);
}

// ----------------------------------------------------------------------------
// Charge les donnees initiales si une session Particle existe deja.
//
// Parametres :
// - context : dependances necessaires au chargement.
//
// Effet de bord :
// - appelle Particle Cloud pour lister les devices quand un token existe.
// ----------------------------------------------------------------------------
export async function hydrateAuthenticatedSession(context: UiEventContext): Promise<void> {
  if (context.state.session === null) {
    return;
  }

  if (isParticleSessionExpired(context.state.session, Date.now())) {
    handleExpiredSession(context);
    return;
  }

  context.particleClient.setToken(context.state.session.accessToken);
  await loadDevices(context);
}

// ----------------------------------------------------------------------------
// Branche le formulaire de connexion Particle.
//
// Parametres :
// - context : dependances necessaires au login.
//
// Effet de bord :
// - ajoute un gestionnaire submit au formulaire de connexion.
// ----------------------------------------------------------------------------
function attachLoginForm(context: UiEventContext): void {
  const formElement = context.rootElement.querySelector<HTMLFormElement>(LOGIN_FORM_SELECTOR);

  if (formElement === null) {
    return;
  }

  formElement.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleLogin(context, formElement);
  });
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
  const fieldElements = context.rootElement.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    STATE_FIELD_SELECTOR,
  );

  fieldElements.forEach((fieldElement) => {
    fieldElement.addEventListener("input", () => {
      if (
        fieldElement.dataset.field === "aux-switch" ||
        fieldElement.dataset.field === "lan-host" ||
        fieldElement.dataset.field === "lan-port" ||
        fieldElement.dataset.field === "diagnostics-enabled" ||
        fieldElement.dataset.field === "diagnostics-interval"
      ) {
        return;
      }

      handleFieldChange(context, fieldElement);
    });

    fieldElement.addEventListener("change", () => {
      handleFieldChange(context, fieldElement);
    });
  });
}

// ----------------------------------------------------------------------------
// Traite la connexion Particle.
//
// Parametres :
// - context : dependances necessaires au login.
// - formElement : formulaire contenant email et mot de passe.
//
// Effet de bord :
// - appelle Particle OAuth, persiste le token et recharge les devices.
// ----------------------------------------------------------------------------
async function handleLogin(context: UiEventContext, formElement: HTMLFormElement): Promise<void> {
  if (context.state.isBusy) {
    return;
  }

  const formData = new FormData(formElement);
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  await runBusyTask(context, "Connexion a Particle...", async () => {
    const tokenResponse = await context.particleClient.login(email, password);
    const session = createSessionFromToken(tokenResponse, Date.now(), null);

    context.state.session = session;
    context.state.connectionStatus = "Connecte";
    context.state.statusMessage = "Connexion Particle reussie.";
    context.particleClient.setToken(session.accessToken);
    saveParticleSession(context.storage, session);
    formElement.reset();
    await loadDevices(context);
  });
}

// ----------------------------------------------------------------------------
// Route une action utilisateur vers son gestionnaire.
//
// Parametres :
// - context : dependances necessaires a l'action.
// - action : nom de l'action declaree dans le DOM.
//
// Effet de bord :
// - modifie l'etat ou appelle Particle selon l'action.
// ----------------------------------------------------------------------------
async function handleAction(context: UiEventContext, action: string): Promise<void> {
  if (context.state.isBusy) {
    return;
  }

  if (action === LOGOUT_ACTION) {
    handleLogout(context);
    return;
  }

  if (action === REFRESH_DEVICES_ACTION) {
    await loadDevices(context);
    return;
  }

  if (action === LOAD_FIRMWARE_STATE_ACTION) {
    await loadFirmwareState(context);
    return;
  }

  if (action === TEST_LAN_ACTION) {
    await testLanConnection(context);
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

  if (action === SEND_SET_MODE_ACTION) {
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
// Deconnecte la session Particle locale.
//
// Parametres :
// - context : dependances necessaires a la deconnexion.
//
// Effet de bord :
// - supprime la session locale et remet l'application en etat initial.
// ----------------------------------------------------------------------------
function handleLogout(context: UiEventContext): void {
  stopDiagnosticsMonitoring(context);
  clearParticleSession(context.storage);
  context.particleClient.setToken(null);
  Object.assign(context.state, {
    session: null,
    devices: [],
    selectedDeviceId: null,
    connectionStatus: "Non connecte",
    statusMessage: "Session Particle supprimee localement.",
    lastResponse: null,
  });
  resetFirmwareState(context.state);
  context.rerender();
}

// ----------------------------------------------------------------------------
// Supprime une session Particle expiree avant tout appel Cloud.
//
// Parametres :
// - context : dependances necessaires a la suppression locale.
//
// Effet de bord :
// - efface le token local et force un nouveau login utilisateur.
// ----------------------------------------------------------------------------
function handleExpiredSession(context: UiEventContext): void {
  stopDiagnosticsMonitoring(context);
  clearParticleSession(context.storage);
  context.particleClient.setToken(null);
  Object.assign(context.state, {
    session: null,
    devices: [],
    selectedDeviceId: null,
    connectionStatus: "Non connecte",
    statusMessage: "Session Particle expiree. Reconnecte-toi pour obtenir un nouveau token.",
    lastResponse: null,
  });
  resetFirmwareState(context.state);
  context.rerender();
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
  fieldElement: HTMLInputElement | HTMLSelectElement,
): void {
  const fieldName = fieldElement.dataset.field ?? "";

  if (fieldName === "device-id") {
    updateSelectedDevice(context, fieldElement.value);
  } else if (fieldName === "transport-preference") {
    stopDiagnosticsMonitoring(context);
    context.state.transportPreference = fieldElement.value as TransportPreference;
    context.state.lastTransportUsed = null;
  } else if (fieldName === "lan-host") {
    stopDiagnosticsMonitoring(context);
    context.state.lanHost = fieldElement.value.trim();
    context.state.lanTestStatus = null;
    context.state.lastTransportUsed = null;
  } else if (fieldName === "lan-port") {
    stopDiagnosticsMonitoring(context);
    context.state.lanPort = Number.parseInt(fieldElement.value, 10);
    context.state.lanTestStatus = null;
    context.state.lastTransportUsed = null;
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

  saveAppPreferences(context.storage, context.state);

  // Les champs texte doivent conserver leur nœud DOM pendant la saisie. Un
  // rendu complet à chaque caractère remplacerait l'input et ferait perdre le
  // focus ainsi que la position du curseur.
  if (fieldName === "text" || fieldName === "persistent-text") {
    return;
  }

  context.rerender();
}

// ----------------------------------------------------------------------------
// Charge la liste des devices Particle.
//
// Parametres :
// - context : dependances necessaires a l'appel Particle.
//
// Effet de bord :
// - met a jour la liste des devices et le device selectionne.
// ----------------------------------------------------------------------------
async function loadDevices(context: UiEventContext): Promise<void> {
  await runBusyTask(context, "Chargement des devices Particle...", async () => {
    const devices = await context.particleClient.listDevices();
    const previousDeviceId = context.state.selectedDeviceId;

    context.state.devices = devices;
    context.state.selectedDeviceId =
      devices.find((device) => device.id === previousDeviceId)?.id ?? devices[0]?.id ?? null;
    if (
      context.state.selectedDeviceId !== previousDeviceId ||
      !isSelectedDeviceOnline(context.state)
    ) {
      stopDiagnosticsMonitoring(context);
    }
    context.state.statusMessage =
      devices.length === 0 ? "Aucun device Particle visible." : `${devices.length} device(s) charge(s).`;

    persistSelectedDevice(context);
  });
}

// ----------------------------------------------------------------------------
// Charge l'etat firmware initial du cube selectionne.
//
// Parametres :
// - context : dependances necessaires au transport configure.
//
// Effet de bord :
// - lit les variables firmware et met a jour les controles de mode.
// ----------------------------------------------------------------------------
async function loadFirmwareState(context: UiEventContext): Promise<void> {
  if (!canCallAdvancedFunction(context.state)) {
    context.state.statusMessage = "Configure une adresse LAN ou selectionne un Photon online.";
    context.rerender();
    return;
  }

  await runBusyTask(context, "Lecture du firmware SparkPixelsMega...", async () => {
    const response = await createTransportForState(context.state, context.particleClient).readCube();
    const snapshot = response.value;
    context.state.lastTransportUsed = response.source;
    context.state.currentModeName = snapshot.modeName;
    context.state.currentBrightnessPercent = convertFirmwareBrightnessToAppPercent(
      snapshot.brightness,
    );
    context.state.currentSpeedIndex = snapshot.speedIndex;
    context.state.modes = snapshot.modes;
    context.state.auxSwitches = snapshot.auxSwitches;
    context.state.deviceInfoEntries = snapshot.deviceInfoEntries;
    context.state.wifiRssi = snapshot.wifiRssi;
    context.state.debugMessage = snapshot.debugMessage;
    if (snapshot.colors.length > 0) context.state.colorValues = snapshot.colors;
    if (snapshot.switches.length > 0) context.state.switchValues = snapshot.switches;
    context.state.selectedModeName =
      context.state.modes.find((mode) => mode.name === snapshot.modeName)?.name ??
      context.state.selectedModeName ??
      context.state.modes[0]?.name ??
      null;
    context.state.statusMessage = `Etat du cube charge via ${response.source}.`;
    saveAppPreferences(context.storage, context.state);
  });
}

// ----------------------------------------------------------------------------
// Teste uniquement la route de sante de l'adresse LAN saisie.
//
// Parametres :
// - context : dependances et configuration utilisateur courante.
//
// Effet de bord :
// - lance un GET sans commande et affiche la version du firmware joignable.
// ----------------------------------------------------------------------------
async function testLanConnection(context: UiEventContext): Promise<void> {
  await runBusyTask(context, "Test de la connexion LAN...", async () => {
    const host = normalizeLanHost(context.state.lanHost);
    const port = normalizeLanPort(context.state.lanPort);
    const health = await createLanClient({ host, port }).health();
    context.state.lanHost = host;
    context.state.lanPort = port;
    context.state.lastTransportUsed = "lan";
    context.state.lanTestStatus = `Photon joignable : firmware ${health.firmwareRevision}, Device OS ${health.deviceOsVersion}.`;
    context.state.statusMessage = "Connexion LAN validee.";
    saveAppPreferences(context.storage, context.state);
  });
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
  context.rerender();
  const refreshed = await context.diagnosticsMonitor.refresh();
  context.state.statusMessage = refreshed
    ? "Diagnostics actualises."
    : "Lecture ignoree ou echouee ; le dernier echantillon valide est conserve.";
  context.rerender();
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
    const sample = await resetDiagnosticsSample(context.state, context.particleClient);
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
    const response = await createTransportForState(context.state, context.particleClient).sendText(text);

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
// - appelle FnRouter et affiche la reponse Particle.
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
    const transport = createTransportForState(context.state, context.particleClient);
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
// - appelle FnRouter et affiche la reponse Particle.
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
    const response = await createTransportForState(context.state, context.particleClient).sendMode(command);

    context.state.lastTransportUsed = response.source;
    context.state.currentModeName = context.state.selectedModeName;
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
    handleSessionError(context, error);
  } finally {
    context.state.isBusy = false;
    context.rerender();
  }
}

// ----------------------------------------------------------------------------
// Traite les erreurs Particle qui invalident la session locale.
//
// Parametres :
// - context : dependances necessaires a la suppression de session.
// - error : erreur recue pendant un appel Particle.
//
// Effet de bord :
// - efface le token local si Particle refuse l'authentification.
// ----------------------------------------------------------------------------
function handleSessionError(context: UiEventContext, error: unknown): void {
  if (!(error instanceof ParticleCloudError)) {
    return;
  }

  const shouldClearSession =
    error.status === 401 || error.status === 403 || error.code === "missing_token";

  if (!shouldClearSession) {
    return;
  }

  stopDiagnosticsMonitoring(context);
  clearParticleSession(context.storage);
  context.particleClient.setToken(null);
  Object.assign(context.state, {
    session: null,
    devices: [],
    selectedDeviceId: null,
    connectionStatus: "Non connecte",
    statusMessage: `${getErrorMessage(error)} Reconnecte-toi pour obtenir un nouveau token.`,
    lastResponse: null,
  });
  resetFirmwareState(context.state);
}

// ----------------------------------------------------------------------------
// Met a jour le device selectionne et la session locale.
//
// Parametres :
// - context : dependances necessaires a la persistance.
// - deviceId : identifiant Particle selectionne.
//
// Effet de bord :
// - modifie le device selectionne, persiste la session et vide l'etat firmware.
// ----------------------------------------------------------------------------
function updateSelectedDevice(context: UiEventContext, deviceId: string): void {
  stopDiagnosticsMonitoring(context);
  context.state.selectedDeviceId = deviceId;
  resetFirmwareState(context.state);
  persistSelectedDevice(context);
}

// ----------------------------------------------------------------------------
// Persiste le device selectionne dans la session locale.
//
// Parametres :
// - context : dependances necessaires a la persistance.
//
// Effet de bord :
// - ecrit la session mise a jour dans le stockage local.
// ----------------------------------------------------------------------------
function persistSelectedDevice(context: UiEventContext): void {
  if (context.state.session === null) {
    return;
  }

  context.state.session = {
    ...context.state.session,
    deviceId: context.state.selectedDeviceId,
  };
  saveParticleSession(context.storage, context.state.session);
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

  if (error instanceof ParticleCloudError) {
    if (error.code === "missing_token") {
      return "Token Particle absent ou invalide.";
    }

    if (error.code === "invalid_grant") {
      return "Identifiants Particle invalides.";
    }

    if (error.code === "mfa_required") {
      return "MFA Particle requise. Ce flux simple login/mot de passe ne la prend pas encore en charge.";
    }

    if (error.code === "invalid_request" && error.message.toLowerCase().includes("access token")) {
      return "Token Particle refuse par le Cloud.";
    }

    if (error.message === "Timed out.") {
      return "Le Photon ne repond pas. Verifie qu'il est online et connecte au Cloud Particle.";
    }

    if (error.status === 404) {
      return "Ressource Particle introuvable : device, variable ou fonction inconnue.";
    }

    return `Erreur Particle : ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur inconnue est survenue.";
}
