// ============================================================================
// SparkPixelsParsers - Implementation des parseurs Spark Pixels
// ----------------------------------------------------------------------------
// Ce fichier parsera les variables compactes publiees par SparkPixelsMega. Il
// ne construit pas de commandes et ne manipule pas le DOM.
// ============================================================================

import type { SparkPixelsModeSummary } from "./types";

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
