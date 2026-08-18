// ============================================================================
// LanClientTest - Tests du client HTTP local
// ----------------------------------------------------------------------------
// Ce fichier verifie les routes, les corps et les familles d'erreurs avec un
// fetch simule. Il ne contacte aucun Photon reel.
// ============================================================================

import { describe, expect, it } from "vitest";
import { createLanClient, LanClientError, normalizeLanHost, normalizeLanPort } from "./client";

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

// Reponse de sante minimale valide.
const HEALTH_RESPONSE = "v=1\nfw=1.4\nos=2.3.1\nu=4\ni=1\nk=1\n";

// Reponse de diagnostics compacte valide.
const DIAGNOSTICS_RESPONSE =
  "v=1,y=1,m=0,u=4,r=0,d=0,s=34000,f=33000,n=32000,b=33000,a=33000,q=32000,c=1,l=1000,g=1000,w=1000,p=100,x=1,i=1,k=1,o=-1,z=0";

// Reponse d'etat minimale valide.
const STATE_RESPONSE =
  "v=1\nm=0\nname=Off\nb=2\ns=4\ncolors=0000FF;FF0000;00FF00;0000FF;FFFF00;00FFFF\nswitches=0;0;0;0\ni=1\nk=1\nr=0\n";

// Catalogue minimal valide.
const MODES_RESPONSE = "v=1\nnames=Off;\nparams=N;\n";

// Liste de switches vide mais valide.
const AUX_RESPONSE = "v=1\nswitches=\n";

// ----------------------------------------------------------------------------
// Execute les tests du client LAN.
// ----------------------------------------------------------------------------
function runLanClientTests(): void {
  // --------------------------------------------------------------------------
  // Verifie la normalisation et le refus des chemins arbitraires.
  // --------------------------------------------------------------------------
  it("normalise uniquement un hote et un port bornes", () => {
    expect(normalizeLanHost(" HTTP://Photon.Local ")).toBe("photon.local");
    expect(normalizeLanPort(8080)).toBe(8080);
    expect(() => normalizeLanHost("photon.local/api/v1")).toThrow("sans chemin");
    expect(() => normalizeLanHost("https://photon.local")).toThrow("sans chemin");
    expect(() => normalizeLanHost("192.168.1.999")).toThrow("depasse 255");
    expect(() => normalizeLanPort(65_536)).toThrow("Port LAN invalide");
  });

  // --------------------------------------------------------------------------
  // Verifie les lectures et les quatre routes de commande.
  // --------------------------------------------------------------------------
  it("appelle chaque route avec sa methode et son corps exacts", async () => {
    const calls: FetchCall[] = [];
    const responses = [
      createTextResponse(HEALTH_RESPONSE),
      createTextResponse(DIAGNOSTICS_RESPONSE),
      createTextResponse(DIAGNOSTICS_RESPONSE),
      createTextResponse(STATE_RESPONSE),
      createTextResponse(MODES_RESPONSE),
      createTextResponse(AUX_RESPONSE),
      createTextResponse("v=1\nresult=1\n"),
      createTextResponse("v=1\nresult=2\n"),
      createTextResponse("v=1\nresult=3\n"),
      createTextResponse("v=1\nresult=4\n"),
    ];
    const client = createLanClient({
      host: "photon.local",
      fetchFn: createMockFetch(calls, responses),
    });

    await client.health();
    await client.diagnostics();
    await client.resetDiagnostics();
    await client.state();
    await client.modes();
    await client.auxSwitches();
    await client.command("GETCOLOR:1");
    await client.mode("M:Off,B:1,");
    await client.text("Bonjour");
    await client.cubePainter("I0,#000000,");

    expect(calls.map((call) => call.url)).toEqual([
      "http://photon.local:8080/api/v1/health",
      "http://photon.local:8080/api/v1/diagnostics",
      "http://photon.local:8080/api/v1/diagnostics/reset",
      "http://photon.local:8080/api/v1/state",
      "http://photon.local:8080/api/v1/modes",
      "http://photon.local:8080/api/v1/aux-switches",
      "http://photon.local:8080/api/v1/command",
      "http://photon.local:8080/api/v1/mode",
      "http://photon.local:8080/api/v1/text",
      "http://photon.local:8080/api/v1/cube-painter",
    ]);
    expect(calls[2]?.init?.method).toBe("POST");
    expect(calls[7]?.init?.body).toBe("M:Off,B:1,");
    expect(calls[7]?.init?.method).toBe("POST");
  });

  // --------------------------------------------------------------------------
  // Verifie qu'un refus metier conserve le statut et le resultat firmware.
  // --------------------------------------------------------------------------
  it("classe une commande refusee sans perdre son code", async () => {
    const client = createLanClient({
      host: "192.0.2.25",
      fetchFn: createMockFetch([], [createTextResponse("v=1\nresult=-103\n", 422)]),
    });

    await expect(client.mode("M:Inconnu,")).rejects.toMatchObject({
      category: "command-refused",
      status: 422,
      result: -103,
      requestDispatched: true,
    });
  });

  // --------------------------------------------------------------------------
  // Verifie la distinction entre connexion et protocole invalide.
  // --------------------------------------------------------------------------
  it("distingue une connexion impossible d'une reponse invalide", async () => {
    const connectionClient = createLanClient({
      host: "photon.local",
      fetchFn: async () => {
        throw new TypeError("network");
      },
    });
    const protocolClient = createLanClient({
      host: "photon.local",
      fetchFn: createMockFetch([], [createTextResponse("invalide")]),
    });

    const protocolRequest = protocolClient.health();
    await expect(connectionClient.health()).rejects.toMatchObject({ category: "connection" });
    await expect(protocolRequest).rejects.toBeInstanceOf(LanClientError);
    await expect(protocolRequest).rejects.toMatchObject({ category: "protocol" });
  });

  // --------------------------------------------------------------------------
  // Verifie que l'annulation classe separement le depassement de delai.
  // --------------------------------------------------------------------------
  it("classe un timeout independamment d'une erreur de connexion", async () => {
    const client = createLanClient({
      host: "photon.local",
      timeoutMilliseconds: 1,
      fetchFn: createAbortableFetch(),
    });

    await expect(client.health()).rejects.toMatchObject({ category: "timeout" });
  });
}

