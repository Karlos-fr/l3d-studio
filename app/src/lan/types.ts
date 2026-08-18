// ============================================================================
// LanTypes - Declaration des contrats de lecture du firmware local
// ----------------------------------------------------------------------------
// Ce fichier decrit les reponses LAN deja exposees. Il ne lance aucun appel
// reseau et reutilise uniquement les types metier Spark Pixels existants.
// ============================================================================

import type {
  SparkPixelsAuxSwitch,
  SparkPixelsModeDefinition,
} from "../sparkpixels/types";

export interface LanHealth {
  protocolVersion: 1;
  firmwareRevision: string;
  deviceOsVersion: string;
  uptimeSeconds: number;
  wifiReady: boolean;
  particleConnected: boolean;
}

export interface LanDiagnostics {
  formatVersion: 1;
  sequence: number;
  modeId: number;
  uptimeSeconds: number;
  resetReason: number;
  resetReasonData: number;
  startupFreeMemory: number;
  freeMemory: number;
  minimumFreeMemory: number;
  frameMemoryBefore: number;
  frameMemoryAfter: number;
  modeMinimumFreeMemory: number;
  frameCount: number;
  lastFrameMicros: number;
  averageFrameMicros: number;
  worstFrameMicros: number;
  fpsTimesTen: number;
  modeChangeCount: number;
  wifiReady: boolean;
  particleConnected: boolean;
  lastOutOfMemoryBytes: number;
  outOfMemoryCount: number;
}

export interface LanState {
  schemaVersion: 1;
  modeId: number;
  modeName: string;
  brightness: number;
  speedIndex: number;
  colors: [string, string, string, string, string, string];
  switches: [boolean, boolean, boolean, boolean];
  wifiReady: boolean;
  particleConnected: boolean;
  lastCommandResult: number;
}

export interface LanModes {
  schemaVersion: 1;
  rawNames: string;
  rawParameters: string;
  modes: SparkPixelsModeDefinition[];
}

export interface LanAuxSwitches {
  schemaVersion: 1;
  rawSwitches: string;
  switches: SparkPixelsAuxSwitch[];
}
