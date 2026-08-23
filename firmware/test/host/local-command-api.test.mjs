// ============================================================================
// LocalCommandApi - Tests hote des commandes LAN
// ----------------------------------------------------------------------------
// Ce fichier verifie le partage des fonctions metier, les reponses communes et
// l'atomicite de reception. Il ne remplace pas le rendu sur Photon reel.
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
// Extrait le corps textuel d'une fonction C++ delimitee par la suivante.
//
// Parametres :
// - source : module C++ inspecte.
// - signature : signature de debut recherchee.
// - nextSignature : signature suivant immediatement la fonction.
//
// Retour :
// - tranche source contenant la fonction.
// ----------------------------------------------------------------------------
function extractFunction(source, signature, nextSignature) {
  const begin = source.indexOf(signature);
  const end = source.indexOf(nextSignature, begin + signature.length);
  assert.ok(begin >= 0, `${signature} doit exister`);
  assert.ok(end > begin, `${nextSignature} doit suivre ${signature}`);
  return source.slice(begin, end);
}

// ----------------------------------------------------------------------------
// Verifie que les trois routes texte appellent exclusivement le coeur commun.
// ----------------------------------------------------------------------------
test("les routes LAN partagent les trois fonctions metier Particle", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.match(server, /localApiRouteCommand\(routeCommandFromBuffer\)/u);
  assert.match(server, /localApiRouteCommand\(setModeFromBuffer\)/u);
  assert.match(server, /localApiRouteCommand\(setTextFromBuffer\)/u);
  assert.doesNotMatch(server, /\b(?:FnRouter|SetMode|SetText|CubePainter)\s*\(/u);
});

// ----------------------------------------------------------------------------
// Verifie l'enveloppe et le statut propres au resultat metier historique.
// ----------------------------------------------------------------------------
test("une commande retourne son code historique dans une enveloppe commune", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  const body = extractFunction(
    server,
    "static bool localApiRouteCommand(",
    "static bool localApiIsCommandPath(",
  );
  assert.match(body, /recordCommandResult\(\s*handler\(localApiParser\.body, commandLength\)\)/u);
  assert.match(body, /"v=1\\nresult=%d\\n"/u);
  assert.match(body, /commandResult < 0 \? 422 : 200/u);
  assert.match(server, /case 422: return "Unprocessable Content";/u);
});

// ----------------------------------------------------------------------------
// Verifie que les methodes de lecture ne peuvent pas appliquer une commande.
// ----------------------------------------------------------------------------
test("les commandes exigent POST et les preflights restent sans effet", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.match(
    server,
    /if\(localApiIsCommandPath\(localApiParser\.path\)\) \{\s*if\(localApiParser\.method != LOCAL_HTTP_METHOD_POST\)/u,
  );
  const route = extractFunction(
    server,
    "static bool localApiRouteRequest(void)",
    "static void localApiAcceptClient(",
  );
  const options = route.indexOf("LOCAL_HTTP_METHOD_OPTIONS");
  const command = route.indexOf("localApiIsCommandPath(localApiParser.path)");
  assert.ok(options >= 0);
  assert.ok(options < command);
});

// ----------------------------------------------------------------------------
// Verifie qu'une seule execution peut posseder le corps statique partage.
// ----------------------------------------------------------------------------
test("le verrou refuse une seconde commande pendant le traitement", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.match(server, /static bool localApiCommandActive = false;/u);
  assert.match(
    server,
    /if\(localApiCommandActive\) \{\s*localApiPrepareError\(LOCAL_API_ERROR_BUSY\);/u,
  );
  assert.match(
    server,
    /localApiCommandActive = true;[\s\S]*?handler\(localApiParser\.body, commandLength\)[\s\S]*?localApiCommandActive = false;/u,
  );
  assert.match(
    server,
    /void localApiProcess\(void\) \{\s*if\(localApiCommandActive\)\s*return;/u,
  );
});

// ----------------------------------------------------------------------------
// Verifie que le routeur n'est appele qu'apres reception integrale du corps.
// ----------------------------------------------------------------------------
test("une commande partielle ou deconnectee ne peut pas etre appliquee", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  const parser = readFirmwareSource("src/network/local_http_parser.cpp");
  assert.match(
    server,
    /if\(localApiResponse\.state == LOCAL_API_RESPONSE_IDLE &&\s*localApiParser\.state == LOCAL_HTTP_PARSER_READY\)\s*localApiRouteRequest\(\);/u,
  );
  assert.match(
    parser,
    /if\(parser->bodyReceived == parser->bodyLength\) \{[\s\S]*?parser->state = LOCAL_HTTP_PARSER_READY;/u,
  );
  assert.match(
    server,
    /else if\(!localApiClient\.connected\(\) && localApiClient\.available\(\) <= 0\)\s*localApiCloseClient\(\);/u,
  );
});

// ----------------------------------------------------------------------------
// Verifie que le LAN delegue la persistance au module bytecode dedie.
// ----------------------------------------------------------------------------
test("le serveur LAN ne manipule jamais EEPROM directement", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.doesNotMatch(server, /\bEEPROM\s*\.\s*(?:get|put|read|write|clear)\b/u);
  assert.match(server, /\bbytecodeStorageInstall\b/u);
  assert.match(server, /\bbytecodeStorageRemove\b/u);
  assert.doesNotMatch(server, /\b(?:new|malloc|calloc|realloc|vector|String)\b/u);
});
