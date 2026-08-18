// ============================================================================
// LocalHttpParser - Tests hote du socle HTTP local borne
// ----------------------------------------------------------------------------
// Ce fichier verifie le contrat, les limites et l'integration statique du
// parseur et du serveur. Il ne remplace pas la validation sur Photon reel.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspectee.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// Limite contractuelle du corps HTTP recu.
const bodyLimit = 622;

// ----------------------------------------------------------------------------
// Charge un fichier source du firmware.
//
// Parametres :
// - relativePath : chemin relatif depuis la racine firmware.
//
// Retour :
// - contenu UTF-8 du fichier demande.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  return fs.readFileSync(path.join(firmwareRoot, relativePath), "utf8");
}

// ----------------------------------------------------------------------------
// Construit une requete POST texte avec une longueur ajustable.
//
// Parametres :
// - body : corps texte transmis.
// - announcedLength : longueur annoncee ou longueur reelle par defaut.
//
// Retour :
// - requete HTTP complete.
// ----------------------------------------------------------------------------
function makePost(body, announcedLength = Buffer.byteLength(body)) {
  return `POST /api/v1/command HTTP/1.1\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${announcedLength}\r\n\r\n${body}`;
}

// ----------------------------------------------------------------------------
// Modele les validations observables du parseur C++ pour ses tests de bornes.
//
// Parametres :
// - chunks : portions successives recues sur la connexion.
//
// Retour :
// - etat final et code d'erreur contractuel eventuel.
// ----------------------------------------------------------------------------
function parseRequestModel(chunks) {
  const request = chunks.join("");
  const separator = request.indexOf("\r\n\r\n");
  if (separator < 0) return { state: "progress" };
  const head = request.slice(0, separator);
  if (/(^|[^\r])\n/u.test(head) || /\r(?!\n)/u.test(head)) {
    return { state: "error", code: -200 };
  }
  const lines = head.split("\r\n");
  const requestLine = lines.shift() ?? "";
  if (requestLine.length >= 96) return { state: "error", code: -201 };
  const match = /^(GET|POST|OPTIONS) ([^ ]+) HTTP\/1\.[01]$/u.exec(requestLine);
  if (!match) {
    const method = requestLine.split(" ", 1)[0];
    return { state: "error", code: ["GET", "POST", "OPTIONS"].includes(method) ? -200 : -202 };
  }
  if (match[2].length >= 64) return { state: "error", code: -201 };
  if (!match[2].startsWith("/") || /[?#]/u.test(match[2])) {
    return { state: "error", code: -200 };
  }
  if (lines.length > 12) return { state: "error", code: -201 };
  let headerBytes = 2;
  const headers = new Map();
  for (const line of lines) {
    if (line.length >= 128) return { state: "error", code: -201 };
    headerBytes += line.length + 2;
    if (headerBytes > 512) return { state: "error", code: -201 };
    const colon = line.indexOf(":");
    if (colon <= 0) return { state: "error", code: -200 };
    const name = line.slice(0, colon).toLowerCase();
    if (headers.has(name) && ["content-length", "content-type"].includes(name)) {
      return { state: "error", code: -200 };
    }
    headers.set(name, line.slice(colon + 1).trim());
  }
  if (headers.has("transfer-encoding")) return { state: "error", code: -200 };
  const body = request.slice(separator + 4);
  const lengthText = headers.get("content-length");
  if (match[1] === "POST" && lengthText === undefined) {
    return { state: "error", code: -200 };
  }
  if (lengthText !== undefined && !/^\d+$/u.test(lengthText)) {
    return { state: "error", code: -200 };
  }
  const contentLength = lengthText === undefined ? 0 : Number(lengthText);
  if (!Number.isSafeInteger(contentLength) || contentLength > bodyLimit) {
    return { state: "error", code: -201 };
  }
  if (match[1] !== "POST" && contentLength > 0) {
    return { state: "error", code: -200 };
  }
  if (match[1] === "POST" && contentLength > 0 &&
      !/^text\/plain(?:\s*;\s*charset=utf-8)?$/iu.test(headers.get("content-type") ?? "")) {
    return { state: "error", code: -203 };
  }
  if (body.length < contentLength) return { state: "progress" };
  return { state: "ready", method: match[1], path: match[2], body: body.slice(0, contentLength) };
}

// ----------------------------------------------------------------------------
// Verifie une requete complete et sa fragmentation octet par octet.
// ----------------------------------------------------------------------------
test("le parseur accepte les requetes completes et fragmentees", () => {
  const get = "GET /api/v1/health HTTP/1.1\r\nHost: photon\r\n\r\n";
  assert.deepEqual(parseRequestModel([get]), {
    state: "ready", method: "GET", path: "/api/v1/health", body: "",
  });
  assert.deepEqual(parseRequestModel([...get]), parseRequestModel([get]));
  assert.equal(parseRequestModel([get.slice(0, -1)]).state, "progress");
});

// ----------------------------------------------------------------------------
// Verifie les chemins, lignes et cumuls d'en-tetes aux bornes du contrat.
// ----------------------------------------------------------------------------
test("le parseur borne les chemins et les en-tetes", () => {
  const acceptedPath = `/${"a".repeat(62)}`;
  const rejectedPath = `/${"a".repeat(63)}`;
  assert.equal(parseRequestModel([`GET ${acceptedPath} HTTP/1.1\r\n\r\n`]).state, "ready");
  assert.deepEqual(parseRequestModel([`GET ${rejectedPath} HTTP/1.1\r\n\r\n`]), {
    state: "error", code: -201,
  });
  const longHeader = `X-Test: ${"a".repeat(120)}`;
  assert.deepEqual(parseRequestModel([`GET / HTTP/1.1\r\n${longHeader}\r\n\r\n`]), {
    state: "error", code: -201,
  });
});

// ----------------------------------------------------------------------------
// Verifie les longueurs absentes, incorrectes et superieures au buffer fixe.
// ----------------------------------------------------------------------------
test("le parseur refuse les corps mal annonces ou excessifs", () => {
  assert.deepEqual(parseRequestModel(["POST /api/v1/command HTTP/1.1\r\n\r\n"]), {
    state: "error", code: -200,
  });
  assert.equal(parseRequestModel([makePost("abc", 4)]).state, "progress");
  assert.deepEqual(parseRequestModel([makePost("x", bodyLimit + 1)]), {
    state: "error", code: -201,
  });
  assert.equal(parseRequestModel([makePost("x".repeat(bodyLimit))]).state, "ready");
  assert.deepEqual(parseRequestModel([makePost("x", "99999999999999999999")]), {
    state: "error", code: -201,
  });
});

// ----------------------------------------------------------------------------
// Verifie les methodes, encodages et en-tetes ambigus refuses.
// ----------------------------------------------------------------------------
test("le parseur rejette les formes HTTP non prises en charge", () => {
  assert.deepEqual(parseRequestModel(["PUT /api/v1/health HTTP/1.1\r\n\r\n"]), {
    state: "error", code: -202,
  });
  assert.deepEqual(parseRequestModel([makePost("x").replace("text/plain; charset=utf-8", "application/json")]), {
    state: "error", code: -203,
  });
  assert.deepEqual(parseRequestModel(["GET / HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\n"]), {
    state: "error", code: -200,
  });
});

// ----------------------------------------------------------------------------
// Verifie que le serveur reste statique, incremental et ferme ses transactions.
// ----------------------------------------------------------------------------
test("le serveur utilise un client et des buffers fixes sans allocation", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  const parser = readFirmwareSource("src/network/local_http_parser.h");
  assert.equal((server.match(/static TCPClient localApiClient;/gu) ?? []).length, 1);
  assert.match(server, /processedBytes < LOCAL_API_BYTES_PER_TICK/gu);
  assert.match(server, /localApiClient\.write\([\s\S]*?writeLength,\s*0\)/u);
  assert.match(server, /LOCAL_API_IDLE_TIMEOUT_MS/u);
  assert.match(server, /LOCAL_API_TOTAL_TIMEOUT_MS/u);
  assert.match(server, /localApiClient\.stop\(\)/u);
  assert.match(parser, /char body\[LOCAL_API_BODY_LENGTH \+ 1\]/u);
  assert.doesNotMatch(`${server}\n${parser}`, /\b(?:new|malloc|calloc|realloc|vector|String)\b/u);
});

