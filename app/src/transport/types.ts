// ============================================================================
// TransportTypes - Declaration de l'abstraction Spark Pixels
// ----------------------------------------------------------------------------
// Ce fichier decrit les operations communes LAN et Particle. Il ne lance aucun
// appel reseau et ne connait pas le DOM de l'application.
// ============================================================================

import type { SparkPixelsAuxSwitch, SparkPixelsDeviceInfoEntry, SparkPixelsModeDefinition } from "../sparkpixels/types";
import type { LanDiagnostics } from "../lan/types";

export type TransportPreference = "automatic" | "lan" | "particle";

export type TransportKind = "lan" | "particle";

export interface TransportResult<TValue> {
  source: TransportKind;
  value: TValue;
  dataOperations?: number;
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
  brightness: number;
  speedIndex: number;
  colors: string[];
  switches: boolean[];
  modes: SparkPixelsModeDefinition[];
  auxSwitches: SparkPixelsAuxSwitch[];
  deviceInfoEntries: SparkPixelsDeviceInfoEntry[];
  wifiRssi: number | null;
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
  // Envoie une commande CubePainter.
  sendCubePainter(command: string): Promise<TransportResult<SparkPixelsCommandResult>>;
}
