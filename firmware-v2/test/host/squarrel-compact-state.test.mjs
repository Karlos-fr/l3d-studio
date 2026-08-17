// ============================================================================
// SquarrelCompactState - Tests hote de la trainee compacte de Squarrel
// ----------------------------------------------------------------------------
// Ce fichier verifie les tailles et transformations discretes de Squarrel. Il
// ne simule ni les couleurs partagees ni les temporisations du Photon.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Longueur d'un axe du cube logique.
const SIDE = 8;

// Nombre historique de positions de la trainee Squarrel.
const SQUARREL_TRAIL_LENGTH = 50;

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware-v2 inspecte par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Reproduit le decalage de la trainee et l'insertion de l'ancien pixel.
//
// Parametres :
// - trail : positions courantes, de la plus recente a la plus ancienne.
// - previousPixel : pixel a inserer en tete.
//
// Retour :
// - nouvelle trainee de meme capacite.
// ----------------------------------------------------------------------------
function shiftTrail(trail, previousPixel) {
  return [previousPixel, ...trail.slice(0, SQUARREL_TRAIL_LENGTH - 1)];
}

// ----------------------------------------------------------------------------
// Reproduit le mapping historique d'une position selon l'axe Squarrel.
//
// Parametres :
// - position : triplet logique source.
// - axis : orientation historique comprise entre 0 et 5.
//
// Retour :
// - triplet affiché dans l'orientation demandee.
// ----------------------------------------------------------------------------
function mapSquarrelAxis(position, axis) {
  const [x, y, z] = position;
  switch (axis) {
    case 0: return [x, y, z];
    case 1: return [z, x, y];
    case 2: return [y, z, x];
    case 3: return [z, SIDE - 1 - x, y];
    case 4: return [y, z, SIDE - 1 - x];
    case 5: return [x, SIDE - 1 - y, z];
    default: throw new RangeError("axe Squarrel hors plage");
  }
}

// ----------------------------------------------------------------------------
// Verifie la taille de la trainee et des structures discretes.
// ----------------------------------------------------------------------------
test("la trainee Squarrel compacte occupe exactement 150 octets", () => {
  // Etat global contenant les structures compactes de Squarrel.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  assert.match(legacyState, /const uint8_t SQUARREL_TRAIL_LENGTH = 50;/);
  assert.match(legacyState, /sizeof\(SquarrelPosition\) == 3/);
  assert.match(legacyState, /sizeof\(SquarrelIncrement\) == 3/);
  assert.match(legacyState, /sizeof\(\(\(SquarrelState\*\)0\)->trailPoints\) == 150/);
  assert.equal(SQUARREL_TRAIL_LENGTH * 3, 150);
  assert.doesNotMatch(legacyState, /Point trailPoints|Point position, increment, pixel/u);
});

// ----------------------------------------------------------------------------
// Verifie les etats vide, plein et le retrait du dernier point de traine.
// ----------------------------------------------------------------------------
test("le decalage Squarrel conserve exactement les 50 positions recentes", () => {
  // Trainee pleine dont chaque element porte un index distinct.
  const fullTrail = Array.from(
    { length: SQUARREL_TRAIL_LENGTH },
    // ------------------------------------------------------------------------
    // Produit une position de test a partir de son index.
    //
    // Parametres :
    // - _value : valeur inutilisee fournie par Array.from.
    // - index : index de la position a produire.
    //
    // Retour :
    // - triplet identifiant la position.
    // ------------------------------------------------------------------------
    (_value, index) => [index, index, index],
  );
  // Ancien pixel insere en tete de la nouvelle trainee.
  const previousPixel = [7, 6, 5];
  // Trainee obtenue apres une frame.
  const shifted = shiftTrail(fullTrail, previousPixel);
  assert.equal(shifted.length, SQUARREL_TRAIL_LENGTH);
  assert.deepEqual(shifted[0], previousPixel);
  assert.deepEqual(shifted[1], fullTrail[0]);
  assert.deepEqual(shifted.at(-1), fullTrail[SQUARREL_TRAIL_LENGTH - 2]);
});

// ----------------------------------------------------------------------------
// Verifie les six permutations et inversions d'axes historiques.
// ----------------------------------------------------------------------------
test("les six orientations Squarrel conservent leur mapping", () => {
  // Position asymetrique qui distingue toutes les permutations.
  const position = [1, 2, 3];
  assert.deepEqual(mapSquarrelAxis(position, 0), [1, 2, 3]);
  assert.deepEqual(mapSquarrelAxis(position, 1), [3, 1, 2]);
  assert.deepEqual(mapSquarrelAxis(position, 2), [2, 3, 1]);
  assert.deepEqual(mapSquarrelAxis(position, 3), [3, 6, 2]);
  assert.deepEqual(mapSquarrelAxis(position, 4), [2, 3, 6]);
  assert.deepEqual(mapSquarrelAxis(position, 5), [1, 5, 3]);
});

// ----------------------------------------------------------------------------
// Verifie l'absence d'allocation et de position float dans Squarrel.
// ----------------------------------------------------------------------------
test("Squarrel ne contient plus d'etat de position dynamique ou float", () => {
  // Implementation active de Squarrel.
  const squarrelSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/squarral.cpp"),
    "utf8",
  );
  assert.doesNotMatch(squarrelSource, /\b(?:vector|String|new|malloc)\b/u);
  assert.match(squarrelSource, /SQUARREL_TRAIL_LENGTH/u);
  assert.doesNotMatch(squarrelSource, /\bPoint\b/u);
});
