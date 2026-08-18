// ============================================================================
// ParticleTransport - Implementation du transport Spark Pixels Cloud
// ----------------------------------------------------------------------------
// Ce fichier adapte les variables et fonctions Particle au contrat commun. Il
// ne choisit pas le transport et ne connait pas le DOM.
// ============================================================================

import type { ParticleClient } from "../particle/client";
import { parseAuxSwitchList, parseDeviceInfo, parseModeDefinitions } from "../sparkpixels/parsers";
import { parseLanDiagnostics } from "../lan/parsers";
import type { LanDiagnostics } from "../lan/types";
import type {
  SparkPixelsCommandResult,
  SparkPixelsTransport,
  TransportResult,
} from "./types";
import { SparkPixelsCommandRefusedError } from "./types";

// Nombre maximal de lectures de deviceInfo pour retrouver une sequence.
const PARTICLE_DIAGNOSTICS_READ_ATTEMPTS = 8;

// Pause entre deux lectures Particle d'un diagnostic encore ancien.
const PARTICLE_DIAGNOSTICS_RETRY_MILLISECONDS = 750;

// Duree maximale de toute la sequence Cloud, lectures de rattrapage incluses.
const PARTICLE_DIAGNOSTICS_TIMEOUT_MILLISECONDS = 15_000;

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

    readDiagnostics: () => readParticleDiagnostics(client, deviceId, false),
    resetDiagnostics: () => readParticleDiagnostics(client, deviceId, true),

    sendCommand: (command) => callParticleFunction(client, deviceId, "Function", command),
    sendMode: (command) => callParticleFunction(client, deviceId, "SetMode", command),
    sendText: (text) => callParticleFunction(client, deviceId, "SetText", text),
    sendCubePainter: (command) => callParticleFunction(client, deviceId, "CubePainter", command),
  };
}

// ----------------------------------------------------------------------------
// Demande un diagnostic Particle puis attend sa sequence dans deviceInfo.
//
// Parametres :
// - client : client Particle authentifie.
// - deviceId : identifiant du Photon cible.
// - resetRequested : vrai pour demander RESETDIAG au lieu de GETDIAG.
//
// Retour :
// - echantillon correspondant et estimation exacte des appels Cloud effectues.
// ----------------------------------------------------------------------------
async function readParticleDiagnostics(
  client: ParticleClient,
  deviceId: string,
  resetRequested: boolean,
): Promise<TransportResult<LanDiagnostics>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    PARTICLE_DIAGNOSTICS_TIMEOUT_MILLISECONDS,
  );
  try {
    return await requestParticleDiagnostics(
      client,
      deviceId,
      resetRequested,
      controller.signal,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// ----------------------------------------------------------------------------
// Execute la sequence Particle sous le signal d'annulation du timeout global.
//
// Parametres :
// - client : client Particle authentifie.
// - deviceId : identifiant du Photon cible.
// - resetRequested : vrai pour remettre les minimums a zero.
// - signal : annulation partagee par tous les appels de la sequence.
//
// Retour :
// - diagnostic portant exactement la sequence demandee.
// ----------------------------------------------------------------------------
async function requestParticleDiagnostics(
  client: ParticleClient,
  deviceId: string,
  resetRequested: boolean,
  signal: AbortSignal,
): Promise<TransportResult<LanDiagnostics>> {
  const command = resetRequested ? "RESETDIAG" : "GETDIAG";
  const commandResponse = await client.callFunction(deviceId, "Function", command, signal);
  const expectedSequence = commandResponse.return_value;
  if (typeof expectedSequence !== "number" || expectedSequence < 0) {
    throw new Error("Particle n'a pas accepte la demande de diagnostics.");
  }

  for (let attempt = 0; attempt < PARTICLE_DIAGNOSTICS_READ_ATTEMPTS; attempt += 1) {
    const rawDiagnostics = await client.getVariable<string>(deviceId, "deviceInfo", signal);
    try {
      const diagnostics = parseLanDiagnostics(rawDiagnostics);
      if (diagnostics.sequence === expectedSequence) {
        return { source: "particle", value: diagnostics, dataOperations: attempt + 2 };
      }
    } catch {
      // Le buffer peut encore contenir les informations historiques non compactes.
    }
    if (attempt + 1 < PARTICLE_DIAGNOSTICS_READ_ATTEMPTS) {
      await waitForParticleDiagnostics(signal);
    }
  }
  throw new Error(`Diagnostic Particle ${expectedSequence} indisponible apres attente.`);
}

// ----------------------------------------------------------------------------
// Attend avant une nouvelle lecture Particle afin de ne pas lancer de rafale.
//
// Retour :
// - promesse resolue apres la pause fixe.
// ----------------------------------------------------------------------------
function waitForParticleDiagnostics(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // Interrompt aussi la pause afin que le timeout borne toute la sequence.
    const timeoutId = setTimeout(resolve, PARTICLE_DIAGNOSTICS_RETRY_MILLISECONDS);
    signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      reject(signal.reason ?? new DOMException("Diagnostic Particle interrompu.", "AbortError"));
    }, { once: true });
  });
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
