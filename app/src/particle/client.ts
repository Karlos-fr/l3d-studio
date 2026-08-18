// ============================================================================
// ParticleClient - Implementation du client Particle Cloud
// ----------------------------------------------------------------------------
// Ce fichier centralise les appels HTTP vers l'API Particle Cloud. Il ne connait
// pas le DOM ni le protocole compact du firmware SparkPixelsMega.
// ============================================================================

import type {
  ParticleApiErrorResponse,
  ParticleClientConfig,
  ParticleDeviceSummary,
  ParticleFunctionResponse,
  ParticleTokenResponse,
  ParticleVariableResponse,
} from "./types";

// URL de base de l'API Particle Cloud actuelle.
export const PARTICLE_API_BASE_URL = "https://api.particle.io/v1";

// URL du endpoint OAuth Particle utilise pour creer un token.
const PARTICLE_OAUTH_TOKEN_URL = "https://api.particle.io/oauth/token";

// Client OAuth public documente par Particle pour un compte developpeur.
const PARTICLE_DEVELOPER_CLIENT_AUTH = "Basic cGFydGljbGU6cGFydGljbGU=";

// Duree par defaut du token cree par l'application, en secondes.
const DEFAULT_TOKEN_EXPIRES_IN_SECONDS = 3600;

// Type de contenu attendu par Particle pour les endpoints OAuth et fonctions.
const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";

// Message affiche quand aucun token n'est disponible pour un appel authentifie.
const MISSING_TOKEN_MESSAGE = "Aucun token Particle n'est configure.";

export class ParticleCloudError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly description: string | null;

  // ----------------------------------------------------------------------------
  // Construit une erreur applicative a partir d'une reponse Particle.
  //
  // Parametres :
  // - message : message lisible par le code appelant.
  // - status : code HTTP retourne par Particle.
  // - code : code machine retourne par Particle, quand il existe.
  // - description : description lisible retournee par Particle, quand elle existe.
  // ----------------------------------------------------------------------------
  constructor(message: string, status: number, code: string | null, description: string | null) {
    super(message);
    this.name = "ParticleCloudError";
    this.status = status;
    this.code = code;
    this.description = description;
  }
}

export interface ParticleClient {
  // ----------------------------------------------------------------------------
  // Cree un token Particle a partir du login et du mot de passe utilisateur.
  //
  // Parametres :
  // - email : identifiant Particle de l'utilisateur.
  // - password : mot de passe Particle de l'utilisateur.
  //
  // Retour :
  // - reponse OAuth Particle contenant le token.
  //
  // Effet de bord :
  // - transmet les identifiants a l'API OAuth Particle.
  // ----------------------------------------------------------------------------
  login(email: string, password: string): Promise<ParticleTokenResponse>;

  // ----------------------------------------------------------------------------
  // Remplace le token Particle utilise par les appels authentifies.
  //
  // Parametres :
  // - token : nouveau token Particle, ou `null` pour vider le token.
  //
  // Effet de bord :
  // - met a jour l'etat interne du client HTTP.
  // ----------------------------------------------------------------------------
  setToken(token: string | null): void;

  // ----------------------------------------------------------------------------
  // Recupere la liste des devices Particle accessibles.
  //
  // Retour :
  // - liste des devices visibles par le token courant.
  //
  // Effet de bord :
  // - appelle l'API Particle Cloud.
  // ----------------------------------------------------------------------------
  listDevices(): Promise<ParticleDeviceSummary[]>;

  // ----------------------------------------------------------------------------
  // Recupere le detail d'un device Particle.
  //
  // Parametres :
  // - deviceId : identifiant Particle du device.
  //
  // Retour :
  // - resume detaille du device Particle.
  //
  // Effet de bord :
  // - appelle l'API Particle Cloud.
  // ----------------------------------------------------------------------------
  getDevice(deviceId: string): Promise<ParticleDeviceSummary>;

  // ----------------------------------------------------------------------------
  // Lit une variable exposee par le firmware Particle.
  //
  // Parametres :
  // - deviceId : identifiant Particle du device.
  // - variableName : nom de la variable Particle a lire.
  //
  // Retour :
  // - valeur de la variable Particle.
  //
  // Effet de bord :
  // - appelle l'API Particle Cloud.
  // ----------------------------------------------------------------------------
  getVariable<TValue>(
    deviceId: string,
    variableName: string,
    signal?: AbortSignal,
  ): Promise<TValue>;

  // ----------------------------------------------------------------------------
  // Appelle une fonction exposee par le firmware Particle.
  //
  // Parametres :
  // - deviceId : identifiant Particle du device.
  // - functionName : nom de la fonction Particle a appeler.
  // - command : commande envoyee dans le parametre Particle `arg`.
  //
  // Retour :
  // - reponse de fonction Particle.
  //
  // Effet de bord :
  // - appelle l'API Particle Cloud et peut modifier l'etat du firmware.
  // ----------------------------------------------------------------------------
  callFunction(
    deviceId: string,
    functionName: string,
    command: string,
    signal?: AbortSignal,
  ): Promise<ParticleFunctionResponse>;
}

