// ============================================================================
// LanParsers - Implementation des parseurs purs de l'API locale
// ----------------------------------------------------------------------------
// Ce fichier valide les formats texte versionnes du Photon. Il ne connait ni
// fetch, ni Particle Cloud, ni le DOM de l'application.
// ============================================================================

import { parseAuxSwitchList, parseModeDefinitions } from "../sparkpixels/parsers";
import type {
  LanAuxSwitches,
  LanCommandResponse,
  LanDiagnostics,
  LanHealth,
  LanModes,
  LanState,
} from "./types";

// Valeur maximale d'un entier non signe produit par le firmware 32 bits.
const UINT32_MAX = 4_294_967_295;

// Valeur minimale d'un entier signe produit par le firmware.
const INT32_MIN = -2_147_483_648;

// Valeur maximale d'un entier signe produit par le firmware.
const INT32_MAX = 2_147_483_647;

// Expression exacte d'une couleur RGB sur six caracteres hexadecimaux.
const RGB_PATTERN = /^[0-9A-F]{6}$/u;

// ----------------------------------------------------------------------------
// Parse la reponse versionnee de sante.
//
// Parametres :
// - text : corps texte recu depuis `/api/v1/health`.
//
// Retour :
// - sante validee et convertie dans les types de l'application.
// ----------------------------------------------------------------------------
export function parseLanHealth(text: string): LanHealth {
  const fields = parseFields(text, "\n");
  requireVersion(fields, "v");
  return {
    protocolVersion: 1,
    firmwareRevision: requireNonEmptyText(fields, "fw"),
    deviceOsVersion: requireNonEmptyText(fields, "os"),
    uptimeSeconds: requireInteger(fields, "u", 0, UINT32_MAX),
    wifiReady: requireBoolean(fields, "i"),
    particleConnected: requireBoolean(fields, "k"),
  };
}

// ----------------------------------------------------------------------------
// Parse un instantane compact de diagnostics.
//
// Parametres :
// - text : corps recu depuis une route de diagnostics.
//
// Retour :
// - toutes les mesures entieres du format version 1.
// ----------------------------------------------------------------------------
export function parseLanDiagnostics(text: string): LanDiagnostics {
  const fields = parseFields(text, ",");
  requireVersion(fields, "v");
  return {
    formatVersion: 1,
    sequence: requireInteger(fields, "y", 0, INT32_MAX),
    modeId: requireInteger(fields, "m", INT32_MIN, INT32_MAX),
    uptimeSeconds: requireInteger(fields, "u", 0, UINT32_MAX),
    resetReason: requireInteger(fields, "r", INT32_MIN, INT32_MAX),
    resetReasonData: requireInteger(fields, "d", 0, UINT32_MAX),
    startupFreeMemory: requireInteger(fields, "s", 0, UINT32_MAX),
    freeMemory: requireInteger(fields, "f", 0, UINT32_MAX),
    minimumFreeMemory: requireInteger(fields, "n", 0, UINT32_MAX),
    frameMemoryBefore: requireInteger(fields, "b", 0, UINT32_MAX),
    frameMemoryAfter: requireInteger(fields, "a", 0, UINT32_MAX),
    modeMinimumFreeMemory: requireInteger(fields, "q", 0, UINT32_MAX),
    frameCount: requireInteger(fields, "c", 0, UINT32_MAX),
    lastFrameMicros: requireInteger(fields, "l", 0, UINT32_MAX),
    averageFrameMicros: requireInteger(fields, "g", 0, UINT32_MAX),
    worstFrameMicros: requireInteger(fields, "w", 0, UINT32_MAX),
    fpsTimesTen: requireInteger(fields, "p", 0, UINT32_MAX),
    modeChangeCount: requireInteger(fields, "x", 0, UINT32_MAX),
    wifiReady: requireBoolean(fields, "i"),
    particleConnected: requireBoolean(fields, "k"),
    lastOutOfMemoryBytes: requireInteger(fields, "o", INT32_MIN, INT32_MAX),
    outOfMemoryCount: requireInteger(fields, "z", 0, UINT32_MAX),
  };
}

