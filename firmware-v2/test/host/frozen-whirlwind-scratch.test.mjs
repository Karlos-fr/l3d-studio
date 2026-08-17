// ============================================================================
// FrozenWhirlwindScratch - Tests hôte du scratch partagé
// ----------------------------------------------------------------------------
// Ce fichier vérifie que Frozen et Whirlwind ne réservent plus leurs tableaux
// temporaires en permanence. Il ne valide pas leur apparence sur le cube.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Nombre maximal historique de points Whirlwind.
const WHIRLWIND_DOT_COUNT = 19;

// Taille compacte d'une couleur RGB.
const COLOR_SIZE = 3;

// Taille d'un float sur le Photon.
const FLOAT_SIZE = 4;

// Taille alignée attendue de l'état Whirlwind.
const WHIRLWIND_STATE_SIZE = 288;

// Nombre maximal historique de flocons Frozen.
const FROZEN_FLAKE_COUNT = 51;

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware-v2 inspectée par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Charge un fichier source du firmware.
//
// Parametres :
// - relativePath : chemin relatif depuis la racine firmware-v2.
//
// Retour :
// - contenu UTF-8 du fichier demandé.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  return fs.readFileSync(path.join(firmwareRoot, relativePath), "utf8");
}

// ----------------------------------------------------------------------------
// Vérifie que Frozen réutilise le tableau uint16_t du scratch.
// ----------------------------------------------------------------------------
test("Frozen place ses positions dans le scratch partagé", () => {
  // État global et définition du scratch partagé.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  assert.doesNotMatch(legacyState, /^uint16_t randomFlakes\[/mu);
  assert.match(
    legacyState,
    /#define randomFlakes sharedAnimationScratch\.pixelOrder/u,
  );
  assert.equal(FROZEN_FLAKE_COUNT * 2, 102);
});

// ----------------------------------------------------------------------------
// Vérifie la taille et l'intégration de l'état Whirlwind.
// ----------------------------------------------------------------------------
test("Whirlwind place ses 288 octets temporaires dans le scratch", () => {
  // État global et définition du scratch partagé.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  assert.match(legacyState, /WhirlwindScratch whirlwind;/u);
  assert.match(
    legacyState,
    /sizeof\(WhirlwindScratch\) == 288/u,
  );
  assert.doesNotMatch(legacyState, /^float (?:angle|radi|y)\[/mu);
  assert.equal(
    Math.ceil(
      (WHIRLWIND_DOT_COUNT * COLOR_SIZE) / FLOAT_SIZE,
    ) * FLOAT_SIZE + WHIRLWIND_DOT_COUNT * FLOAT_SIZE * 3,
    WHIRLWIND_STATE_SIZE,
  );
});

// ----------------------------------------------------------------------------
// Vérifie que la cadence de déplacement historique reste explicitement gardée.
// ----------------------------------------------------------------------------
test("Whirlwind conserve ses 19 passes historiques", () => {
  // Implémentation active de Whirlwind.
  const whirlwindSource = readFirmwareSource("src/animations/whirlwind.cpp");
  assert.match(
    whirlwindSource,
    /for \(int pass = 0; pass < MAX_DOTS; pass\+\+\)/u,
  );
  assert.match(whirlwindSource, /randomDecimal\(\) \/ 200/u);
  assert.match(whirlwindSource, /randomDecimal\(\) \/ 100/u);
});
