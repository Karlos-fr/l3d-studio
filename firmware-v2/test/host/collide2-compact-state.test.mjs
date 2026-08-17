// ============================================================================
// Collide2CompactState - Tests hote de l'etat compact de Collide2
// ----------------------------------------------------------------------------
// Ce fichier verifie tailles, bornes et invariants aleatoires. Il ne reproduit
// ni le framebuffer complet ni la sphere trigonometrique historique.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Longueur d'un axe du cube logique.
const SIDE = 8;

// Nombre historique de points Collide2.
const COLLIDE_DOT_COUNT = 72;

// Taille cible d'un point compact sur l'ABI Photon.
const COMPACT_DOT_BYTES = 9;

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware-v2 inspecte par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Reproduit le repli historique d'une coordonnee apres un pas unitaire.
//
// Parametres :
// - coordinate : coordonnee comprise entre -1 et 8.
//
// Retour :
// - coordonnee repliee entre 0 et 7.
// ----------------------------------------------------------------------------
function wrapCoordinate(coordinate) {
  if (coordinate >= SIDE) {
    return 0;
  }
  if (coordinate < 0) {
    return SIDE - 1;
  }
  return coordinate;
}

// ----------------------------------------------------------------------------
// Verifie la structure de neuf octets et la capacite historique de 72 points.
// ----------------------------------------------------------------------------
test("les points Collide2 compacts occupent exactement 648 octets", () => {
  // Etat global contenant la structure compacte Collide2.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  assert.match(legacyState, /const uint8_t COLLIDE_DOT_COUNT = 72;/);
  assert.match(legacyState, /CubeAxisIndex x;/);
  assert.match(legacyState, /int8_t directionX;/);
  assert.match(legacyState, /sizeof\(CompactCollideDot\) == 9/);
  assert.match(legacyState, /sizeof\(CollideState\) == 648/);
  assert.equal(COLLIDE_DOT_COUNT * COMPACT_DOT_BYTES, 648);
  assert.doesNotMatch(legacyState, /\bCO(?:dots|dir|clr)\b/u);
});

// ----------------------------------------------------------------------------
// Verifie toutes les frontieres atteignables du repli toroïdal.
// ----------------------------------------------------------------------------
test("le repli Collide2 conserve les coordonnees historiques", () => {
  assert.equal(wrapCoordinate(-1), 7);
  assert.equal(wrapCoordinate(0), 0);
  assert.equal(wrapCoordinate(7), 7);
  assert.equal(wrapCoordinate(8), 0);
});

// ----------------------------------------------------------------------------
// Verifie les six directions orthogonales acceptees par le tirage historique.
// ----------------------------------------------------------------------------
test("le filtre de direction accepte exactement six vecteurs unitaires", () => {
  // Vecteurs du domaine brut -1 a 1 acceptes par la norme de Manhattan.
  const acceptedDirections = [];
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        if (Math.abs(x) + Math.abs(y) + Math.abs(z) === 1) {
          acceptedDirections.push([x, y, z]);
        }
      }
    }
  }
  assert.deepEqual(acceptedDirections, [
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, -1],
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
  ]);
});

// ----------------------------------------------------------------------------
// Verifie l'absence d'allocation et le maintien de la sphere historique.
// ----------------------------------------------------------------------------
test("Collide2 reste statique et conserve sa sphere trigonometrique", () => {
  // Implementation active de Collide2.
  const collideSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/collide2.cpp"),
    "utf8",
  );
  assert.doesNotMatch(collideSource, /\b(?:vector|String|new|malloc)\b/u);
  assert.match(collideSource, /const float resolution = 30;/);
  assert.match(collideSource, /for \(float m = 0; m < resolution; m\+\+\)/);
  assert.match(collideSource, /for \(float n = 0; n < resolution; n\+\+\)/);
  assert.match(collideSource, /\bsin\(/u);
  assert.match(collideSource, /\bcos\(/u);
});

// ----------------------------------------------------------------------------
// Verifie l'ordre initial position, couleur puis direction pour chaque point.
// ----------------------------------------------------------------------------
test("l'initialisation Collide2 conserve l'ordre des tirages", () => {
  // Implementation active de Collide2.
  const collideSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/collide2.cpp"),
    "utf8",
  );
  // Operations aleatoires attendues dans leur ordre historique.
  const expectedOperations = [
    "dot.x = rand() % SIDE;",
    "dot.y = rand() % SIDE;",
    "dot.z = rand() % SIDE;",
    "randomPackedColor(&dot.color);",
    "randomizeCollideDirection(dot);",
  ];
  // Position de recherche apres la derniere operation retrouvee.
  let searchOffset = collideSource.indexOf("void initCollide()");
  for (const operation of expectedOperations) {
    // Position de l'operation courante dans initCollide.
    const operationOffset = collideSource.indexOf(operation, searchOffset);
    assert.ok(operationOffset > searchOffset, `${operation} absente ou deplacee`);
    searchOffset = operationOffset;
  }
});
