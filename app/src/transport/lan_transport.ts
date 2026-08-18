// ============================================================================
// LanTransport - Implementation du transport Spark Pixels local
// ----------------------------------------------------------------------------
// Ce fichier adapte le client LAN aux types metier communs. Il ne choisit pas
// le transport et ne connait ni Particle Cloud ni le DOM.
// ============================================================================

import type { LanClient, LanCommandResponse } from "../lan/types";
import type {
  SparkPixelsCommandResult,
  SparkPixelsTransport,
  TransportResult,
} from "./types";

// ----------------------------------------------------------------------------
// Cree l'adaptateur Spark Pixels utilisant exclusivement le LAN.
//
// Parametres :
// - client : client HTTP local configure.
//
// Retour :
// - transport commun dont chaque resultat indique la source LAN.
// ----------------------------------------------------------------------------
export function createLanTransport(client: LanClient): SparkPixelsTransport {
  return {
    async readCube() {
      const [state, modes, auxSwitches] = await Promise.all([
        client.state(),
        client.modes(),
        client.auxSwitches(),
      ]);
      return {
        source: "lan",
        value: {
          modeName: state.modeName,
          brightness: state.brightness,
          speedIndex: state.speedIndex,
          colors: [...state.colors],
          switches: [...state.switches],
          modes: modes.modes,
          auxSwitches: auxSwitches.switches,
          deviceInfoEntries: [],
          wifiRssi: null,
          debugMessage: null,
        },
      };
    },

    async readAuxSwitches() {
      const response = await client.auxSwitches();
      return { source: "lan", value: response.switches };
    },

    async readDiagnostics() {
      return { source: "lan", value: await client.diagnostics(), dataOperations: 0 };
    },

    async resetDiagnostics() {
      return { source: "lan", value: await client.resetDiagnostics(), dataOperations: 0 };
    },

    sendCommand: (command) => mapLanCommand(client.command(command)),
    sendMode: (command) => mapLanCommand(client.mode(command)),
    sendText: (text) => mapLanCommand(client.text(text)),
    sendCubePainter: (command) => mapLanCommand(client.cubePainter(command)),
  };
}

// ----------------------------------------------------------------------------
// Convertit une enveloppe LAN vers le resultat commun.
//
// Parametres :
// - responsePromise : reponse asynchrone du client local.
//
// Retour :
// - resultat historique marque comme provenant du LAN.
// ----------------------------------------------------------------------------
async function mapLanCommand(
  responsePromise: Promise<LanCommandResponse>,
): Promise<TransportResult<SparkPixelsCommandResult>> {
  const response = await responsePromise;
  return { source: "lan", value: { result: response.result } };
}