// ----------------------------------------------------------------------------
// Cree un fetch qui consomme une liste de reponses dans l'ordre.
//
// Parametres :
// - calls : collection recevant les appels observes.
// - responses : reponses a retourner successivement.
//
// Retour :
// - implementation fetch factice.
// ----------------------------------------------------------------------------
function createMockFetch(calls: FetchCall[], responses: Response[]): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(input), init });
    const response = responses.shift();
    if (response === undefined) throw new TypeError("Aucune reponse simulee");
    return response;
  };
}

// ----------------------------------------------------------------------------
// Cree une reponse HTTP texte.
//
// Parametres :
// - body : contenu texte.
// - status : statut HTTP optionnel.
//
// Retour :
// - reponse compatible fetch.
// ----------------------------------------------------------------------------
function createTextResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/plain" } });
}

// ----------------------------------------------------------------------------
// Cree un fetch qui attend uniquement le signal d'annulation.
//
// Retour :
// - implementation permettant de tester le timeout sans reseau.
// ----------------------------------------------------------------------------
function createAbortableFetch(): typeof fetch {
  return (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
    new Promise((_resolve, reject) => {
      // ----------------------------------------------------------------------
      // Rejette la requete factice lorsque le client declenche son timeout.
      // ----------------------------------------------------------------------
      const rejectOnAbort = (): void => reject(new DOMException("Aborted", "AbortError"));
      init?.signal?.addEventListener("abort", rejectOnAbort, { once: true });
    });
}

describe("client LAN", runLanClientTests);
