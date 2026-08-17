// ============================================================================
// SparkPixelsProtocol - Implementation du protocole Spark Pixels
// ----------------------------------------------------------------------------
// Ce fichier construit les commandes envoyees au firmware SparkPixelsMega. Il
// ne doit pas contenir d'appels Particle Cloud ni de logique de rendu DOM.
// ============================================================================

import type { SparkPixelsSetModeOptions } from "./types";

// Nombre minimal de couleurs adressables par une commande de mode.
export const MIN_MODE_COLOR_COUNT = 0;

// Nombre maximal de couleurs supportees par le firmware SparkPixelsMega.
export const MAX_MODE_COLOR_COUNT = 6;

// Index de vitesse le plus lent expose par SparkPixelsMega.
export const MIN_SPEED_INDEX = 0;

// Index de vitesse le plus rapide expose par SparkPixelsMega.
export const MAX_SPEED_INDEX = 8;

// Luminosite minimale acceptee par l'interface applicative.
export const MIN_BRIGHTNESS_PERCENT = 0;

// Luminosite maximale acceptee par l'interface applicative.
export const MAX_BRIGHTNESS_PERCENT = 100;

// Valeur minimale effectivement appliquee par le firmware pour eviter le noir absolu.
export const MIN_FIRMWARE_BRIGHTNESS = 1;

// Valeur maximale de luminosite interne utilisee par le firmware.
export const MAX_FIRMWARE_BRIGHTNESS = 255;

// Nombre maximal de caracteres texte transmis dans un segment `W:`.
export const MAX_SET_MODE_TEXT_LENGTH = 63;

// Nombre maximal de caracteres texte transmis par la fonction Particle `SetText`.
export const MAX_SET_TEXT_LENGTH = 63;

// Index minimal de couleur lu par `GETCOLOR`.
export const MIN_COLOR_INDEX = 1;

// Index maximal de couleur lu par `GETCOLOR`.
export const MAX_COLOR_INDEX = 6;

// Index minimal de switch local lu par `GETSWITCHSTATE`.
export const MIN_LOCAL_SWITCH_INDEX = 1;

// Index maximal de switch local lu par `GETSWITCHSTATE`.
export const MAX_LOCAL_SWITCH_INDEX = 4;

// Offset de fuseau horaire minimal accepte par Particle Time.zone.
export const MIN_TIMEZONE_OFFSET = -12;

// Offset de fuseau horaire maximal accepte par Particle Time.zone.
export const MAX_TIMEZONE_OFFSET = 14;

// Expression reguliere d'une couleur RGB en hexadecimal avec prefixe optionnel.
const HEX_COLOR_PATTERN = /^#?[0-9a-fA-F]{6}$/;

// ----------------------------------------------------------------------------
// Construit une commande `SetMode` compatible avec SparkPixelsMega.
//
// Parametres :
// - options : mode, vitesse, luminosite, couleurs, switches et texte a envoyer.
//
// Retour :
// - commande terminee par une virgule, prete pour le parametre Particle `arg`.
// ----------------------------------------------------------------------------
export function buildSetModeCommand(options: SparkPixelsSetModeOptions): string {
  const segments: string[] = [];

  if (options.modeName !== undefined) {
    segments.push(`M:${validateModeName(options.modeName)}`);
  }

  if (options.speedIndex !== undefined) {
    segments.push(`S:${validateSpeedIndex(options.speedIndex)}`);
  }

  if (options.brightnessPercent !== undefined) {
    segments.push(`B:${validateBrightnessPercent(options.brightnessPercent)}`);
  }

  if (options.colors !== undefined) {
    segments.push(...buildColorSegments(options.colors));
  }

  if (options.switches !== undefined) {
    segments.push(...buildSwitchSegments(options.switches));
  }

  if (options.text !== undefined) {
    segments.push(`W:${validateSetModeText(options.text)}`);
  }

  if (segments.length === 0) {
    throw new Error("La commande SetMode doit contenir au moins un segment.");
  }

  return `${segments.join(",")},`;
}

// ----------------------------------------------------------------------------
// Construit une commande `SETAUXSWITCH` pour `FnRouter`.
//
// Parametres :
// - id : identifiant de l'interrupteur auxiliaire.
// - enabled : nouvel etat de l'interrupteur.
//
// Retour :
// - commande terminee par un point-virgule, prete pour `Function`.
// ----------------------------------------------------------------------------
export function buildSetAuxSwitchCommand(id: number, enabled: boolean): string {
  if (!Number.isInteger(id) || id < 0) {
    throw new Error("L'identifiant d'interrupteur auxiliaire doit etre positif.");
  }

  return `SETAUXSWITCH:${id},${enabled ? 1 : 0};`;
}