// ----------------------------------------------------------------------------
// Cree un client HTTP Particle Cloud.
//
// Parametres :
// - config : configuration optionnelle du client, incluant le token et fetch.
//
// Retour :
// - client Particle pret a authentifier et appeler les endpoints Cloud.
// ----------------------------------------------------------------------------
export function createParticleClient(config: ParticleClientConfig = {}): ParticleClient {
  const baseUrl = trimTrailingSlash(config.baseUrl ?? PARTICLE_API_BASE_URL);
  const fetchFn = config.fetchFn ?? fetch;
  let token = config.token ?? null;

  return {
    login(email: string, password: string): Promise<ParticleTokenResponse> {
      return loginWithPassword(fetchFn, email, password);
    },

    setToken(nextToken: string | null): void {
      token = nextToken;
    },

    listDevices(): Promise<ParticleDeviceSummary[]> {
      return requestJson<ParticleDeviceSummary[]>(fetchFn, `${baseUrl}/devices`, token);
    },

    getDevice(deviceId: string): Promise<ParticleDeviceSummary> {
      return requestJson<ParticleDeviceSummary>(
        fetchFn,
        `${baseUrl}/devices/${encodeURIComponent(deviceId)}`,
        token,
      );
    },

    async getVariable<TValue>(
      deviceId: string,
      variableName: string,
      signal?: AbortSignal,
    ): Promise<TValue> {
      const response = await requestJson<ParticleVariableResponse<TValue>>(
        fetchFn,
        `${baseUrl}/devices/${encodeURIComponent(deviceId)}/${encodeURIComponent(variableName)}`,
        token,
        { signal },
      );

      return response.result;
    },

    callFunction(
      deviceId: string,
      functionName: string,
      command: string,
      signal?: AbortSignal,
    ): Promise<ParticleFunctionResponse> {
      const body = new URLSearchParams();
      body.set("arg", command);

      return requestJson<ParticleFunctionResponse>(
        fetchFn,
        `${baseUrl}/devices/${encodeURIComponent(deviceId)}/${encodeURIComponent(functionName)}`,
        token,
        {
          method: "POST",
          headers: {
            "Content-Type": FORM_CONTENT_TYPE,
          },
          body,
          signal,
        },
      );
    },
  };
}

// ----------------------------------------------------------------------------
// Cree un token Particle avec le flux login et mot de passe.
//
// Parametres :
// - fetchFn : implementation fetch utilisee pour l'appel HTTP.
// - email : identifiant Particle de l'utilisateur.
// - password : mot de passe Particle de l'utilisateur.
//
// Retour :
// - reponse de token retournee par Particle.
//
// Effet de bord :
// - transmet les identifiants a l'API OAuth Particle.
// ----------------------------------------------------------------------------
async function loginWithPassword(
  fetchFn: typeof fetch,
  email: string,
  password: string,
): Promise<ParticleTokenResponse> {
  const body = new URLSearchParams();
  body.set("grant_type", "password");
  body.set("username", email);
  body.set("password", password);
  body.set("expires_in", String(DEFAULT_TOKEN_EXPIRES_IN_SECONDS));

  return requestJson<ParticleTokenResponse>(fetchFn, PARTICLE_OAUTH_TOKEN_URL, null, {
    method: "POST",
    headers: {
      Authorization: PARTICLE_DEVELOPER_CLIENT_AUTH,
      "Content-Type": FORM_CONTENT_TYPE,
    },
    body,
  });
}

// ----------------------------------------------------------------------------
// Execute une requete HTTP et decode sa reponse JSON.
//
// Parametres :
// - fetchFn : implementation fetch utilisee pour l'appel HTTP.
// - url : URL complete a appeler.
// - token : token Particle a envoyer, quand l'appel est authentifie.
// - init : options fetch complementaires.
//
// Retour :
// - corps JSON decode et type par l'appelant.
//
// Effet de bord :
// - appelle le reseau Particle Cloud ou le mock fourni.
// ----------------------------------------------------------------------------
async function requestJson<TResponse>(
  fetchFn: typeof fetch,
  url: string,
  token: string | null,
  init: RequestInit = {},
): Promise<TResponse> {
  const headers = new Headers(init.headers);

  if (token !== null) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (requiresBearerToken(url)) {
    throw new ParticleCloudError(MISSING_TOKEN_MESSAGE, 0, "missing_token", MISSING_TOKEN_MESSAGE);
  }

  const response = await fetchFn(url, {
    ...init,
    headers,
  });

  const body = await readJsonBody(response);

  if (!response.ok) {
    throw createParticleError(response.status, body);
  }

  return body as TResponse;
}

// ----------------------------------------------------------------------------
// Determine si une URL Particle necessite un token Bearer.
//
// Parametres :
// - url : URL complete a inspecter.
//
// Retour :
// - `true` si l'URL cible l'API `/v1`, sinon `false`.
// ----------------------------------------------------------------------------
function requiresBearerToken(url: string): boolean {
  return url.startsWith(PARTICLE_API_BASE_URL) || url.includes("/v1/");
}

// ----------------------------------------------------------------------------
// Decode le corps JSON d'une reponse fetch.
//
// Parametres :
// - response : reponse HTTP recue.
//
// Retour :
// - objet JSON decode, ou objet vide si la reponse est vide.
// ----------------------------------------------------------------------------
async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.length === 0) {
    return {};
  }

  return JSON.parse(text) as unknown;
}

// ----------------------------------------------------------------------------
// Construit une erreur lisible a partir du corps Particle.
//
// Parametres :
// - status : code HTTP retourne par Particle.
// - body : corps JSON decode de la reponse.
//
// Retour :
// - erreur Particle enrichie avec code et description.
// ----------------------------------------------------------------------------
function createParticleError(status: number, body: unknown): ParticleCloudError {
  const errorBody = body as ParticleApiErrorResponse;
  const code = errorBody.error ?? null;
  const description = errorBody.error_description ?? errorBody.info ?? null;
  const message = description ?? code ?? `Erreur Particle HTTP ${status}`;

  return new ParticleCloudError(message, status, code, description);
}

// ----------------------------------------------------------------------------
// Supprime les barres obliques finales d'une URL de base.
//
// Parametres :
// - value : URL de base fournie au client.
//
// Retour :
// - URL sans barre oblique finale.
// ----------------------------------------------------------------------------
function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
