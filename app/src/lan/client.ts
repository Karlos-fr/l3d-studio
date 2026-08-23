// ============================================================================
// LanClient - Implementation du client HTTP local du Photon
// ----------------------------------------------------------------------------
// Ce fichier borne les appels fetch et parse les reponses LAN. Il ne connait
// ni Particle Cloud, ni le DOM, ni la strategie de choix du transport.
// ============================================================================

import {
  parseLanAuxSwitches,
  parseLanBytecodeStatus,
  parseLanCommandResponse,
  parseLanDiagnostics,
  parseLanHealth,
  parseLanModes,
  parseLanState,
} from "./parsers";
import type {
  LanClient,
  LanClientConfig,
  LanCommandResponse,
  LanBytecodeStatus,
  LanErrorCategory,
} from "./types";

// Port contractuel du serveur local lorsque l'utilisateur ne le precise pas.
const DEFAULT_LAN_PORT = 8080;

// Timeout qui borne chaque appel local par defaut.
const DEFAULT_LAN_TIMEOUT_MILLISECONDS = 5_000;

// Expression des noms DNS, noms locaux et adresses IPv4 acceptes.
const LAN_HOST_PATTERN = /^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\d{1,3}(?:\.\d{1,3}){3})$/iu;

// Expression qui identifie une adresse IPv4 avant validation de ses octets.
const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/u;

export class LanClientError extends Error {
  readonly category: LanErrorCategory;
  readonly status: number | null;
  readonly result: number | null;
  readonly requestDispatched: boolean;

  // ----------------------------------------------------------------------------
  // Construit une erreur LAN classee pour la strategie de transport.
  //
  // Parametres :
  // - message : description lisible de l'echec.
  // - category : famille stable exploitable par l'interface.
  // - status : statut HTTP lorsqu'une reponse existe.
  // - result : code firmware lorsqu'une commande a ete refusee.
  // - requestDispatched : vrai lorsqu'un POST a pu atteindre le Photon.
  // ----------------------------------------------------------------------------
  constructor(
    message: string,
    category: LanErrorCategory,
    status: number | null,
    result: number | null,
    requestDispatched: boolean,
  ) {
    super(message);
    this.name = "LanClientError";
    this.category = category;
    this.status = status;
    this.result = result;
    this.requestDispatched = requestDispatched;
  }
}

// ----------------------------------------------------------------------------
// Normalise une adresse Photon sans autoriser de chemin ni d'identifiants.
//
// Parametres :
// - value : nom local, adresse IPv4 ou URL HTTP sans chemin.
//
// Retour :
// - hote seul, sans protocole ni barre finale.
// ----------------------------------------------------------------------------
export function normalizeLanHost(value: string): string {
  const trimmedValue = value.trim();
  const withoutScheme = trimmedValue.replace(/^http:\/\//iu, "");
  if (
    withoutScheme.length === 0 ||
    withoutScheme.includes("/") ||
    withoutScheme.includes("?") ||
    withoutScheme.includes("#") ||
    withoutScheme.includes("@") ||
    withoutScheme.includes(":") ||
    !LAN_HOST_PATTERN.test(withoutScheme)
  ) {
    throw new Error("Adresse LAN invalide : indique un nom ou une IPv4 sans chemin.");
  }
  if (
    IPV4_PATTERN.test(withoutScheme) &&
    hasInvalidIpv4Octet(withoutScheme)
  ) {
    throw new Error("Adresse LAN invalide : un octet IPv4 depasse 255.");
  }
  return withoutScheme.toLowerCase();
}

// ----------------------------------------------------------------------------
// Indique si une adresse IPv4 contient un octet superieur a 255.
//
// Parametres :
// - value : adresse deja reconnue par l'expression IPv4.
//
// Retour :
// - vrai lorsqu'au moins un octet sort de la plage IPv4.
// ----------------------------------------------------------------------------
function hasInvalidIpv4Octet(value: string): boolean {
  for (const octet of value.split(".")) {
    if (Number.parseInt(octet, 10) > 255) return true;
  }
  return false;
}

// ----------------------------------------------------------------------------
// Valide un port TCP utilisateur.
//
// Parametres :
// - value : port entier a controler.
//
// Retour :
// - port compris entre 1 et 65535.
// ----------------------------------------------------------------------------
export function normalizeLanPort(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error("Port LAN invalide : utilise une valeur de 1 a 65535.");
  }
  return value;
}