// ----------------------------------------------------------------------------
// Parse l'etat courant versionne du cube.
//
// Parametres :
// - text : corps recu depuis `/api/v1/state`.
//
// Retour :
// - mode, reglages, couleurs, switches et etats reseau valides.
// ----------------------------------------------------------------------------
export function parseLanState(text: string): LanState {
  const fields = parseFields(text, "\n");
  requireVersion(fields, "v");
  const colors = parseColors(requireNonEmptyText(fields, "colors"));
  const switches = parseSwitches(requireNonEmptyText(fields, "switches"));
  return {
    schemaVersion: 1,
    modeId: requireInteger(fields, "m", INT32_MIN, INT32_MAX),
    modeName: requireNonEmptyText(fields, "name"),
    brightness: requireInteger(fields, "b", 1, 255),
    speedIndex: requireInteger(fields, "s", 0, 6),
    colors,
    switches,
    wifiReady: requireBoolean(fields, "i"),
    particleConnected: requireBoolean(fields, "k"),
    lastCommandResult: requireInteger(fields, "r", INT32_MIN, INT32_MAX),
  };
}

// ----------------------------------------------------------------------------
// Parse le catalogue historique des modes transporte par le LAN.
//
// Parametres :
// - text : corps segmente reconstruit par HTTP.
//
// Retour :
// - listes brutes et definitions fusionnees par index.
// ----------------------------------------------------------------------------
export function parseLanModes(text: string): LanModes {
  const fields = parseFields(text, "\n");
  requireVersion(fields, "v");
  const rawNames = requireNonEmptyText(fields, "names");
  const rawParameters = requireNonEmptyText(fields, "params");
  return {
    schemaVersion: 1,
    rawNames,
    rawParameters,
    modes: parseModeDefinitions(rawNames, rawParameters),
  };
}

// ----------------------------------------------------------------------------
// Parse les switches auxiliaires historiques transportes par le LAN.
//
// Parametres :
// - text : corps recu depuis `/api/v1/aux-switches`.
//
// Retour :
// - liste brute et switches metier deja normalises.
// ----------------------------------------------------------------------------
export function parseLanAuxSwitches(text: string): LanAuxSwitches {
  const fields = parseFields(text, "\n");
  requireVersion(fields, "v");
  const rawSwitches = requireText(fields, "switches");
  return {
    schemaVersion: 1,
    rawSwitches,
    switches: parseAuxSwitchList(rawSwitches),
  };
}

// ----------------------------------------------------------------------------
// Parse l'enveloppe commune retournee par une commande locale.
//
// Parametres :
// - text : corps recu depuis une route POST de commande.
//
// Retour :
// - version et code historique valides.
// ----------------------------------------------------------------------------
export function parseLanCommandResponse(text: string): LanCommandResponse {
  const fields = parseFields(text, "\n");
  requireVersion(fields, "v");
  return {
    protocolVersion: 1,
    result: requireInteger(fields, "result", INT32_MIN, INT32_MAX),
  };
}

// ----------------------------------------------------------------------------
// Separe un format clé-valeur borne en refusant les doublons.
//
// Parametres :
// - text : corps complet a separer.
// - separator : separateur de champs attendu.
//
// Retour :
// - table des champs connus ou inconnus, sans interpretation.
// ----------------------------------------------------------------------------
function parseFields(text: string, separator: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const rawField of text.trim().split(separator)) {
    if (rawField.length === 0) continue;
    const equalIndex = rawField.indexOf("=");
    if (equalIndex <= 0) throw new Error("Champ LAN malforme");
    const key = rawField.slice(0, equalIndex);
    if (fields.has(key)) throw new Error(`Champ LAN duplique: ${key}`);
    fields.set(key, rawField.slice(equalIndex + 1));
  }
  return fields;
}