// ----------------------------------------------------------------------------
// Construit une commande `GETSWITCHSTATE` pour `FnRouter`.
//
// Parametres :
// - index : index du switch local a lire, entre 1 et 4.
//
// Retour :
// - commande prete pour la fonction Particle `Function`.
// ----------------------------------------------------------------------------
export function buildGetSwitchStateCommand(index: number): string {
  return `GETSWITCHSTATE:${validateLocalSwitchIndex(index)}`;
}

// ----------------------------------------------------------------------------
// Construit une commande `GETCOLOR` pour `FnRouter`.
//
// Parametres :
// - index : index de couleur a lire, entre 1 et 6.
//
// Retour :
// - commande prete pour la fonction Particle `Function`.
// ----------------------------------------------------------------------------
export function buildGetColorCommand(index: number): string {
  return `GETCOLOR:${validateColorIndex(index)}`;
}

// ----------------------------------------------------------------------------
// Construit une commande `SETTIMEZONE` pour `FnRouter`.
//
// Parametres :
// - offset : decalage horaire Particle a appliquer.
//
// Retour :
// - commande prete pour la fonction Particle `Function`.
// ----------------------------------------------------------------------------
export function buildSetTimezoneCommand(offset: number): string {
  return `SETTIMEZONE:${validateTimezoneOffset(offset)}`;
}

// ----------------------------------------------------------------------------
// Construit une commande `REBOOT` pour `FnRouter`.
//
// Retour :
// - commande prete pour la fonction Particle `Function`.
// ----------------------------------------------------------------------------
export function buildRebootCommand(): string {
  return "REBOOT:";
}

// ----------------------------------------------------------------------------
// Valide le texte persistant envoye a la fonction Particle `SetText`.
//
// Parametres :
// - text : texte a persister dans le firmware.
//
// Retour :
// - texte valide.
// ----------------------------------------------------------------------------
export function validateSetText(text: string): string {
  if (text.length === 0) {
    throw new Error("Le texte SetText ne doit pas etre vide.");
  }

  if (text.length > MAX_SET_TEXT_LENGTH) {
    throw new Error("Le texte SetText doit contenir au maximum 63 caracteres.");
  }

  return text;
}

// ----------------------------------------------------------------------------
// Convertit une luminosite d'interface vers la valeur interne du firmware.
//
// Parametres :
// - brightnessPercent : luminosite applicative entre 0 et 100.
//
// Retour :
// - valeur firmware entre 1 et 255.
// ----------------------------------------------------------------------------
export function convertAppBrightnessToFirmwareValue(brightnessPercent: number): number {
  const validatedPercent = validateBrightnessPercent(brightnessPercent);
  const firmwareValue = Math.trunc(validatedPercent * (MAX_FIRMWARE_BRIGHTNESS * 0.01));

  return Math.max(MIN_FIRMWARE_BRIGHTNESS, firmwareValue);
}

// ----------------------------------------------------------------------------
// Convertit une luminosite firmware vers un pourcentage d'interface.
//
// Parametres :
// - firmwareBrightness : luminosite lue depuis la variable Particle `brightness`.
//
// Retour :
// - pourcentage arrondi entre 0 et 100.
// ----------------------------------------------------------------------------
export function convertFirmwareBrightnessToAppPercent(firmwareBrightness: number): number {
  if (!Number.isFinite(firmwareBrightness)) {
    throw new Error("La luminosite firmware doit etre un nombre fini.");
  }

  const clampedValue = clamp(
    Math.round(firmwareBrightness),
    MIN_FIRMWARE_BRIGHTNESS,
    MAX_FIRMWARE_BRIGHTNESS,
  );

  return Math.round((clampedValue * MAX_BRIGHTNESS_PERCENT) / MAX_FIRMWARE_BRIGHTNESS);
}

