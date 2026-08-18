// ============================================================================
// LocalDiagnosticsApi - Tests hote des diagnostics HTTP locaux
// ----------------------------------------------------------------------------
// Ce fichier verifie le format partagé, le routage et l'absence de nouveau
// buffer resident. Il ne simule pas les mesures materielles du Photon.
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

// Liste ordonnee des cles du diagnostic compact version 1.
const diagnosticKeys = [
  "v", "y", "m", "u", "r", "d", "s", "f", "n", "b", "a", "q",
  "c", "l", "g", "w", "p", "x", "i", "k", "o", "z",
];

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
// Extrait les cles d'un exemple diagnostic compact.
//
// Parametres :
// - text : chaine compacte separee par des virgules.
//
// Retour :
// - liste des cles dans leur ordre de transmission.
// ----------------------------------------------------------------------------
function parseDiagnosticKeys(text) {
  const keys = [];
  for (const field of text.split(",")) keys.push(field.split("=", 1)[0]);
  return keys;
}

// ----------------------------------------------------------------------------
// Verifie que le producteur commun conserve toutes les cles contractuelles.
// ----------------------------------------------------------------------------
test("le producteur commun conserve le format compact version 1", () => {
  const diagnostics = readFirmwareSource("src/diagnostics/runtime_diagnostics.cpp");
  const formatMatch = diagnostics.match(/"(v=%d,y=%ld,[^"]+)"/u);
  assert.ok(formatMatch);
  assert.deepEqual(parseDiagnosticKeys(formatMatch[1]), diagnosticKeys);
  assert.match(diagnostics, /int diagnosticsWriteSnapshot\(/u);
  assert.match(diagnostics, /static_cast<size_t>\(length\) >= capacity/u);
});

// ----------------------------------------------------------------------------
// Verifie que Particle utilise encore la sequence et le buffer historiques.
// ----------------------------------------------------------------------------
test("Particle conserve son parcours differe par deviceInfo", () => {
  const diagnostics = readFirmwareSource("src/diagnostics/runtime_diagnostics.cpp");
  const header = readFirmwareSource("src/diagnostics/runtime_diagnostics.h");
  assert.match(header, /#define diagnosticsText deviceInfo/u);
  assert.match(diagnostics, /diagnosticsRequestSequence/u);
  assert.match(
    diagnostics,
    /diagnosticsWriteSnapshot\(\s*diagnosticsText,\s*DIAGNOSTICS_TEXT_LENGTH,\s*resetRequested,\s*sequence\)/u,
  );
  assert.match(diagnostics, /diagnosticsTextValidUntil = millis\(\) \+ 15000UL/u);
});

// ----------------------------------------------------------------------------
// Verifie que le LAN ne reserve pas un second grand corps de reponse.
// ----------------------------------------------------------------------------
test("le LAN reutilise le corps de requete pour ses instantanes", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.match(
    server,
    /diagnosticsWriteSnapshot\(\s*localApiParser\.body,\s*sizeof\(localApiParser\.body\)/u,
  );
  assert.doesNotMatch(server, /diagnosticsBody|healthBody|char responseBody/u);
  assert.doesNotMatch(server, /\b(?:new|malloc|calloc|realloc|vector|String)\b/u);
});

// ----------------------------------------------------------------------------
// Verifie la sante enrichie et ses six cles stables.
// ----------------------------------------------------------------------------
test("la sante expose firmware, OS, uptime et connexions", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  const config = readFirmwareSource("src/config/build_config.h");
  assert.match(server, /"v=1\\nfw=%s\\nos=%s\\nu=%lu\\ni=%d\\nk=%d\\n"/u);
  assert.match(server, /BUILD_REVISION/u);
  assert.match(server, /BUILD_DEVICE_OS_VERSION/u);
  assert.match(config, /#define BUILD_DEVICE_OS_VERSION "2\.3\.1"/u);
});

// ----------------------------------------------------------------------------
// Verifie les methodes des deux routes de diagnostics et le corps vide du reset.
// ----------------------------------------------------------------------------
test("les routes de diagnostics appliquent leurs methodes exactes", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.match(
    server,
    /strcmp\(localApiParser\.path, "\/api\/v1\/diagnostics"\) == 0[\s\S]*?LOCAL_HTTP_METHOD_GET[\s\S]*?localApiRouteDiagnostics\(false\)/u,
  );
  assert.match(
    server,
    /strcmp\(localApiParser\.path, "\/api\/v1\/diagnostics\/reset"\) == 0[\s\S]*?LOCAL_HTTP_METHOD_POST[\s\S]*?bodyLength != 0[\s\S]*?localApiRouteDiagnostics\(true\)/u,
  );
});

// ----------------------------------------------------------------------------
// Verifie que les lectures ordinaires ne reinitialisent jamais les minimums.
// ----------------------------------------------------------------------------
test("seul endpoint reset demande la remise a zero", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.equal((server.match(/localApiRouteDiagnostics\(true\)/gu) ?? []).length, 1);
  assert.equal((server.match(/localApiRouteDiagnostics\(false\)/gu) ?? []).length, 1);
  assert.match(server, /static int32_t localApiDiagnosticsSequence = 0/u);
  assert.match(server, /localApiNextDiagnosticsSequence\(\)/u);
});

// ----------------------------------------------------------------------------
// Verifie que l'instantane LAN est servi aux points de cooperation reseau.
// ----------------------------------------------------------------------------
test("le diagnostic LAN reste disponible pendant un cycle de rendu long", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  const scheduler = readFirmwareSource("src/core/animation_scheduler.cpp");
  assert.doesNotMatch(server, /animationSchedulerMayReadSnapshot/u);
  assert.match(scheduler, /Particle\.process\(\);\s*localApiProcess\(\);/u);
  assert.match(
    server,
    /localApiParser\.state == LOCAL_HTTP_PARSER_READY\)\s*localApiRouteRequest\(\);/u,
  );
  assert.match(
    server,
    /idleElapsed >= LOCAL_API_IDLE_TIMEOUT_MS &&\s*localApiParser\.state != LOCAL_HTTP_PARSER_READY/u,
  );
});
