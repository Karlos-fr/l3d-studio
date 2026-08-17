// ============================================================================
// ParticleClientTest - Implementation des tests du client Particle
// ----------------------------------------------------------------------------
// Ce fichier valide le contrat HTTP du client Particle avec un fetch mocke. Il
// ne contacte jamais l'API Particle Cloud reelle.
// ============================================================================

import { describe, expect, it } from "vitest";
import { createParticleClient, ParticleCloudError } from "./client";

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

// Token factice utilise pour verifier le header Authorization.
const TEST_TOKEN = "token-test";

// Identifiant factice de device utilise dans les URLs de test.
const TEST_DEVICE_ID = "device-test";

// ----------------------------------------------------------------------------
// Execute la suite de tests du client Particle.
// ----------------------------------------------------------------------------
function runParticleClientTests(): void {
  it("cree un token avec le flux OAuth Particle", async () => {
    const calls: FetchCall[] = [];
    const fetchFn = createMockFetch(calls, [
      createJsonResponse({
        access_token: "token-cree",
        token_type: "bearer",
        expires_in: 3600,
      }),
    ]);
    const client = createParticleClient({ fetchFn });

    const token = await client.login("user@example.test", "secret");
    const body = calls[0]?.init?.body as URLSearchParams;
    const headers = new Headers(calls[0]?.init?.headers);

    expect(token.access_token).toBe("token-cree");
    expect(calls[0]?.url).toBe("https://api.particle.io/oauth/token");
    expect(headers.get("Authorization")).toBe("Basic cGFydGljbGU6cGFydGljbGU=");
    expect(body.get("grant_type")).toBe("password");
    expect(body.get("username")).toBe("user@example.test");
    expect(body.get("password")).toBe("secret");
  });

  it("liste les devices avec un token Bearer", async () => {
    const calls: FetchCall[] = [];
    const fetchFn = createMockFetch(calls, [
      createJsonResponse([
        {
          id: TEST_DEVICE_ID,
          name: "cube",
          connected: true,
        },
      ]),
    ]);
    const client = createParticleClient({ token: TEST_TOKEN, fetchFn });

    const devices = await client.listDevices();
    const headers = new Headers(calls[0]?.init?.headers);

    expect(devices).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.particle.io/v1/devices");
    expect(headers.get("Authorization")).toBe(`Bearer ${TEST_TOKEN}`);
  });

  it("lit une variable Particle et retourne son resultat", async () => {
    const calls: FetchCall[] = [];
    const fetchFn = createMockFetch(calls, [
      createJsonResponse({
        cmd: "VarReturn",
        name: "mode",
        result: "ColorAll",
      }),
    ]);
    const client = createParticleClient({ token: TEST_TOKEN, fetchFn });

    const mode = await client.getVariable<string>(TEST_DEVICE_ID, "mode");

    expect(mode).toBe("ColorAll");
    expect(calls[0]?.url).toBe(
      `https://api.particle.io/v1/devices/${TEST_DEVICE_ID}/mode`,
    );
  });

  it("appelle une fonction Particle avec le parametre arg", async () => {
    const calls: FetchCall[] = [];
    const fetchFn = createMockFetch(calls, [
      createJsonResponse({
        id: TEST_DEVICE_ID,
        name: "SetMode",
        connected: true,
        return_value: 1001,
      }),
    ]);
    const client = createParticleClient({ token: TEST_TOKEN, fetchFn });

    const response = await client.callFunction(TEST_DEVICE_ID, "SetMode", "S:4,B:80,");
    const body = calls[0]?.init?.body as URLSearchParams;

    expect(response.return_value).toBe(1001);
    expect(body.get("arg")).toBe("S:4,B:80,");
    expect(calls[0]?.url).toBe(
      `https://api.particle.io/v1/devices/${TEST_DEVICE_ID}/SetMode`,
    );
  });

  it("refuse un appel authentifie sans token local", async () => {
    const calls: FetchCall[] = [];
    const fetchFn = createMockFetch(calls, []);
    const client = createParticleClient({ fetchFn });

    await expect(client.listDevices()).rejects.toBeInstanceOf(ParticleCloudError);
    expect(calls).toHaveLength(0);
  });
}

// ----------------------------------------------------------------------------
// Cree un fetch mocke qui retourne les reponses fournies dans l'ordre.
//
// Parametres :
// - calls : liste mutable recevant les appels observes.
// - responses : reponses HTTP a retourner.
//
// Retour :
// - implementation fetch compatible avec le client Particle.
//
// Effet de bord :
// - ajoute chaque appel recu dans `calls`.
// ----------------------------------------------------------------------------
function createMockFetch(calls: FetchCall[], responses: Response[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls.push({
      url: String(input),
      init,
    });

    const response = responses.shift();

    if (response === undefined) {
      throw new Error("Aucune reponse mock disponible.");
    }

    return response;
  }) as typeof fetch;
}

// ----------------------------------------------------------------------------
// Cree une reponse JSON pour les tests du client Particle.
//
// Parametres :
// - body : corps JSON a serialiser.
// - status : code HTTP de la reponse.
//
// Retour :
// - reponse fetch contenant le JSON demande.
// ----------------------------------------------------------------------------
function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("createParticleClient", runParticleClientTests);