// ----------------------------------------------------------------------------
// Normalise une couleur RGB en hexadecimal majuscule sans prefixe.
//
// Parametres :
// - color : couleur au format `RRGGBB` ou `#RRGGBB`.
//
// Retour :
// - couleur normalisee au format `RRGGBB`.
// ----------------------------------------------------------------------------
export function normalizeHexColor(color: string): string {
  const trimmedColor = color.trim();

  if (!HEX_COLOR_PATTERN.test(trimmedColor)) {
    throw new Error("La couleur doit etre au format RRGGBB.");
  }

  return trimmedColor.replace(/^#/, "").toUpperCase();
}

// ----------------------------------------------------------------------------
// Valide un index de vitesse SparkPixelsMega.
//
// Parametres :
// - speedIndex : index de vitesse a valider.
//
// Retour :
// - index de vitesse valide.
// ----------------------------------------------------------------------------
export function validateSpeedIndex(speedIndex: number): number {
  if (
    !Number.isInteger(speedIndex) ||
    speedIndex < MIN_SPEED_INDEX ||
    speedIndex > MAX_SPEED_INDEX
  ) {
    throw new Error("L'index de vitesse doit etre un entier entre 0 et 8.");
  }

  return speedIndex;
}

// ----------------------------------------------------------------------------
// Valide un pourcentage de luminosite applicatif.
//
// Parametres :
// - brightnessPercent : luminosite a valider.
//
// Retour :
// - luminosite validee entre 0 et 100.
// ----------------------------------------------------------------------------
export function validateBrightnessPercent(brightnessPercent: number): number {
  if (
    !Number.isInteger(brightnessPercent) ||
    brightnessPercent < MIN_BRIGHTNESS_PERCENT ||
    brightnessPercent > MAX_BRIGHTNESS_PERCENT
  ) {
    throw new Error("La luminosite doit etre un entier entre 0 et 100.");
  }

  return brightnessPercent;
}

// ----------------------------------------------------------------------------
// Construit les segments couleur `C1:` a `C6:`.
//
// Parametres :
// - colors : couleurs a envoyer dans l'ordre firmware.
//
// Retour :
// - segments de commande couleur.
// ----------------------------------------------------------------------------
function buildColorSegments(colors: string[]): string[] {
  if (colors.length < MIN_MODE_COLOR_COUNT || colors.length > MAX_MODE_COLOR_COUNT) {
    throw new Error("Le nombre de couleurs doit etre compris entre 0 et 6.");
  }

  return colors.map((color, index) => `C${index + 1}:${normalizeHexColor(color)}`);
}

// ----------------------------------------------------------------------------
// Construit les segments de switches locaux `T1:` a `T4:`.
//
// Parametres :
// - switches : etats de switches locaux a envoyer dans l'ordre firmware.
//
// Retour :
// - segments de commande switch.
// ----------------------------------------------------------------------------
function buildSwitchSegments(switches: boolean[]): string[] {
  if (switches.length > 4) {
    throw new Error("Le firmware supporte au maximum 4 switches locaux.");
  }

  return switches.map((enabled, index) => `T${index + 1}:${enabled ? 1 : 0}`);
}

// ----------------------------------------------------------------------------
// Valide un index de couleur lu via `FnRouter`.
//
// Parametres :
// - index : index de couleur a valider.
//
// Retour :
// - index de couleur valide.
// ----------------------------------------------------------------------------
function validateColorIndex(index: number): number {
  if (!Number.isInteger(index) || index < MIN_COLOR_INDEX || index > MAX_COLOR_INDEX) {
    throw new Error("L'index de couleur doit etre un entier entre 1 et 6.");
  }

  return index;
}

// ----------------------------------------------------------------------------
// Valide un index de switch local lu via `FnRouter`.
//
// Parametres :
// - index : index de switch a valider.
//
// Retour :
// - index de switch valide.
// ----------------------------------------------------------------------------
function validateLocalSwitchIndex(index: number): number {
  if (
    !Number.isInteger(index) ||
    index < MIN_LOCAL_SWITCH_INDEX ||
    index > MAX_LOCAL_SWITCH_INDEX
  ) {
    throw new Error("L'index de switch local doit etre un entier entre 1 et 4.");
  }

  return index;
}

// ----------------------------------------------------------------------------
// Valide un offset de fuseau horaire Particle.
//
// Parametres :
// - offset : offset horaire a valider.
//
// Retour :
// - offset horaire valide.
// ----------------------------------------------------------------------------
function validateTimezoneOffset(offset: number): number {
  if (
    !Number.isInteger(offset) ||
    offset < MIN_TIMEZONE_OFFSET ||
    offset > MAX_TIMEZONE_OFFSET
  ) {
    throw new Error("Le fuseau horaire doit etre un entier entre -12 et 14.");
  }

  return offset;
}

// ----------------------------------------------------------------------------
// Valide un nom de mode avant envoi au firmware.
//
// Parametres :
// - modeName : nom de mode selectionne.
//
// Retour :
// - nom de mode nettoye.
// ----------------------------------------------------------------------------
function validateModeName(modeName: string): string {
  const trimmedName = modeName.trim();

  if (trimmedName.length === 0 || trimmedName.includes(",")) {
    throw new Error("Le nom de mode est vide ou contient une virgule interdite.");
  }

  return trimmedName;
}

// ----------------------------------------------------------------------------
// Valide le texte court envoye dans une commande `SetMode`.
//
// Parametres :
// - text : texte a envoyer au firmware.
//
// Retour :
// - texte valide.
// ----------------------------------------------------------------------------
function validateSetModeText(text: string): string {
  if (text.includes(",")) {
    throw new Error("Le texte SetMode ne doit pas contenir de virgule.");
  }

  if (text.length > MAX_SET_MODE_TEXT_LENGTH) {
    throw new Error("Le texte SetMode doit contenir au maximum 63 caracteres.");
  }

  return text;
}

// ----------------------------------------------------------------------------
// Contraint une valeur numerique entre deux bornes.
//
// Parametres :
// - value : valeur a contraindre.
// - min : borne minimale.
// - max : borne maximale.
//
// Retour :
// - valeur comprise entre `min` et `max`.
// ----------------------------------------------------------------------------
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
