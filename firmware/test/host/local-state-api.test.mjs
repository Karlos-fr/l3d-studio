// ============================================================================
// LocalStateApi - Tests hote de l'etat et des catalogues LAN
// ----------------------------------------------------------------------------
// Ce fichier verifie les routes de lecture, l'envoi segmente et la coherence
// des commandes. Il ne remplace pas la comparaison sur Photon reel.
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
// Verifie toutes les valeurs necessaires a la reconstruction de l'etat.
// ----------------------------------------------------------------------------
test("la route state expose mode, moteur, reglages, reseau et dernier resultat", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.match(server, /strcmp\(localApiParser\.path, "\/api\/v1\/state"\) == 0/u);
  assert.match(
    server,
    /"v=%d\\nm=%d\\nname=%s\\nkind=%s\\nb=%d\\ns=%d\\ncolors=%06lX;%06lX;%06lX;%06lX;%06lX;%06lX\\nswitches=%d;%d;%d;%d\\ni=%d\\nk=%d\\nrssi=%d\\nr=%d\\n"/u,
  );
  assert.match(server, /LOCAL_API_STATE_VERSION/u);
  assert.match(server, /localApiCurrentPlaybackKind\(\)/u);
  assert.match(server, /WiFi\.RSSI\(\)/u);
  assert.match(server, /lastCommandResult/u);
});

// ----------------------------------------------------------------------------
// Verifie la distinction native, streaming, peinture et procedural.
// ----------------------------------------------------------------------------
test("le moteur courant distingue les quatre sources de rendu", () => {
  // Serveur qui choisit le libelle de moteur expose.
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  // Recepteur qui conserve la politique de la derniere frame.
  const receiver = readFirmwareSource("src/network/stream_frames.cpp");
  // Contrat public utilise par le serveur dans le unity build.
  const receiverHeader = readFirmwareSource("src/network/stream_frames.h");
  assert.match(server, /currentModeID == STREAM/u);
  assert.match(server, /streamFrameIsHeld\(\) \? "painting" : "streaming"/u);
  assert.match(server, /currentModeID == BYTECODE/u);
  assert.match(server, /return "procedural";/u);
  assert.match(server, /return "native";/u);
  assert.match(receiver, /bool streamFrameIsHeld\(void\)/u);
  assert.match(receiverHeader, /bool streamFrameIsHeld\(void\);/u);
});

// ----------------------------------------------------------------------------
// Verifie que le serveur LAN conserve le dernier resultat commun.
// ----------------------------------------------------------------------------
test("le serveur LAN memorise le dernier code retourne", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  const dispatch = readFirmwareSource("src/core/command_dispatch.cpp");
  assert.match(server, /recordCommandResult\(/u);
  assert.match(dispatch, /lastCommandResult = result;\s*return result;/u);
});

// ----------------------------------------------------------------------------
// Verifie que les catalogues sont envoyes depuis leurs buffers historiques.
// ----------------------------------------------------------------------------
test("modes et switches auxiliaires utilisent des corps segmentes", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.match(server, /strcmp\(localApiParser\.path, "\/api\/v1\/modes"\) == 0/u);
  assert.match(server, /strcmp\(localApiParser\.path, "\/api\/v1\/aux-switches"\) == 0/u);
  assert.match(server, /const char\* bodyParts\[5\] = \{[\s\S]*?modeNameList[\s\S]*?modeParamList/u);
  assert.match(server, /const char\* bodyParts\[3\] = \{[\s\S]*?auxSwitchList/u);
  assert.doesNotMatch(server, /strcpy|strcat|memcpy\([^\n]*modeNameList/u);
});

// ----------------------------------------------------------------------------
// Verifie que le maximum theorique des catalogues tient sans pagination.
// ----------------------------------------------------------------------------
test("la capacite de reponse evite une pagination des catalogues", () => {
  const config = readFirmwareSource("src/config/build_config.h");
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  const maximumCatalogBody = (622 - 1) * 2 + "v=1\nnames=".length + "\nparams=".length + 1;
  assert.equal(maximumCatalogBody, 1261);
  assert.match(config, /#define LOCAL_API_RESPONSE_BODY_MAX\s+1536/u);
  assert.match(server, /bodyLength > LOCAL_API_RESPONSE_BODY_MAX/u);
  assert.ok(maximumCatalogBody < 1536);
});

// ----------------------------------------------------------------------------
// Verifie que les segments et index restent fixes et bornes.
// ----------------------------------------------------------------------------
test("l'envoi segmente reste borne a cinq tranches", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.match(server, /LOCAL_API_RESPONSE_PARTS_MAX = 5/u);
  assert.match(server, /bodyParts\[LOCAL_API_RESPONSE_PARTS_MAX\]/u);
  assert.match(server, /bodyPartLengths\[LOCAL_API_RESPONSE_PARTS_MAX\]/u);
  assert.match(server, /bodyPartCount > LOCAL_API_RESPONSE_PARTS_MAX/u);
  assert.doesNotMatch(server, /\b(?:new|malloc|calloc|realloc|vector|String)\b/u);
});

// ----------------------------------------------------------------------------
// Verifie que l'etat attend la fin d'un changement de mode differe.
// ----------------------------------------------------------------------------
test("la lecture state attend un mode coherent", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  const scheduler = readFirmwareSource("src/core/animation_scheduler.cpp");
  assert.match(server, /if\(!animationSchedulerMayReadState\(\)\)\s*return false;/u);
  assert.match(
    scheduler,
    /bool animationSchedulerMayReadState\(void\) \{\s*return animationPendingModeIndex == ANIMATION_PENDING_MODE_NONE;/u,
  );
});

// ----------------------------------------------------------------------------
// Verifie que les versions d'etat et de diagnostics sont independantes.
// ----------------------------------------------------------------------------
test("etat et diagnostics possedent deux versions explicites", () => {
  const config = readFirmwareSource("src/config/build_config.h");
  const diagnostics = readFirmwareSource("src/diagnostics/runtime_diagnostics.cpp");
  assert.match(config, /#define LOCAL_API_STATE_VERSION\s+1/u);
  assert.match(config, /#define DIAGNOSTICS_FORMAT_VERSION\s+1/u);
  assert.match(diagnostics, /DIAGNOSTICS_FORMAT_VERSION/u);
});
