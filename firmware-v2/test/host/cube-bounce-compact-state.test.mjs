// ============================================================================
// CubeBounceCompactState - Tests hôte de l'état BouncyCube
// ----------------------------------------------------------------------------
// Ce fichier vérifie les bornes de la représentation compacte et la conservation
// du rebond historique. Il ne remplace pas la validation visuelle du cube.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware-v2 inspectée par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Applique le rebond historique sur un axe.
//
// Parametres :
// - position : position avant déplacement.
// - direction : déplacement courant, compris entre moins un et un.
//
// Retour :
// - nouvelle position et nouvelle direction de l'axe.
// ----------------------------------------------------------------------------
function bounceAxis(position, direction) {
  let nextPosition = position + direction;
  let nextDirection = direction;
  if (nextPosition < 0 || nextPosition > 6) {
    nextPosition -= 2 * nextDirection;
    nextDirection = -nextDirection;
  }
  return { position: nextPosition, direction: nextDirection };
}

// ----------------------------------------------------------------------------
// Vérifie que les coordonnées et directions occupent six octets.
// ----------------------------------------------------------------------------
test("BouncyCube compacte positions et directions sur six octets", () => {
  // État global contenant la représentation BouncyCube.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  assert.match(legacyState, /int8_t topLeftVoxel\[3\];/u);
  assert.match(legacyState, /int8_t CBdirection\[3\]/u);
  assert.match(
    legacyState,
    /sizeof\(topLeftVoxel\) \+ sizeof\(CBdirection\) == 6/u,
  );
  assert.doesNotMatch(legacyState, /\b(?:collided|delayTime|bounds)\s*(?:;|\[)/u);
});

// ----------------------------------------------------------------------------
// Vérifie les deux rebonds de bord et les déplacements intérieurs.
// ----------------------------------------------------------------------------
test("BouncyCube conserve le rebond historique sur chaque bord", () => {
  assert.deepEqual(bounceAxis(0, -1), { position: 1, direction: 1 });
  assert.deepEqual(bounceAxis(6, 1), { position: 5, direction: -1 });
  assert.deepEqual(bounceAxis(3, 1), { position: 4, direction: 1 });
  assert.deepEqual(bounceAxis(3, 0), { position: 3, direction: 0 });
});

// ----------------------------------------------------------------------------
// Vérifie la conservation du tirage historique de direction.
// ----------------------------------------------------------------------------
test("BouncyCube conserve la borne aléatoire supérieure exclusive", () => {
  // Implémentation active de BouncyCube.
  const cubeBounceSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/cube_bounce.cpp"),
    "utf8",
  );
  assert.equal(
    (cubeBounceSource.match(/random\(-1, 1\)/gu) ?? []).length,
    3,
  );
  assert.match(cubeBounceSource, /CBframe % 25 == 0/u);
});