// ----------------------------------------------------------------------------
// Verifie l'ouverture Wi-Fi, le preflight et la route de sante de phase 2.
// ----------------------------------------------------------------------------
test("le serveur redemarre avec le Wi-Fi et expose la sante minimale", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.match(server, /bool wifiReady = WiFi\.ready\(\)/u);
  assert.match(server, /localApiListening = localApiServer\.begin\(\)/u);
  assert.match(server, /"v=1\\nfw=%s\\nos=%s\\nu=%lu\\ni=%d\\nk=%d\\n"/u);
  assert.match(server, /LOCAL_HTTP_METHOD_OPTIONS/u);
  assert.match(server, /Access-Control-Allow-Origin: \*/u);
  assert.match(server, /Access-Control-Allow-Private-Network: true/u);
});

// ----------------------------------------------------------------------------
// Verifie que le service LAN coopere avec la boucle et les attentes historiques.
// ----------------------------------------------------------------------------
test("la boucle et les animations servent le LAN sans attente bloquante", () => {
  const main = readFirmwareSource("src/main.cpp");
  const scheduler = readFirmwareSource("src/core/animation_scheduler.cpp");
  assert.match(main, /void loop\(\) \{[\s\S]*?localApiProcess\(\);/u);
  assert.match(scheduler, /void animationProcessServices\(void\)/u);
  assert.match(scheduler, /Particle\.process\(\);\s*localApiProcess\(\);/u);
  assert.match(scheduler, /ANIMATION_SERVICE_INTERVAL_MS = 20UL/u);
});