// ----------------------------------------------------------------------------
// Cree un client HTTP local configure pour un Photon.
//
// Parametres :
// - config : hote, port, timeout et implementation fetch optionnelle.
//
// Retour :
// - client type couvrant toutes les routes LAN version 1.
// ----------------------------------------------------------------------------
export function createLanClient(config: LanClientConfig): LanClient {
  const host = normalizeLanHost(config.host);
  const port = normalizeLanPort(config.port ?? DEFAULT_LAN_PORT);
  const timeoutMilliseconds = config.timeoutMilliseconds ?? DEFAULT_LAN_TIMEOUT_MILLISECONDS;
  const fetchFn = config.fetchFn ?? fetch;
  const baseUrl = `http://${host}:${port}/api/v1`;

  return {
    // Lit et parse la sante sans effet de bord.
    health: () => requestLan(fetchFn, baseUrl, "/health", "GET", "", timeoutMilliseconds, parseLanHealth),
    // Lit les diagnostics courants.
    diagnostics: () =>
      requestLan(fetchFn, baseUrl, "/diagnostics", "GET", "", timeoutMilliseconds, parseLanDiagnostics),
    // Reinitialise explicitement les diagnostics.
    resetDiagnostics: () =>
      requestLan(fetchFn, baseUrl, "/diagnostics/reset", "POST", "", timeoutMilliseconds, parseLanDiagnostics),
    // Lit l'etat courant du cube.
    state: () => requestLan(fetchFn, baseUrl, "/state", "GET", "", timeoutMilliseconds, parseLanState),
    // Lit le catalogue historique des modes.
    modes: () => requestLan(fetchFn, baseUrl, "/modes", "GET", "", timeoutMilliseconds, parseLanModes),
    // Lit les switches auxiliaires historiques.
    auxSwitches: () =>
      requestLan(fetchFn, baseUrl, "/aux-switches", "GET", "", timeoutMilliseconds, parseLanAuxSwitches),
    // Transmet une commande au routeur generique.
    command: (command: string) => postCommand(fetchFn, baseUrl, "/command", command, timeoutMilliseconds),
    // Transmet une commande SetMode.
    mode: (command: string) => postCommand(fetchFn, baseUrl, "/mode", command, timeoutMilliseconds),
    // Transmet le texte persistant.
    text: (text: string) => postCommand(fetchFn, baseUrl, "/text", text, timeoutMilliseconds),
    // Transmet une frame RGB332 binaire complete.
    streamFrame: (frame: Uint8Array, signal?: AbortSignal) =>
      postRgb332Frame(fetchFn, baseUrl, "/stream/frame", frame, timeoutMilliseconds, signal),
    // Transmet une frame RGB332 conservee sans timeout par le firmware.
    painterFrame: (frame: Uint8Array, signal?: AbortSignal) =>
      postRgb332Frame(fetchFn, baseUrl, "/painter/frame", frame, timeoutMilliseconds, signal),
    // Lit les capacites du stockage bytecode local.
    bytecodeStatus: () =>
      requestLan(fetchFn, baseUrl, "/bytecode", "GET", "", timeoutMilliseconds, parseLanBytecodeStatus),
    // Relit le conteneur binaire installe.
    bytecodeProgram: () => getBytecodeProgram(fetchFn, baseUrl, timeoutMilliseconds),
    // Installe le conteneur dans la banque inactive.
    installBytecode: (program: Uint8Array) =>
      postBytecodeProgram(fetchFn, baseUrl, program, timeoutMilliseconds),
    // Invalide les deux banques transactionnelles.
    deleteBytecode: () =>
      requestLan(fetchFn, baseUrl, "/bytecode/delete", "POST", "", timeoutMilliseconds, parseLanBytecodeStatus),
    // Lance le mode bytecode sans repli Particle.
    runBytecode: () =>
      requestLan(fetchFn, baseUrl, "/bytecode/run", "POST", "", timeoutMilliseconds, parseLanCommandResponse),
    // Revient au mode Off sans repli Particle.
    stopBytecode: () =>
      requestLan(fetchFn, baseUrl, "/bytecode/stop", "POST", "", timeoutMilliseconds, parseLanCommandResponse),
  };
}