// ----------------------------------------------------------------------------
// Valide la version 1 d'un format LAN.
//
// Parametres :
// - fields : table contenant la version.
// - key : cle de version a lire.
// ----------------------------------------------------------------------------
function requireVersion(fields: Map<string, string>, key: string): void {
  const version = requireInteger(fields, key, 1, INT32_MAX);
  if (version !== 1) throw new Error(`Version LAN non prise en charge: ${version}`);
}

// ----------------------------------------------------------------------------
// Lit un champ obligatoire sans interdire une valeur vide.
//
// Parametres :
// - fields : table des champs recus.
// - key : cle obligatoire.
//
// Retour :
// - valeur textuelle associee.
// ----------------------------------------------------------------------------
function requireText(fields: Map<string, string>, key: string): string {
  const value = fields.get(key);
  if (value === undefined) throw new Error(`Champ LAN manquant: ${key}`);
  return value;
}

// ----------------------------------------------------------------------------
// Lit un champ obligatoire et non vide.
//
// Parametres :
// - fields : table des champs recus.
// - key : cle obligatoire.
//
// Retour :
// - valeur textuelle non vide.
// ----------------------------------------------------------------------------
function requireNonEmptyText(fields: Map<string, string>, key: string): string {
  const value = requireText(fields, key);
  if (value.length === 0) throw new Error(`Champ LAN vide: ${key}`);
  return value;
}

// ----------------------------------------------------------------------------
// Lit un entier decimal obligatoire et borne.
//
// Parametres :
// - fields : table des champs recus.
// - key : cle numerique obligatoire.
// - minimum : plus petite valeur acceptee.
// - maximum : plus grande valeur acceptee.
//
// Retour :
// - entier valide.
// ----------------------------------------------------------------------------
function requireInteger(
  fields: Map<string, string>,
  key: string,
  minimum: number,
  maximum: number,
): number {
  const rawValue = requireText(fields, key);
  if (!/^-?\d+$/u.test(rawValue)) throw new Error(`Entier LAN invalide: ${key}`);
  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Entier LAN hors plage: ${key}`);
  }
  return value;
}

// ----------------------------------------------------------------------------
// Lit un booleen encode strictement par zero ou un.
//
// Parametres :
// - fields : table des champs recus.
// - key : cle booleenne obligatoire.
//
// Retour :
// - valeur booleenne validee.
// ----------------------------------------------------------------------------
function requireBoolean(fields: Map<string, string>, key: string): boolean {
  const value = requireInteger(fields, key, 0, 1);
  return value === 1;
}

// ----------------------------------------------------------------------------
// Valide les six couleurs RGB de l'etat.
//
// Parametres :
// - rawColors : couleurs separees par des points-virgules.
//
// Retour :
// - tuple de six couleurs uppercase.
// ----------------------------------------------------------------------------
function parseColors(rawColors: string): LanState["colors"] {
  const colors = rawColors.split(";");
  if (colors.length !== 6) throw new Error("Nombre de couleurs LAN invalide");
  for (const color of colors) {
    if (!RGB_PATTERN.test(color)) throw new Error("Couleur LAN invalide");
  }
  return colors as LanState["colors"];
}

// ----------------------------------------------------------------------------
// Valide les quatre switches locaux de l'etat.
//
// Parametres :
// - rawSwitches : valeurs separees par des points-virgules.
//
// Retour :
// - tuple de quatre booleens.
// ----------------------------------------------------------------------------
function parseSwitches(rawSwitches: string): LanState["switches"] {
  const values = rawSwitches.split(";");
  if (values.length !== 4) throw new Error("Nombre de switches LAN invalide");
  const switches: boolean[] = [];
  for (const value of values) {
    if (value !== "0" && value !== "1") throw new Error("Switch LAN invalide");
    switches.push(value === "1");
  }
  return switches as LanState["switches"];
}
