// ============================================================================
// PacManFireworksOptimization - Tests hôte des sprites et trajectoires
// ----------------------------------------------------------------------------
// Ce fichier vérifie la capacité utile des sprites PacMan et l'unicité du
// calcul tangent Fireworks. Il ne remplace pas leur validation physique.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Nombre d'entrées PacMan et fantôme incluant la sentinelle zéro.
const MAIN_POINT_COUNT = 38;

// Nombre d'entrées des yeux incluant la sentinelle zéro.
const EYE_POINT_COUNT = 5;

// Taille d'un point compact en octets.
const PACKED_POINT_SIZE = 3;

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspectée par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Charge un fichier source du firmware.
//
// Parametres :
// - relativePath : chemin relatif depuis la racine firmware.
//
// Retour :
// - contenu UTF-8 du fichier demandé.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  return fs.readFileSync(path.join(firmwareRoot, relativePath), "utf8");
}

// ----------------------------------------------------------------------------
// Calcule les deux coefficients Fireworks avec deux appels historiques.
//
// Parametres :
// - frame : index de frame d'explosion entre zéro et 24.
//
// Retour :
// - coefficients slowrate et gravity arrondis en float32.
// ----------------------------------------------------------------------------
function legacyFireworksCoefficients(frame) {
  return {
    slowrate: Math.fround(1 + Math.tan((frame + 0.1) / 20) * 10),
    gravity: Math.fround(Math.tan((frame + 0.1) / 20) / 2),
  };
}

// ----------------------------------------------------------------------------
// Calcule les deux coefficients Fireworks avec une tangente mutualisée.
//
// Parametres :
// - frame : index de frame d'explosion entre zéro et 24.
//
// Retour :
// - coefficients slowrate et gravity arrondis en float32.
// ----------------------------------------------------------------------------
function sharedFireworksCoefficients(frame) {
  // Tangente double partagée comme dans le firmware optimisé.
  const trajectoryTangent = Math.tan((frame + 0.1) / 20);
  return {
    slowrate: Math.fround(1 + trajectoryTangent * 10),
    gravity: Math.fround(trajectoryTangent / 2),
  };
}

// ----------------------------------------------------------------------------
// Vérifie que PacMan ne conserve que ses 81 points réellement utilisés.
// ----------------------------------------------------------------------------
test("PacMan limite son scratch aux trois sprites utiles", () => {
  // Déclaration du scratch partagé.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  // Implémentation active de PacMan.
  const puckSource = readFirmwareSource("src/animations/puck_dude.cpp");
  assert.match(legacyState, /sizeof\(PuckDudeScratch\) == 243/u);
  assert.doesNotMatch(legacyState, /puckSprites\[4\]\[65\]/u);
  assert.doesNotMatch(puckSource, /\bghostface\[/u);
  assert.doesNotMatch(puckSource, /rotate_x\(Point&/u);
  assert.equal(
    (MAIN_POINT_COUNT * 2 + EYE_POINT_COUNT) * PACKED_POINT_SIZE,
    243,
  );
});

// ----------------------------------------------------------------------------
// Vérifie que les yeux restent dessinés dans la boucle et la couche historiques.
// ----------------------------------------------------------------------------
test("PacMan conserve l'ordre de dessin pour ses quatre yeux", () => {
  // Implémentation active de PacMan.
  const puckSource = readFirmwareSource("src/animations/puck_dude.cpp");
  assert.match(puckSource, /if\(i < PUCK_DUDE_EYE_POINT_COUNT\)/u);
  assert.ok(
    puckSource.indexOf("setPixelColor(puckdude[i]") <
      puckSource.indexOf("setPixelColor(ghosteye[i]"),
  );
  assert.ok(
    puckSource.indexOf("setPixelColor(ghosteye[i]") <
      puckSource.indexOf("setPixelColor(ghost[i]"),
  );
});

// ----------------------------------------------------------------------------
// Vérifie l'identité float32 des coefficients sur les 25 frames d'explosion.
// ----------------------------------------------------------------------------
test("Fireworks mutualise sa tangente sans changer ses coefficients", () => {
  for (let frame = 0; frame < 25; frame += 1) {
    assert.deepEqual(
      sharedFireworksCoefficients(frame),
      legacyFireworksCoefficients(frame),
    );
  }

  // Source de la famille CubeClassics.
  const classicsSource = readFirmwareSource("src/animations/cube_classics.cpp");
  // Corps isolé de la fonction Fireworks.
  const fireworksSource = classicsSource.slice(
    classicsSource.indexOf("int fireworks"),
    classicsSource.indexOf("int effect_rand_patharound"),
  );
  assert.equal((fireworksSource.match(/\btan\(/gu) ?? []).length, 1);
});
