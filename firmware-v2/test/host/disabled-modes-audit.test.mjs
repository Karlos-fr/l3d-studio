// ============================================================================
// DisabledModesAudit - Tests hôte des modes masqués et archivés
// ----------------------------------------------------------------------------
// Ce fichier vérifie leur inaccessibilité et les dépendances encore actives. Il
// ne prétend pas valider les prototypes avant leur future réactivation.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware-v2 inspectée par les tests.
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
// Vérifie que Light reste un fallback compatible mais non publié.
// ----------------------------------------------------------------------------
test("Light conserve son ID et son fallback sans entrée publiée", () => {
  // IDs historiques des modes.
  const modeIds = readFirmwareSource("src/config/mode_ids.h");
  // Registre publié par Particle.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  // Dispatcher conservant le fallback Light.
  const runtimeSource = readFirmwareSource("src/core/mode_runtime.cpp");

  assert.match(modeIds, /#define NORMAL\s+1\b/u);
  assert.match(legacyState, /\/\/\s*\{\s*NORMAL,\s*"Light"/u);
  assert.match(
    runtimeSource,
    /case NORMAL:[\s\S]*default:[\s\S]*transitionAll\(getColorFromInteger\(defaultColor\),LINEAR\)/u,
  );
});

// ----------------------------------------------------------------------------
// Vérifie que Lightning reste disponible uniquement comme sous-effet de Rain.
// ----------------------------------------------------------------------------
test("Lightning reste masqué mais utilisé par le switch Rain", () => {
  // Registre publié par Particle.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  // Animation Rain qui déclenche l'éclair.
  const rainSource = readFirmwareSource("src/animations/rain.cpp");
  // Implémentation de l'éclair auditée.
  const lightningSource = readFirmwareSource("src/animations/lightning.cpp");

  assert.match(legacyState, /\/\/\s*\{\s*LIGHTNING,/u);
  assert.match(rainSource, /if \(switch4\)[\s\S]*lightning\(\);/u);
  assert.doesNotMatch(lightningSource, /\bnew\b|malloc|String\s/u);
  assert.match(lightningSource, /Color clr\[4\];/u);
});

// ----------------------------------------------------------------------------
// Vérifie que Life, RomanCandle et HyperBall restent des archives sans API.
// ----------------------------------------------------------------------------
test("Les trois prototypes archivés ne déclarent aucune fonction active", () => {
  // En-têtes vides des trois prototypes non compilés.
  const disabledHeaders = [
    "src/animations/life_disabled.h",
    "src/animations/roman_candle_disabled.h",
    "src/animations/hyper_disabled.h",
  ];
  for (const relativePath of disabledHeaders) {
    // En-tête individuel qui doit rester sans prototype actif.
    const headerSource = readFirmwareSource(relativePath);
    assert.doesNotMatch(
      headerSource,
      /^\s*(?:void|int|float|bool)\s+\w+\s*\(/mu,
    );
  }
});
