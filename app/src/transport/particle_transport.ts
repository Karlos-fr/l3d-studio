// ============================================================================
// ParticleTransport - Implementation du transport Spark Pixels Cloud
// ----------------------------------------------------------------------------
// Ce fichier adapte les variables et fonctions Particle au contrat commun. Il
// ne choisit pas le transport et ne connait pas le DOM.
// ============================================================================

import type { ParticleClient } from "../particle/client";
import { parseAuxSwitchList, parseDeviceInfo, parseModeDefinitions } from "../sparkpixels/parsers";
import type {
  SparkPixelsCommandResult,
  SparkPixelsTransport,
  TransportResult,
} from "./types";
import { SparkPixelsCommandRefusedError } from "./types";

// ----------------------------------------------------------------------------
// Cree l'adaptateur Spark Pixels utilisant un device Particle precis.
//
// Parametres :
// - client : client Particle authentifie.
// - deviceId : identifiant du Photon cible.
//
// Retour :
// - transport commun dont chaque resultat indique la source Particle.
// ----------------------------------------------------------------------------
export function createParticleTransport(
  client: ParticleClient,
  deviceId: string,
): SparkPixelsTransport {
  return {
    async readCube() {
      const [
        modeName,
        brightness,
        speedIndex,
        modeList,
        modeParamList,
        auxSwitchList,
        deviceInfo,
        wifiRssi,
        debugMessage,
      ] = await Promise.all([
        client.getVariable<string>(deviceId, "mode"),
        client.getVariable<number>(deviceId, "brightness"),
        client.getVariable<number>(deviceId, "speed"),
        client.getVariable<string>(deviceId, "modeList"),
        client.getVariable<string>(deviceId, "modeParmList"),
        client.getVariable<string>(deviceId, "auxSwtchList"),
        client.getVariable<string>(deviceId, "deviceInfo"),
        client.getVariable<number>(deviceId, "wifi"),
        client.getVariable<string>(deviceId, "debug"),
      ]);
      return {
        source: "particle",
        value: {
          modeName,
          brightness,
          speedIndex,
          colors: [],
          switches: [],
          modes: parseModeDefinitions(modeList, modeParamList),
          auxSwitches: parseAuxSwitchList(auxSwitchList),
          deviceInfoEntries: parseDeviceInfo(deviceInfo),
          wifiRssi,
          debugMessage: debugMessage.length === 0 ? null : debugMessage,
        },
      };
    },

    async readAuxSwitches() {
      const rawSwitches = await client.getVariable<string>(deviceId, "auxSwtchList");
      return { source: "particle", value: parseAuxSwitchList(rawSwitches) };
    },

    sendCommand: (command) => callParticleFunction(client, deviceId, "Function", command),
    sendMode: (command) => callParticleFunction(client, deviceId, "SetMode", command),
    sendText: (text) => callParticleFunction(client, deviceId, "SetText", text),
    sendCubePainter: (command) => callParticleFunction(client, deviceId, "CubePainter", command),
  };
}

// ----------------------------------------------------------------------------
// Appelle une fonction Particle et exige son code historique.
//
// Parametres :
// - client : client Particle authentifie.
// - deviceId : identifiant du Photon.
// - functionName : fonction Cloud exposee.
// - command : corps historique a transmettre.
//
// Retour :
// - resultat marque comme provenant de Particle.
// ----------------------------------------------------------------------------
async function callParticleFunction(
  client: ParticleClient,
  deviceId: string,
  functionName: string,
  command: string,
): Promise<TransportResult<SparkPixelsCommandResult>> {
  const response = await client.callFunction(deviceId, functionName, command);
  if (typeof response.return_value !== "number") {
    throw new Error("Particle n'a retourne aucun code de commande.");
  }
  if (response.return_value < 0) {
    throw new SparkPixelsCommandRefusedError("particle", response.return_value);
  }
  return { source: "particle", value: { result: response.return_value } };
}
