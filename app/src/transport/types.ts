// ============================================================================
// TransportTypes - Declaration de l'abstraction Spark Pixels
// ----------------------------------------------------------------------------
// Ce fichier decrit les operations du serveur LAN. Il ne lance aucun
// appel reseau et ne connait pas le DOM de l'application.
// ============================================================================

import type { SparkPixelsAuxSwitch, SparkPixelsModeDefinition } from "../sparkpixels/types";
import type { LanDiagnostics, LanPlaybackKind } from "../lan/types";

export type TransportKind = "lan";

export interface TransportResult<TValue> {
  source: TransportKind;
  value: TValue;
}

export interface SparkPixelsCommandResult {
  result: number;
}

export class SparkPixelsCommandRefusedError extends Error {
  readonly source: TransportKind;
  readonly result: number;

  // ----------------------------------------------------------------------------
  // Construit une erreur commune depuis un code firmware negatif.
  //
  // Parametres :
  // - source : transport ayant execute la commande.
  // - result : code historique negatif retourne par le firmware.
  // ----------------------------------------------------------------------------
  constructor(source: TransportKind, result: number) {
    super(`Commande ${source} refusee (${result}).`);
    this.name = "SparkPixelsCommandRefusedError";
    this.source = source;
    this.result = result;
  }
}

export interface SparkPixelsCubeSnapshot {
  modeName: string;
  playbackKind: LanPlaybackKind;
  brightness: number;
  speedIndex: number;
  colors: string[];
  switches: boolean[];
  modes: SparkPixelsModeDefinition[];
  auxSwitches: SparkPixelsAuxSwitch[];
  wifiRssi: number | null;
  wifiReady: boolean;
  particleConnected: boolean;
  lastCommandResult: number;
  firmwareRevision: string;
  deviceOsVersion: string;
  uptimeSeconds: number;
  debugMessage: string | null;
}

export interface SparkPixelsTransport {
  // Reconstruit l'etat et les capacites du cube.
  readCube(): Promise<TransportResult<SparkPixelsCubeSnapshot>>;
  // Relit les switches auxiliaires apres une commande.
  readAuxSwitches(): Promise<TransportResult<SparkPixelsAuxSwitch[]>>;
  // Lit un nouvel echantillon de diagnostics sans reinitialisation.
  readDiagnostics(): Promise<TransportResult<LanDiagnostics>>;
  // Reinitialise explicitement les minimums puis renvoie leur echantillon.
  resetDiagnostics(): Promise<TransportResult<LanDiagnostics>>;
  // Appelle le routeur generique.
  sendCommand(command: string): Promise<TransportResult<SparkPixelsCommandResult>>;
  // Applique une commande de mode.
  sendMode(command: string): Promise<TransportResult<SparkPixelsCommandResult>>;
  // Persiste le texte partage.
  sendText(text: string): Promise<TransportResult<SparkPixelsCommandResult>>;
}
