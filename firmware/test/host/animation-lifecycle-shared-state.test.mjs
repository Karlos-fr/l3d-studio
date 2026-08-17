// ============================================================================
// AnimationLifecycleSharedState - Tests hote du cycle de vie mutualise
// ----------------------------------------------------------------------------
// Ce fichier verifie les frontieres enter/tick/exit et l'union d'etats. Il ne
// simule ni les sockets Particle ni le rendu physique du cube.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspectee par les tests.
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
// Verifie que tous les changements de mode suivent exit puis enter.
// ----------------------------------------------------------------------------
test("setNewMode applique la frontiere exit puis enter", () => {
  // Parseur qui porte l'unique affectation runtime du mode courant.
  const parser = readFirmwareSource("src/cloud/command_parser.cpp");
  // Debut de la fonction de changement de mode.
  const start = parser.indexOf("int setNewMode(int newModeIndex)");
  // Corps limite au helper suivant.
  const body = parser.slice(start, parser.indexOf("int getModeIndexFromName", start));
  // Affectation effective, distincte des comparaisons de garde precedentes.
  const modeAssignment = "currentModeID = modeStruct[newModeIndex].modeId;";
  assert.ok(body.indexOf("animationExit(oldModeID);") < body.indexOf(modeAssignment));
  assert.ok(body.indexOf(modeAssignment) < body.indexOf("animationEnter(currentModeID);"));
});

// ----------------------------------------------------------------------------
// Verifie les fermetures reseau et l'invalidation du proprietaire logique.
// ----------------------------------------------------------------------------
test("exit ferme les ressources et invalide la zone partagee", () => {
  // Implementation centrale du cycle de vie.
  const lifecycle = readFirmwareSource("src/core/animation_lifecycle.cpp");
  assert.match(lifecycle, /if\(modeId == CHEERLIGHTS\)[\s\S]*client\.stop\(\);/u);
  assert.match(lifecycle, /if\(modeId == LISTENER\)[\s\S]*Udp\.stop\(\);/u);
  assert.match(lifecycle, /activeAnimationModeId = ANIMATION_OWNER_NONE;/u);
});

// ----------------------------------------------------------------------------
// Verifie que les gros etats concurrents occupent une seule union.
// ----------------------------------------------------------------------------
test("Rain, scratch, Matrix, Squarrel et Collide partagent une union", () => {
  // Etat global contenant la zone mutualisee et ses contrats ABI.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  assert.match(
    legacyState,
    /union SharedAnimationState \{[\s\S]*RainSalvosState rain;[\s\S]*SharedAnimationScratch scratch;[\s\S]*MatrixState matrix;[\s\S]*SquarrelState squarrel;[\s\S]*CollideState collide;/u,
  );
  assert.match(
    legacyState,
    /sizeof\(SharedAnimationState\) == sizeof\(RainSalvosState\)/u,
  );
  assert.match(legacyState, /alignof\(SharedAnimationState\) >= alignof\(float\)/u);
});

// ----------------------------------------------------------------------------
// Verifie que CubePainter recharge son image seulement a l'entree du mode.
// ----------------------------------------------------------------------------
test("CubePainter recharge son buffer depuis EEPROM a chaque entree", () => {
  // Runtime contenant l'entree CubePainter.
  const runtime = readFirmwareSource("src/core/mode_runtime.cpp");
  // Initialisation EEPROM qui ne doit plus charger le framebuffer en RAM.
  const storage = readFirmwareSource("src/storage/eeprom.cpp");
  assert.match(runtime, /case CUBE_PAINTER:[\s\S]*EEPROM\.get\(PAINTER_START_ADDR, drawingBuffer\);/u);
  assert.doesNotMatch(storage, /EEPROM\.get\(PAINTER_START_ADDR, drawingBuffer\)/u);
});
