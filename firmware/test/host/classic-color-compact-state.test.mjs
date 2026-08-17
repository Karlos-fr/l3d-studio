// ============================================================================
// ClassicColorCompactState - Tests hôte des effets couleur
// ----------------------------------------------------------------------------
// Ce fichier vérifie les compteurs bornés et l'atténuation commune des chasers.
// Il ne remplace pas les comparaisons physiques des animations.
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
// Vérifie l'atténuation à sept huitièmes sur tous les canaux possibles.
// ----------------------------------------------------------------------------
test("les chasers partagent l'atténuation Rain exacte", () => {
  for (let value = 0; value <= 255; value += 1) {
    assert.equal(
      Math.trunc(value * 7 / 8),
      Math.trunc(value - value * 0.125),
    );
  }

  // Implémentation du chaser monochrome.
  const colorAllSource = readFirmwareSource("src/animations/color_all.cpp");
  // Implémentation du chaser double et des effets couleur.
  const classicSource = readFirmwareSource(
    "src/animations/classic_color_effects.cpp",
  );
  // Primitive partagée portant l'atténuation entière.
  const primitivesSource = readFirmwareSource("src/rendering/primitives.cpp");
  assert.match(colorAllSource, /fadeColorSevenEighths\(/u);
  assert.match(classicSource, /fadeColorSevenEighths\(/u);
  assert.match(
    primitivesSource,
    /static_cast<uint16_t>\(color\.red\) \* 7 \/ 8/u,
  );
});

// ----------------------------------------------------------------------------
// Vérifie que les états permanents utilisent leurs bornes réelles.
// ----------------------------------------------------------------------------
test("les compteurs des effets couleur utilisent des types compacts", () => {
  // État global Rainbow Burst.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  // États statiques des effets couleur historiques.
  const classicSource = readFirmwareSource(
    "src/animations/classic_color_effects.cpp",
  );
  // État statique du chaser monochrome.
  const colorAllSource = readFirmwareSource("src/animations/color_all.cpp");
  assert.match(legacyState, /uint16_t idex;/u);
  assert.match(legacyState, /uint8_t ihue;/u);
  assert.match(classicSource, /static uint8_t hue = 255;/u);
  assert.match(classicSource, /static int16_t ival = 0;/u);
  assert.match(classicSource, /static bool bouncedirection = false;/u);
  assert.match(classicSource, /static uint8_t left_right = 0;/u);
  assert.match(classicSource, /static uint16_t idex1 = random/u);
  assert.match(classicSource, /static uint16_t idex2 = random/u);
  assert.match(classicSource, /static uint16_t pixelCount = 0;/u);
  assert.match(colorAllSource, /static uint16_t pixelIndex = 0;/u);
});

// ----------------------------------------------------------------------------
// Vérifie que le compteur de teinte conserve sa séquence modulo 256.
// ----------------------------------------------------------------------------
test("Transition conserve les 256 teintes historiques", () => {
  let legacyHue = -1;
  let compactHue = 255;
  for (let frame = 0; frame < 1024; frame += 1) {
    legacyHue += 1;
    if (legacyHue > 255) {
      legacyHue = 0;
    }
    compactHue = (compactHue + 1) & 0xFF;
    assert.equal(compactHue, legacyHue);
  }
});
