// ============================================================================
// UiEvents - Implementation des evenements applicatifs
// ----------------------------------------------------------------------------
// Ce fichier relie les interactions utilisateur aux modules Particle et
// SparkPixels. Il ne construit pas le HTML et ne stocke pas le mot de passe.
// ============================================================================

import { ParticleCloudError, type ParticleClient } from "../particle/client";
import {
  clearParticleSession,
  createSessionFromToken,
  isParticleSessionExpired,
  saveParticleSession,
  type ParticleSessionStorage,
} from "../particle/session";
import { parseAuxSwitchList, parseDeviceInfo, parseModeDefinitions } from "../sparkpixels/parsers";
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
import { saveAppPreferences } from "./preferences";
import {
  canCallAdvancedFunction,
  canSendSetModeCommand,
  getSelectedDevice,
  getSelectedModeDefinition,
  isSelectedDeviceOnline,
  resetFirmwareState,
  type AppState,
} from "./state";

export interface UiEventContext {
  rootElement: HTMLElement;
  state: AppState;
  particleClient: ParticleClient;
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
      if (fieldElement.dataset.field === "aux-switch") {
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
// - modifie l'etat applicatif puis relance le rendu.
// ----------------------------------------------------------------------------
function handleFieldChange(
  context: UiEventContext,
  fieldElement: HTMLInputElement | HTMLSelectElement,
): void {
  const fieldName = fieldElement.dataset.field ?? "";

  if (fieldName === "device-id") {
    updateSelectedDevice(context, fieldElement.value);
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
    context.state.statusMessage =
      devices.length === 0 ? "Aucun device Particle visible." : `${devices.length} device(s) charge(s).`;

    persistSelectedDevice(context);
  });
}

// ----------------------------------------------------------------------------
// Charge l'etat firmware initial du cube selectionne.
//
// Parametres :
// - context : dependances necessaires aux lectures Particle.
//
// Effet de bord :
// - lit les variables firmware et met a jour les controles de mode.
// ----------------------------------------------------------------------------
async function loadFirmwareState(context: UiEventContext): Promise<void> {
  if (getSelectedDevice(context.state) === null) {
    context.state.statusMessage = "Aucun device Particle n'est selectionne.";
    context.rerender();
    return;
  }

  if (!isSelectedDeviceOnline(context.state)) {
    context.state.statusMessage = "Le Photon selectionne est offline. Impossible de lire le firmware.";
    context.rerender();
    return;
  }

  const deviceId = requireSelectedDevice(context.state);

  await runBusyTask(context, "Lecture du firmware SparkPixelsMega...", async () => {
    const [
      modeName,
      brightness,
      speedIndex,
      modeList,
      modeParamList,
      auxSwitchList,
      deviceInfo,
      wifiRssi,
      debugMessage,
    ] = await Promise.all([
      context.particleClient.getVariable<string>(deviceId, "mode"),
      context.particleClient.getVariable<number>(deviceId, "brightness"),
      context.particleClient.getVariable<number>(deviceId, "speed"),
      context.particleClient.getVariable<string>(deviceId, "modeList"),
      context.particleClient.getVariable<string>(deviceId, "modeParmList"),
      context.particleClient.getVariable<string>(deviceId, "auxSwtchList"),
      context.particleClient.getVariable<string>(deviceId, "deviceInfo"),
      context.particleClient.getVariable<number>(deviceId, "wifi"),
      context.particleClient.getVariable<string>(deviceId, "debug"),
    ]);

    context.state.currentModeName = modeName;
    context.state.currentBrightnessPercent = convertFirmwareBrightnessToAppPercent(brightness);
    context.state.currentSpeedIndex = speedIndex;
    context.state.modes = parseModeDefinitions(modeList, modeParamList);
    context.state.auxSwitches = parseAuxSwitchList(auxSwitchList);
    context.state.deviceInfoEntries = parseDeviceInfo(deviceInfo);
    context.state.wifiRssi = wifiRssi;
    context.state.debugMessage = debugMessage.length === 0 ? null : debugMessage;
    context.state.selectedModeName =
      context.state.modes.find((mode) => mode.name === modeName)?.name ??
      context.state.selectedModeName ??
      context.state.modes[0]?.name ??
      null;
    context.state.statusMessage = "Etat du cube charge.";
    saveAppPreferences(context.storage, context.state);
  });
}

// ----------------------------------------------------------------------------
// Envoie le texte persistant via la fonction Particle `SetText`.
//
// Parametres :
// - context : dependances necessaires a l'appel Particle.
//
// Effet de bord :
// - appelle Particle Cloud et peut ecrire le texte en EEPROM cote firmware.
// ----------------------------------------------------------------------------
async function sendSetText(context: UiEventContext): Promise<void> {
  if (!canCallAdvancedFunction(context.state)) {
    context.state.statusMessage = "Selectionne un Photon online avant d'envoyer SetText.";
    context.rerender();
    return;
  }

  const deviceId = requireSelectedDevice(context.state);
  const text = validateOrShowMessage(context, () => validateSetText(context.state.persistentTextValue));

  if (text === null) {
    return;
  }

  await runBusyTask(context, "Envoi du texte persistant...", async () => {
    const response = await context.particleClient.callFunction(deviceId, "SetText", text);

    context.state.lastResponse = JSON.stringify({ functionName: "SetText", text, response }, null, 2);
    context.state.statusMessage = "Texte persistant envoye.";
    saveAppPreferences(context.storage, context.state);
  });
}

// ----------------------------------------------------------------------------
// Applique un fuseau horaire via `SETTIMEZONE`.
//
// Parametres :
// - context : dependances necessaires a l'appel Particle.
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
// - context : dependances necessaires a l'appel Particle.
// - command : commande FnRouter prete a envoyer.
//
// Effet de bord :
// - appelle la fonction Particle `Function` et affiche sa reponse.
// ----------------------------------------------------------------------------
async function callFnRouter(context: UiEventContext, command: string): Promise<void> {
  if (!canCallAdvancedFunction(context.state)) {
    context.state.statusMessage = "Selectionne un Photon online avant d'appeler FnRouter.";
    context.rerender();
    return;
  }

  const deviceId = requireSelectedDevice(context.state);

  await runBusyTask(context, "Appel FnRouter...", async () => {
    const response = await context.particleClient.callFunction(deviceId, "Function", command);

    context.state.lastResponse = JSON.stringify({ functionName: "Function", command, response }, null, 2);
    context.state.statusMessage = "Commande FnRouter envoyee.";

    if (command.startsWith("SETAUXSWITCH:")) {
      const auxSwitchList = await context.particleClient.getVariable<string>(deviceId, "auxSwtchList");
      context.state.auxSwitches = parseAuxSwitchList(auxSwitchList);
    }

    saveAppPreferences(context.storage, context.state);
  });
}

// ----------------------------------------------------------------------------
// Lit une couleur courante via `GETCOLOR`.
//
// Parametres :
// - context : dependances necessaires a l'appel Particle.
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
// - context : dependances necessaires a l'appel Particle.
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
// Envoie une commande `SetMode` au device selectionne.
//
// Parametres :
// - context : dependances necessaires a l'appel Particle.
//
// Effet de bord :
// - appelle Particle Cloud et met a jour la derniere reponse affichee.
// ----------------------------------------------------------------------------
async function sendSetMode(context: UiEventContext): Promise<void> {
  if (!canSendSetModeCommand(context.state)) {
    context.state.statusMessage = "Commande incomplete : selectionne un device online et un mode charge.";
    context.rerender();
    return;
  }

  const deviceId = requireSelectedDevice(context.state);
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
    const response = await context.particleClient.callFunction(deviceId, "SetMode", command);

    context.state.currentModeName = context.state.selectedModeName;
    context.state.lastResponse = JSON.stringify({ command, response }, null, 2);
    context.state.statusMessage = "Commande SetMode envoyee.";
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
// - context : dependances necessaires a l'appel Particle.
// - fieldElement : case a cocher modifiee par l'utilisateur.
//
// Effet de bord :
// - appelle Particle Cloud et recharge la liste des interrupteurs globaux.
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
// Exige qu'un device soit selectionne.
//
// Parametres :
// - state : etat applicatif a inspecter.
//
// Retour :
// - identifiant du device selectionne.
// ----------------------------------------------------------------------------
function requireSelectedDevice(state: AppState): string {
  if (state.selectedDeviceId === null) {
    throw new Error("Aucun device Particle n'est selectionne.");
  }

  return state.selectedDeviceId;
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
