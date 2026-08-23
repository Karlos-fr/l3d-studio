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

export type LanErrorCategory = "connection" | "timeout" | "protocol" | "command-refused";

export interface LanClientConfig {
  host: string;
  port?: number;
  timeoutMilliseconds?: number;
  fetchFn?: typeof fetch;
}

export interface LanCommandResponse {
  protocolVersion: 1;
  result: number;
}

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

// Moteur qui produit actuellement le framebuffer du cube.
export type LanPlaybackKind = "native" | "streaming" | "painting" | "procedural";

export interface LanState {
  schemaVersion: 1;
  modeId: number;
  modeName: string;
  playbackKind: LanPlaybackKind;
  brightness: number;
  speedIndex: number;
  colors: [string, string, string, string, string, string];
  switches: [boolean, boolean, boolean, boolean];
  wifiReady: boolean;
  particleConnected: boolean;
  wifiRssi: number | null;
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

export interface LanBytecodeStatus {
  protocolVersion: 1;
  layoutVersion: number;
  installed: boolean;
  slots: 1;
  capacityBytes: number;
  payloadMaximumBytes: number;
  usedBytes: number;
  freeBytes: number;
  bank: -1 | 0 | 1;
  generation: number;
  formatVersion: number;
  minimumVmVersion: number;
  capabilities: number;
  crc: number;
}

export interface LanClient {
  // Lit la sante legere du serveur.
  health(): Promise<LanHealth>;
  // Lit un instantane de diagnostics.
  diagnostics(): Promise<LanDiagnostics>;
  // Reinitialise les statistiques puis lit leur nouvel instantane.
  resetDiagnostics(): Promise<LanDiagnostics>;
  // Lit l'etat courant du cube.
  state(): Promise<LanState>;
  // Lit le catalogue des modes.
  modes(): Promise<LanModes>;
  // Lit les switches auxiliaires.
  auxSwitches(): Promise<LanAuxSwitches>;
  // Appelle le routeur generique.
  command(command: string): Promise<LanCommandResponse>;
  // Applique une commande de mode.
  mode(command: string): Promise<LanCommandResponse>;
  // Persiste le texte du firmware.
  text(text: string): Promise<LanCommandResponse>;
  // Envoie une frame RGB332 sans nouvelle tentative automatique.
  streamFrame(frame: Uint8Array, signal?: AbortSignal): Promise<LanCommandResponse>;
  // Envoie une frame RGB332 maintenue pour l'editeur de peinture.
  painterFrame(frame: Uint8Array, signal?: AbortSignal): Promise<LanCommandResponse>;
  // Lit les capacites et le programme bytecode eventuellement installe.
  bytecodeStatus(): Promise<LanBytecodeStatus>;
  // Relit le conteneur binaire persistant.
  bytecodeProgram(): Promise<Uint8Array>;
  // Installe un conteneur binaire puis retourne son statut confirme.
  installBytecode(program: Uint8Array): Promise<LanBytecodeStatus>;
  // Supprime le programme persistant.
  deleteBytecode(): Promise<LanBytecodeStatus>;
  // Lance le programme persistant.
  runBytecode(): Promise<LanCommandResponse>;
  // Arrete le mode bytecode de facon idempotente.
  stopBytecode(): Promise<LanCommandResponse>;
}
