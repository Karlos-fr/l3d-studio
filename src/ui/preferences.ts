// ============================================================================
// UiPreferences - Implementation des preferences locales
// ----------------------------------------------------------------------------
// Ce fichier persiste les derniers reglages de l'interface dans localStorage. Il
// ne stocke pas les identifiants Particle et ne lance aucun appel reseau.
// ============================================================================

import type { ParticleSessionStorage } from "../particle/session";
import type { AppState } from "./state";

export interface AppPreferences {
  selectedModeName: string | null;
  brightnessPercent: number;
  speedIndex: number;
  colorValues: string[];
  switchValues: boolean[];
  textValue: string;
}

// Cle localStorage utilisee pour les preferences UI de L3D Studio.
const UI_PREFERENCES_STORAGE_KEY = "l3d-studio.ui.preferences";

// ----------------------------------------------------------------------------
// Charge les preferences UI depuis le stockage local.
//
// Parametres :
// - storage : stockage compatible localStorage.
//
// Retour :
// - preferences locales, ou `null` si absentes ou illisibles.
// ----------------------------------------------------------------------------
export function loadAppPreferences(storage: ParticleSessionStorage): AppPreferences | null {
  const rawValue = storage.getItem(UI_PREFERENCES_STORAGE_KEY);

  if (rawValue === null) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AppPreferences;
  } catch {
    storage.removeItem(UI_PREFERENCES_STORAGE_KEY);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Sauvegarde les preferences UI depuis l'etat applicatif courant.
//
// Parametres :
// - storage : stockage compatible localStorage.
// - state : etat applicatif source.
//
// Effet de bord :
// - ecrit les reglages locaux serialises dans le stockage.
// ----------------------------------------------------------------------------
export function saveAppPreferences(storage: ParticleSessionStorage, state: AppState): void {
  const preferences: AppPreferences = {
    selectedModeName: state.selectedModeName,
    brightnessPercent: state.currentBrightnessPercent,
    speedIndex: state.currentSpeedIndex,
    colorValues: state.colorValues,
    switchValues: state.switchValues,
    textValue: state.textValue,
  };

  storage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
