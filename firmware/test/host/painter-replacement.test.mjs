// ============================================================================
// PainterReplacement - Tests hote du remplacement de CubePainter
// ----------------------------------------------------------------------------
// Ce fichier verifie le retrait du protocole historique, la reservation de son
// ID et la conservation du scratch RGB. Il ne teste pas les LED physiques.
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
// - contenu UTF-8 integral du fichier demande.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  return fs.readFileSync(path.join(firmwareRoot, relativePath), "utf8");
}

// ----------------------------------------------------------------------------
// Verifie que l'ancien point d'entree et son mode ne sont plus exposes.
// ----------------------------------------------------------------------------
test("CubePainter est retire mais son ID 33 reste reserve", () => {
  // Catalogue des identifiants qui interdit la reutilisation de 33.
  const modeIds = readFirmwareSource("src/config/mode_ids.h");
  // Registre actif qui ne doit plus publier l'ancien mode.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  // Point d'entree Particle qui ne doit plus publier l'ancienne fonction.
  const main = readFirmwareSource("src/main.cpp");
  assert.match(modeIds, /#define RESERVED_CUBE_PAINTER_ID\s+33/u);
  assert.doesNotMatch(legacyState, /"CubePainter"/u);
  assert.doesNotMatch(main, /Particle\.function\("CubePainter"/u);
  assert.equal(fs.existsSync(path.join(firmwareRoot, "src/animations/cube_painter.cpp")), false);
});

// ----------------------------------------------------------------------------
// Verifie que seule la route RGB332 remplace le protocole texte retire.
// ----------------------------------------------------------------------------
test("la peinture LAN utilise uniquement la route de frame RGB332", () => {
  // Serveur LAN portant la liste blanche et le routage actif.
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  assert.doesNotMatch(server, /\/api\/v1\/cube-painter/u);
  assert.doesNotMatch(server, /cubePainterFromBuffer/u);
  assert.match(server, /\/api\/v1\/painter\/frame/u);
  assert.match(server, /localApiRouteRgb332Frame\(holdFrame\)/u);
  assert.match(server, /streamApplyFrame\([\s\S]*localApiParser\.bodyLength,[\s\S]*holdFrame\)/u);
});

// ----------------------------------------------------------------------------
// Verifie que le stockage retire ne touche plus l'ancienne zone EEPROM.
// ----------------------------------------------------------------------------
test("l'initialisation EEPROM ignore l'ancien dessin et migre son mode", () => {
  // Initialisation persistante qui doit seulement conserver les reglages actifs.
  const storage = readFirmwareSource("src/storage/eeprom.cpp");
  assert.doesNotMatch(storage, /PAINTER_START_ADDR|PIXEL_CNT\s*\*\s*BPP/u);
  assert.match(storage, /getModeIndexFromID\(currentModeID\) < 0/u);
  assert.match(storage, /currentModeID = STANDBY;/u);
});

// ----------------------------------------------------------------------------
// Verifie que le retrait fonctionnel ne supprime pas le scratch mutualise.
// ----------------------------------------------------------------------------
test("le scratch RGB de 1536 octets reste partage par les transitions", () => {
  // Union statique commune aux animations mutuellement exclusives.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  // Transition globale qui consomme temporairement le scratch RGB.
  const transitions = readFirmwareSource("src/rendering/transitions.cpp");
  assert.match(legacyState, /unsigned char bytes\[PIXEL_CNT \* BPP\]/u);
  assert.match(legacyState, /#define sharedRgbScratch sharedAnimationScratch\.bytes/u);
  assert.match(legacyState, /"Le scratch RGB doit occuper exactement 1 536 octets"/u);
  assert.match(transitions, /sharedRgbScratch\[offset\]/u);
});
