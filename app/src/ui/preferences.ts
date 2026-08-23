// ============================================================================
// UiPreferences - Implementation des preferences locales
// ----------------------------------------------------------------------------
// Ce fichier persiste les derniers reglages de l'interface dans localStorage. Il
// ne stocke pas les identifiants Particle et ne lance aucun appel reseau.
// ============================================================================

import type { AppState } from "./state";

// Contrat minimal de stockage utilise par les preferences locales.
export interface AppPreferencesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AppPreferences {
  lanHost?: string;
  lanPort?: number;
  selectedModeName: string | null;
  brightnessPercent: number;
  speedIndex: number;
  colorValues: string[];
  switchValues: boolean[];
  textValue: string;
  persistentTextValue?: string;
  timezoneOffset?: number;
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
export function loadAppPreferences(storage: AppPreferencesStorage): AppPreferences | null {
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
export function saveAppPreferences(storage: AppPreferencesStorage, state: AppState): void {
  const preferences: AppPreferences = {
    lanHost: state.lanHost,
    lanPort: state.lanPort,
    selectedModeName: state.selectedModeName,
    brightnessPercent: state.currentBrightnessPercent,
    speedIndex: state.currentSpeedIndex,
    colorValues: state.colorValues,
    switchValues: state.switchValues,
    textValue: state.textValue,
    persistentTextValue: state.persistentTextValue,
    timezoneOffset: state.timezoneOffset,
  };

  storage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
