// ============================================================================
// RainPlanesCompact - Tests hôte des atténuations et états compacts
// ----------------------------------------------------------------------------
// Ce fichier compare exhaustivement les facteurs Rain et vérifie les bornes
// mémoire de SlidingPlanes et LineSpiral. Il ne valide pas leur apparence.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
// Reproduit l'atténuation flottante historique d'un canal Rain.
//
// Parametres :
// - value : canal entier entre zéro et 255.
// - factor : facteur historique appliqué au canal.
//
// Retour :
// - canal tronqué vers zéro comme un uint8_t.
// ----------------------------------------------------------------------------
function legacyScale(value, factor) {
  return Math.trunc(value * factor);
}

// ----------------------------------------------------------------------------
// Reproduit la soustraction historique d'un huitième.
//
// Parametres :
// - value : canal entier entre zéro et 255.
//
// Retour :
// - canal atténué et tronqué vers zéro.
// ----------------------------------------------------------------------------
function legacyFade(value) {
  return Math.trunc(value - value * 0.125);
}

// ----------------------------------------------------------------------------
// Vérifie l'identité des quatre facteurs Rain sur tous les canaux possibles.
// ----------------------------------------------------------------------------
test("Rain conserve exactement ses atténuations sur 256 valeurs", () => {
  for (let value = 0; value <= 255; value += 1) {
    assert.equal(value >> 1, legacyScale(value, 0.5));
    assert.equal(value >> 2, legacyScale(value, 0.25));
    assert.equal(value >> 3, legacyScale(value, 0.125));
    assert.equal(Math.trunc(value * 7 / 8), legacyFade(value));
  }
});

// ----------------------------------------------------------------------------
// Vérifie que la boucle Rain active n'utilise plus de facteur flottant.
// ----------------------------------------------------------------------------
test("Rain utilise ses helpers entiers dans la boucle voxel", () => {
  // Implémentation active de Rain.
  const rainSource = readFirmwareSource("src/animations/rain.cpp");
  assert.doesNotMatch(rainSource, /\b(?:0\.5|0\.125|0\.25)\b/u);
  assert.doesNotMatch(rainSource, /Point rainDrop/u);
  assert.match(rainSource, /scaleRainColor\(pixelColor, 3\)/u);
  assert.match(rainSource, /fadeColorSevenEighths\(getPixelColor/u);
});

// ----------------------------------------------------------------------------
// Vérifie les types bornés des deux animations de plans.
// ----------------------------------------------------------------------------
test("SlidingPlanes et LineSpiral utilisent un état entier compact", () => {
  // Déclarations historiques des deux modes.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  assert.match(legacyState, /int8_t CPinc = 1;/u);
  assert.match(legacyState, /int8_t CPpos = 0;/u);
  assert.match(legacyState, /int8_t TARGET = 0;/u);
  assert.match(legacyState, /uint8_t SPbrightness;/u);
  assert.match(legacyState, /uint8_t LOOP_NO = 0;/u);
  assert.match(legacyState, /uint8_t DSSIDE = 1;/u);
  assert.match(legacyState, /uint8_t ColourRotatorState = 0;/u);
  assert.doesNotMatch(legacyState, /\b(?:fade_factor|PAUSE|STEPS)\b/u);
});
