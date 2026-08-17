// ============================================================================
// SnakeFixedState - Tests hôte du stockage borné de Snake
// ----------------------------------------------------------------------------
// Ce fichier vérifie les capacités et invariants indépendants du Photon. Il ne
// simule ni le framebuffer NeoPixel ni les temporisations du mode réel.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Longueur d'un axe du cube logique.
const SIDE = 8;

// Capacité maximale du corps de Snake.
const SNAKE_CAPACITY = SIDE * SIDE * SIDE;

// Borne exclusive historique utilisée pour placer les cibles.
const TREAT_SIDE = SIDE - 1;

// Directions orthogonales dans leur ordre de priorité historique.
const DIRECTIONS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware-v2 inspecté par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Indique si deux voxels de test occupent la même position.
//
// Parametres :
// - left : premier triplet à comparer.
// - right : second triplet à comparer.
//
// Retour :
// - vrai lorsque les trois coordonnées sont égales.
// ----------------------------------------------------------------------------
function voxelsEqual(left, right) {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

// ----------------------------------------------------------------------------
// Reproduit l'insertion en tête du tableau fixe de Snake.
//
// Parametres :
// - body : segments existants ordonnés de la tête vers la queue.
// - front : nouvelle tête à insérer.
// - grow : demande de croissance du corps.
//
// Retour :
// - nouveau corps borné à SNAKE_CAPACITY.
// ----------------------------------------------------------------------------
function insertSnakeFront(body, front, grow) {
  // Longueur autorisée après application de la croissance demandée.
  const nextLength = grow && body.length < SNAKE_CAPACITY
    ? body.length + 1
    : body.length;
  return [front, ...body].slice(0, nextLength);
}

// ----------------------------------------------------------------------------
// Recherche la première cible libre dans le domaine historique 0 à 6.
//
// Parametres :
// - body : positions déjà occupées par le serpent.
//
// Retour :
// - première position libre, ou null lorsque le domaine est plein.
// ----------------------------------------------------------------------------
function findFallbackTreat(body) {
  for (let j = 0; j < TREAT_SIDE; j += 1) {
    for (let k = 0; k < TREAT_SIDE; k += 1) {
      for (let l = 0; l < TREAT_SIDE; l += 1) {
        // Candidat déterministe courant du parcours de repli.
        const candidate = [j, k, l];
        if (!body.some(
          // ------------------------------------------------------------------
          // Compare le segment courant avec le candidat de cible.
          //
          // Parametres :
          // - segment : segment courant du corps testé.
          //
          // Retour :
          // - vrai lorsque le segment occupe le candidat.
          // ------------------------------------------------------------------
          (segment) => voxelsEqual(segment, candidate),
        )) {
          return candidate;
        }
      }
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Choisit la direction autorisée la plus proche d'une cible.
//
// Parametres :
// - head : position courante de la tête.
// - target : cible poursuivie.
// - allowedIndexes : directions autorisées dans leur ordre historique.
//
// Retour :
// - index de la première direction à distance minimale.
// ----------------------------------------------------------------------------
function chooseClosestDirection(head, target, allowedIndexes) {
  let selectedIndex = allowedIndexes[0];
  let leastDistance = Number.POSITIVE_INFINITY;
  // Index courant de la liste des directions autorisées.
  for (const directionIndex of allowedIndexes) {
    // Déplacement candidat lu dans l'ordre historique.
    const direction = DIRECTIONS[directionIndex];
    // Future position de la tête pour ce déplacement.
    const next = [
      head[0] + direction[0],
      head[1] + direction[1],
      head[2] + direction[2],
    ];
    // Distance entière au carré vers la cible.
    const distance =
      Math.pow(target[0] - next[0], 2) +
      Math.pow(target[1] - next[1], 2) +
      Math.pow(target[2] - next[2], 2);
    if (distance < leastDistance) {
      leastDistance = distance;
      selectedIndex = directionIndex;
    }
  }
  return selectedIndex;
}

// ----------------------------------------------------------------------------
// Vérifie que Snake ne dépend plus d'un conteneur ou d'une chaîne dynamique.
// ----------------------------------------------------------------------------
test("Snake ne contient plus d'allocation dynamique applicative", () => {
  // Implémentation active de Snake.
  const snakeSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/snake.cpp"),
    "utf8",
  );
  // Interface publique de Snake.
  const snakeHeader = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/snake.h"),
    "utf8",
  );
  assert.doesNotMatch(snakeSource, /\b(?:vector|String|new|malloc)\b/);
  assert.doesNotMatch(snakeHeader, /\b(?:vector|String|new|malloc)\b/);
});

// ----------------------------------------------------------------------------
// Vérifie que le corps réutilise exactement le scratch partagé existant.
// ----------------------------------------------------------------------------
test("le corps de 512 voxels tient dans le scratch partagé", () => {
  // État global historique contenant l'union de scratch.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  assert.match(legacyState, /const uint16_t SNAKE_CAPACITY = PIXEL_CNT;/);
  assert.match(legacyState, /voxel snakeVoxels\[SNAKE_CAPACITY\];/);
  assert.match(legacyState, /sizeof\(SharedAnimationScratch\) == PIXEL_CNT \* BPP/);
});

// ----------------------------------------------------------------------------
// Vérifie la croissance, le déplacement et la saturation du tableau fixe.
// ----------------------------------------------------------------------------
test("l'insertion en tête respecte la capacité du corps", () => {
  // Corps minimal utilisé pour vérifier une croissance normale.
  const shortBody = [[0, 0, 0], [0, 0, 1]];
  assert.deepEqual(
    insertSnakeFront(shortBody, [1, 0, 0], true),
    [[1, 0, 0], [0, 0, 0], [0, 0, 1]],
  );
  assert.deepEqual(
    insertSnakeFront(shortBody, [1, 0, 0], false),
    [[1, 0, 0], [0, 0, 0]],
  );

  // Corps saturé dont une croissance supplémentaire doit être refusée.
  const fullBody = Array.from(
    { length: SNAKE_CAPACITY },
    // ------------------------------------------------------------------------
    // Produit un voxel distinct à partir de son index linéaire.
    //
    // Parametres :
    // - _value : valeur inutilisée fournie par Array.from.
    // - index : index linéaire du voxel à produire.
    //
    // Retour :
    // - triplet logique correspondant à index.
    // ------------------------------------------------------------------------
    (_value, index) => [
      Math.floor(index / (SIDE * SIDE)),
      Math.floor(index / SIDE) % SIDE,
      index % SIDE,
    ],
  );
  assert.equal(insertSnakeFront(fullBody, [7, 7, 7], true).length, SNAKE_CAPACITY);
});

// ----------------------------------------------------------------------------
// Vérifie la terminaison du placement lorsque le domaine des cibles est plein.
// ----------------------------------------------------------------------------
test("le repli de cible trouve une place ou termine proprement", () => {
  assert.deepEqual(findFallbackTreat([]), [0, 0, 0]);

  // Domaine historique complet des cibles, limité aux coordonnées 0 à 6.
  const fullTreatDomain = [];
  for (let j = 0; j < TREAT_SIDE; j += 1) {
    for (let k = 0; k < TREAT_SIDE; k += 1) {
      for (let l = 0; l < TREAT_SIDE; l += 1) {
        fullTreatDomain.push([j, k, l]);
      }
    }
  }
  assert.equal(findFallbackTreat(fullTreatDomain), null);
});

// ----------------------------------------------------------------------------
// Vérifie que les égalités de distance conservent la première direction.
// ----------------------------------------------------------------------------
test("le choix de direction conserve la priorité historique", () => {
  assert.equal(chooseClosestDirection([3, 3, 3], [3, 3, 3], [0, 1, 2, 3, 4, 5]), 0);
  assert.equal(chooseClosestDirection([3, 3, 3], [3, 3, 3], [2, 3, 4, 5]), 2);
  assert.equal(chooseClosestDirection([3, 3, 3], [7, 3, 3], [0, 1, 2]), 0);
});