// ----------------------------------------------------------------------------
// Relit un conteneur bytecode binaire depuis le Photon.
//
// Parametres :
// - fetchFn : implementation fetch utilisee.
// - baseUrl : racine locale versionnee.
// - timeoutMilliseconds : duree maximale de l'appel.
//
// Retour :
// - copie bornee du conteneur persistant.
// ----------------------------------------------------------------------------
async function getBytecodeProgram(
  fetchFn: typeof fetch,
  baseUrl: string,
  timeoutMilliseconds: number,
): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMilliseconds);
  try {
    const response = await fetchFn(`${baseUrl}/bytecode/program`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) {
      const responseText = await response.text();
      const errorCode = readLanTransportError(responseText);
      throw new LanClientError(
        errorCode === null ? `Erreur LAN HTTP ${response.status}.` : `Lecture bytecode refusee (${errorCode}).`,
        errorCode === null ? "protocol" : "command-refused",
        response.status,
        errorCode,
        false,
      );
    }
    const contentType = response.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/octet-stream") {
      throw new LanClientError("Media type bytecode LAN invalide.", "protocol", response.status, null, false);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 197) {
      throw new LanClientError("Longueur bytecode LAN invalide.", "protocol", response.status, null, false);
    }
    return bytes;
  } catch (error) {
    if (error instanceof LanClientError) throw error;
    if (controller.signal.aborted) {
      throw new LanClientError("Delai LAN depasse.", "timeout", null, null, false);
    }
    throw new LanClientError("Photon inaccessible sur le LAN.", "connection", null, null, false);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ----------------------------------------------------------------------------
// Installe un conteneur bytecode sans repli vers Particle Cloud.
//
// Parametres :
// - fetchFn : implementation fetch utilisee.
// - baseUrl : racine locale versionnee.
// - program : conteneur valide a copier dans le corps HTTP.
// - timeoutMilliseconds : duree maximale de l'appel.
//
// Retour :
// - statut relu par le firmware apres activation de la nouvelle banque.
// ----------------------------------------------------------------------------
async function postBytecodeProgram(
  fetchFn: typeof fetch,
  baseUrl: string,
  program: Uint8Array,
  timeoutMilliseconds: number,
): Promise<LanBytecodeStatus> {
  if (program.length === 0 || program.length > 197) {
    throw new LanClientError("Longueur du programme bytecode invalide.", "protocol", null, null, false);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMilliseconds);
  try {
    const body = program.slice().buffer as ArrayBuffer;
    const response = await fetchFn(`${baseUrl}/bytecode/program`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body,
      signal: controller.signal,
    });
    const responseText = await response.text();
    if (!response.ok) {
      const errorCode = readLanTransportError(responseText);
      throw new LanClientError(
        errorCode === null ? `Erreur LAN HTTP ${response.status}.` : `Installation bytecode refusee (${errorCode}).`,
        errorCode === null ? "protocol" : "command-refused",
        response.status,
        errorCode,
        true,
      );
    }
    return parseLanBytecodeStatus(responseText);
  } catch (error) {
    if (error instanceof LanClientError) throw error;
    if (controller.signal.aborted) {
      throw new LanClientError("Installation bytecode expiree.", "timeout", null, null, true);
    }
    throw new LanClientError("Photon inaccessible pendant l'installation.", "connection", null, null, true);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ----------------------------------------------------------------------------
// Envoie une frame binaire et conserve les erreurs de protocole du firmware.
//
// Parametres :
// - fetchFn : implementation fetch utilisee.
// - baseUrl : racine locale versionnee.
// - path : route RGB332 du streaming ou de la peinture.
// - frame : corps RGB332 de 512 octets.
// - timeoutMilliseconds : duree maximale de l'appel.
// - signal : annulation optionnelle demandee par le moteur de streaming.
//
// Retour :
// - enveloppe commune du firmware apres application complete.
// ----------------------------------------------------------------------------
async function postRgb332Frame(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: "/stream/frame" | "/painter/frame",
  frame: Uint8Array,
  timeoutMilliseconds: number,
  signal?: AbortSignal,
): Promise<LanCommandResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMilliseconds);
  const abortFromCaller = (): void => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });

  try {
    const frameBuffer = frame.slice().buffer as ArrayBuffer;
    const response = await fetchFn(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: frameBuffer,
      signal: controller.signal,
    });
    const responseText = await response.text();
    if (!response.ok) {
      const errorCode = readLanTransportError(responseText);
      throw new LanClientError(
        errorCode === null ? `Erreur LAN HTTP ${response.status}.` : `Frame LAN refusee (${errorCode}).`,
        errorCode === null ? "protocol" : "command-refused",
        response.status,
        errorCode,
        true,
      );
    }
    let parsedValue: LanCommandResponse;
    try {
      parsedValue = parseLanCommandResponse(responseText);
    } catch (error) {
      throw new LanClientError(
        error instanceof Error ? error.message : "Reponse LAN invalide.",
        "protocol",
        response.status,
        null,
        true,
      );
    }
    return parsedValue;
  } catch (error) {
    if (error instanceof LanClientError) throw error;
    if (controller.signal.aborted) {
      throw new LanClientError("Envoi de frame annule ou expire.", "timeout", null, null, true);
    }
    throw new LanClientError("Photon inaccessible pendant le streaming.", "connection", null, null, true);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

// ----------------------------------------------------------------------------
// Extrait le code compact d'une erreur de transport LAN.
//
// Parametres :
// - responseText : corps texte retourne par le serveur.
//
// Retour :
// - code entier de la ligne error ou null pour un corps different.
// ----------------------------------------------------------------------------
function readLanTransportError(responseText: string): number | null {
  const match = /(?:^|\n)error=(-?\d+)(?:\n|$)/u.exec(responseText);
  if (match?.[1] === undefined) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(value) ? value : null;
}

// ----------------------------------------------------------------------------
// Envoie un POST de commande et conserve le code d'un refus HTTP 422.
//
// Parametres :
// - fetchFn : implementation fetch utilisee.
// - baseUrl : racine locale versionnee.
// - path : route de commande.
// - body : commande historique complete.
// - timeoutMilliseconds : duree maximale de l'appel.
//
// Retour :
// - enveloppe de resultat en cas de succes.
// ----------------------------------------------------------------------------
async function postCommand(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: string,
  body: string,
  timeoutMilliseconds: number,
): Promise<LanCommandResponse> {
  return requestLan(
    fetchFn,
    baseUrl,
    path,
    "POST",
    body,
    timeoutMilliseconds,
    parseLanCommandResponse,
  );
}

// ----------------------------------------------------------------------------
// Execute, borne et parse une requete LAN texte.
//
// Parametres :
// - fetchFn : implementation fetch utilisee.
// - baseUrl : racine locale versionnee.
// - path : route exacte a appeler.
// - method : methode GET ou POST.
// - body : corps texte d'un POST, vide pour GET.
// - timeoutMilliseconds : duree maximale de l'appel.
// - parser : parseur pur de la reponse attendue.
//
// Retour :
// - valeur validee par le parseur fourni.
// ----------------------------------------------------------------------------
async function requestLan<TValue>(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: string,
  method: "GET" | "POST",
  body: string,
  timeoutMilliseconds: number,
  parser: (text: string) => TValue,
): Promise<TValue> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMilliseconds);
  const requestDispatched = method === "POST";

  try {
    const response = await fetchFn(`${baseUrl}${path}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "text/plain" } : undefined,
      body: method === "POST" ? body : undefined,
      signal: controller.signal,
    });
    const responseText = await response.text();
    if (!response.ok) {
      const transportError = readLanTransportError(responseText);
      if (transportError !== null) {
        throw new LanClientError(
          `Commande LAN refusee (${transportError}).`,
          "command-refused",
          response.status,
          transportError,
          requestDispatched,
        );
      }
    }
    let parsedValue: TValue;
    try {
      parsedValue = parser(responseText);
    } catch (error) {
      throw new LanClientError(
        error instanceof Error ? error.message : "Reponse LAN invalide.",
        "protocol",
        response.status,
        null,
        requestDispatched,
      );
    }
    if (!response.ok) {
      const result = readCommandResult(parsedValue);
      throw new LanClientError(
        result === null ? `Erreur LAN HTTP ${response.status}.` : `Commande LAN refusee (${result}).`,
        result === null ? "protocol" : "command-refused",
        response.status,
        result,
        requestDispatched,
      );
    }
    return parsedValue;
  } catch (error) {
    if (error instanceof LanClientError) throw error;
    if (controller.signal.aborted) {
      throw new LanClientError("Delai LAN depasse.", "timeout", null, null, requestDispatched);
    }
    throw new LanClientError("Photon inaccessible sur le LAN.", "connection", null, null, requestDispatched);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ----------------------------------------------------------------------------
// Extrait prudemment un resultat d'une valeur parse de type inconnu.
//
// Parametres :
// - value : valeur parse potentiellement issue d'une commande.
//
// Retour :
// - code entier ou `null` pour une autre famille de reponse.
// ----------------------------------------------------------------------------
function readCommandResult(value: unknown): number | null {
  if (typeof value !== "object" || value === null || !("result" in value)) return null;
  const result = (value as { result: unknown }).result;
  return typeof result === "number" ? result : null;
}
