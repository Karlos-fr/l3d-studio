// ============================================================================
// SparkPixelsParsers - Implementation des parseurs Spark Pixels
// ----------------------------------------------------------------------------
// Ce fichier parse les variables compactes publiees par SparkPixelsMega. Il
// ne construit pas de commandes et ne manipule pas le DOM.
// ============================================================================

import type {
  SparkPixelsAuxSwitch,
  SparkPixelsModeDefinition,
  SparkPixelsModeParameters,
  SparkPixelsModeSummary,
} from "./types";

// Expression reguliere des titres de switches entre guillemets.
const QUOTED_SWITCH_LABEL_PATTERN = /"([^"]*)"/g;

// Expression reguliere du nombre de couleurs declare par un mode.
const COLOR_COUNT_PATTERN = /(?:^|,)C:(\d+)/;

// Expression reguliere du nombre de switches declare par un mode.
const SWITCH_COUNT_PATTERN = /(?:^|,)S:(\d+)/;

// ----------------------------------------------------------------------------
// Parse une liste de modes separee par des points-virgules.
//
// Parametres :
// - modeList : chaine publiee par la variable Particle `modeList`.
//
// Retour :
// - liste de modes avec leur nom et leur position dans la liste firmware.
// ----------------------------------------------------------------------------
export function parseModeList(modeList: string): SparkPixelsModeSummary[] {
  return modeList
    .split(";")
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .map((name, index) => ({
      name,
      index,
    }));
}

// ----------------------------------------------------------------------------
// Parse la liste de parametres parallele a `modeList`.
//
// Parametres :
// - modeParamList : chaine publiee par la variable Particle `modeParmList`.
//
// Retour :
// - liste de parametres de mode dans l'ordre firmware.
// ----------------------------------------------------------------------------
export function parseModeParamList(modeParamList: string): SparkPixelsModeParameters[] {
  return modeParamList
    .split(";")
    .map((rawEntry) => rawEntry.trim())
    .filter((rawEntry) => rawEntry.length > 0)
    .map(parseModeParamEntry);
}

// ----------------------------------------------------------------------------
// Fusionne `modeList` et `modeParmList` en definitions de modes exploitables.
//
// Parametres :
// - modeList : chaine publiee par la variable Particle `modeList`.
// - modeParamList : chaine publiee par la variable Particle `modeParmList`.
//
// Retour :
// - liste de modes avec leurs parametres associes par index.
// ----------------------------------------------------------------------------
export function parseModeDefinitions(
  modeList: string,
  modeParamList: string,
): SparkPixelsModeDefinition[] {
  const modes = parseModeList(modeList);
  const parameters = parseModeParamList(modeParamList);

  return modes.map((mode) => ({
    ...mode,
    parameters: parameters[mode.index] ?? createEmptyModeParameters(""),
  }));
}

// ----------------------------------------------------------------------------
// Parse la liste des interrupteurs auxiliaires globaux.
//
// Parametres :
// - auxSwitchList : chaine publiee par la variable Particle `auxSwtchList`.
//
// Retour :
// - liste d'interrupteurs auxiliaires globaux.
// ----------------------------------------------------------------------------
export function parseAuxSwitchList(auxSwitchList: string): SparkPixelsAuxSwitch[] {
  return auxSwitchList
    .split(";")
    .map((rawEntry) => rawEntry.trim())
    .filter((rawEntry) => rawEntry.length > 0)
    .map(parseAuxSwitchEntry)
    .filter((auxSwitch): auxSwitch is SparkPixelsAuxSwitch => auxSwitch !== null);
}

// ----------------------------------------------------------------------------
// Parse une entree de parametres de mode.
//
// Parametres :
// - rawEntry : entree compacte issue de `modeParmList`.
//
// Retour :
// - parametres normalises du mode.
// ----------------------------------------------------------------------------
function parseModeParamEntry(rawEntry: string): SparkPixelsModeParameters {
  if (rawEntry === "N") {
    return createEmptyModeParameters(rawEntry);
  }

  return {
    colorCount: parseCount(rawEntry, COLOR_COUNT_PATTERN),
    switchLabels: parseSwitchLabels(rawEntry),
    acceptsText: rawEntry.includes("T:"),
    raw: rawEntry,
  };
}

// ----------------------------------------------------------------------------
// Cree des parametres de mode vides.
//
// Parametres :
// - raw : entree brute associee aux parametres.
//
// Retour :
// - parametres sans couleur, sans switch et sans texte.
// ----------------------------------------------------------------------------
function createEmptyModeParameters(raw: string): SparkPixelsModeParameters {
  return {
    colorCount: 0,
    switchLabels: [],
    acceptsText: false,
    raw,
  };
}

// ----------------------------------------------------------------------------
// Extrait un compteur numerique depuis une entree compacte.
//
// Parametres :
// - rawEntry : entree compacte a inspecter.
// - pattern : expression reguliere contenant le compteur dans le groupe 1.
//
// Retour :
// - compteur trouve, ou 0 si absent.
// ----------------------------------------------------------------------------
function parseCount(rawEntry: string, pattern: RegExp): number {
  const match = rawEntry.match(pattern);

  if (match === null) {
    return 0;
  }

  return Number.parseInt(match[1] ?? "0", 10);
}

// ----------------------------------------------------------------------------
// Extrait les titres de switches locaux depuis une entree compacte.
//
// Parametres :
// - rawEntry : entree compacte issue de `modeParmList`.
//
// Retour :
// - titres des switches dans l'ordre firmware.
// ----------------------------------------------------------------------------
function parseSwitchLabels(rawEntry: string): string[] {
  const switchCount = parseCount(rawEntry, SWITCH_COUNT_PATTERN);

  if (switchCount === 0) {
    return [];
  }

  const labels = Array.from(rawEntry.matchAll(QUOTED_SWITCH_LABEL_PATTERN), (match) => {
    return match[1] ?? "";
  });

  return labels.slice(0, switchCount);
}

// ----------------------------------------------------------------------------
// Parse une entree d'interrupteur auxiliaire.
//
// Parametres :
// - rawEntry : entree compacte issue de `auxSwtchList`.
//
// Retour :
// - interrupteur auxiliaire, ou `null` si l'entree est incomplete.
// ----------------------------------------------------------------------------
function parseAuxSwitchEntry(rawEntry: string): SparkPixelsAuxSwitch | null {
  const parts = rawEntry.split(",");

  if (parts.length < 5) {
    return null;
  }

  return {
    id: Number.parseInt(parts[0] ?? "0", 10),
    title: parts[1] ?? "",
    onName: parts[2] ?? "",
    offName: parts[3] ?? "",
    enabled: (parts[4] ?? "0") === "1",
    raw: rawEntry,
  };
}
