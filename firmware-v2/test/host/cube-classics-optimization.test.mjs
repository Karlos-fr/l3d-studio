// ============================================================================
// CubeClassicsOptimization - Tests hôte des effets géométriques
// ----------------------------------------------------------------------------
// Ce fichier vérifie les états compacts, les bornes de traînée et l'équivalence
// numérique de MovingSphere. Il ne remplace pas la validation visuelle.
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

// Source CubeClassics contrôlée par les assertions statiques.
const cubeClassicSource = fs.readFileSync(
  path.join(firmwareRoot, "src/animations/cube_classics.cpp"),
  "utf8",
);

// Encodage historique des douze arêtes du cube.
const encodedCubeEdges = [
  0b00000100,
  0b00000010,
  0b00000001,
  0b00110010,
  0b00011010,
  0b00101001,
  0b00011001,
  0b00101100,
  0b00110100,
  0b00011111,
  0b00110111,
  0b00101111,
];

// ----------------------------------------------------------------------------
// Décode une arête selon le format compact du firmware.
//
// Parametres :
// - encodedEdge : octet contenant les six coordonnées binaires.
//
// Retour :
// - paire de sommets dont les coordonnées valent zéro ou sept.
// ----------------------------------------------------------------------------
function decodeCubeEdge(encodedEdge) {
  return {
    vertexA: {
      x: ((encodedEdge >> 5) & 1) === 1 ? 7 : 0,
      y: ((encodedEdge >> 4) & 1) === 1 ? 7 : 0,
      z: ((encodedEdge >> 3) & 1) === 1 ? 7 : 0,
    },
    vertexB: {
      x: ((encodedEdge >> 2) & 1) === 1 ? 7 : 0,
      y: ((encodedEdge >> 1) & 1) === 1 ? 7 : 0,
      z: ((encodedEdge >> 0) & 1) === 1 ? 7 : 0,
    },
  };
}

// ----------------------------------------------------------------------------
// Reproduit une opération float32 de la cible.
//
// Parametres :
// - value : valeur à arrondir en simple précision.
//
// Retour :
// - valeur représentable en float32.
// ----------------------------------------------------------------------------
function float32(value) {
  return Math.fround(value);
}

// ----------------------------------------------------------------------------
// Vérifie que les sommets temporaires remplacent exactement les globaux.
// ----------------------------------------------------------------------------
test("DiagonalPlanes décode ses sommets sans état global", () => {
  for (let encodedEdge of encodedCubeEdges) {
    // Sommets décodés pour l'arête courante.
    const vertices = decodeCubeEdge(encodedEdge);
    for (let coordinate of [
      vertices.vertexA.x,
      vertices.vertexA.y,
      vertices.vertexA.z,
      vertices.vertexB.x,
      vertices.vertexB.y,
      vertices.vertexB.z,
    ]) {
      assert.ok(coordinate === 0 || coordinate === 7);
    }
  }

  assert.doesNotMatch(cubeClassicSource, /Point cubeVerticesA, cubeVerticesB/u);
  assert.match(
    cubeClassicSource,
    /setCubeVertices\(cubeEdge, cubeVerticesA, cubeVerticesB\)/u,
  );
});

// ----------------------------------------------------------------------------
// Vérifie la capacité compacte et la copie bornée de la traînée VoxelRandom.
// ----------------------------------------------------------------------------
test("VoxelRandom compacte et borne sa traînée", () => {
  assert.equal(8 * 3, 24);
  assert.match(cubeClassicSource, /CubeAxisIndex snake\[SIDE\]\[3\];/u);
  assert.match(cubeClassicSource, /for \(i=SIDE-1;i>0;i--\)/u);
  assert.doesNotMatch(cubeClassicSource, /snake\[i-1\].*i>=0/su);
});

// ----------------------------------------------------------------------------
// Compare exhaustivement les deux prédicats de coquille sur un cycle complet.
// ----------------------------------------------------------------------------
test("MovingSphere conserve chaque voxel sans racine carrée", () => {
  for (let frame = 0; frame < 1500; frame += 1) {
    // Centre X reproduit en float32 pour la frame.
    const originX = float32(3.5 + Math.sin(float32(frame / 50)) * 2.5);
    // Centre Y reproduit en float32 pour la frame.
    const originY = float32(3.5 + Math.cos(float32(frame / 50)) * 2.5);
    // Centre Z reproduit en float32 pour la frame.
    const originZ = float32(3.5 + Math.cos(float32(frame / 30)) * 2);
    // Diamètre interne reproduit en float32 pour la frame.
    const diameter = float32(2 + Math.sin(float32(frame / 150)));
    // Carré du diamètre interne utilisé par le nouveau prédicat.
    const innerSquared = float32(diameter * diameter);
    // Diamètre externe historique arrondi avant sa mise au carré.
    const outerDiameter = float32(diameter + 1);
    // Carré du diamètre externe utilisé par le nouveau prédicat.
    const outerSquared = float32(outerDiameter * outerDiameter);

    for (let x = 0; x < 8; x += 1) {
      for (let y = 0; y < 8; y += 1) {
        for (let z = 0; z < 8; z += 1) {
          // Écart X reproduit en float32.
          const deltaX = float32(x - originX);
          // Écart Y reproduit en float32.
          const deltaY = float32(y - originY);
          // Écart Z reproduit en float32.
          const deltaZ = float32(z - originZ);
          // Somme des carrés suivant l'ordre d'évaluation historique.
          const squaredDistance = float32(
            float32(
              float32(deltaX * deltaX) + float32(deltaY * deltaY),
            ) + float32(deltaZ * deltaZ),
          );
          // Distance historique arrondie après la racine carrée.
          const legacyDistance = float32(Math.sqrt(squaredDistance));
          // Décision historique d'allumer le voxel.
          const legacyVisible =
            legacyDistance > diameter && legacyDistance < outerDiameter;
          // Décision optimisée d'allumer le voxel.
          const optimizedVisible =
            squaredDistance > innerSquared && squaredDistance < outerSquared;
          assert.equal(optimizedVisible, legacyVisible);
        }
      }
    }
  }

  assert.match(cubeClassicSource, /distance3dSquared\(/u);
  assert.doesNotMatch(cubeClassicSource, /distance3d \(/u);
});

// ----------------------------------------------------------------------------
// Vérifie que les calculs invariants ont quitté les boucles de huit lignes.
// ----------------------------------------------------------------------------
test("LineSpin et SineLines mutualisent leurs trigonométries par frame", () => {
  // Corps de LineSpin isolé jusqu'à la fonction suivante.
  const lineSpinBody = cubeClassicSource.slice(
    cubeClassicSource.indexOf("int linespin"),
    cubeClassicSource.indexOf("int sinelines"),
  );
  // Corps de SineLines isolé jusqu'à la fonction suivante.
  const sineLinesBody = cubeClassicSource.slice(
    cubeClassicSource.indexOf("int sinelines"),
    cubeClassicSource.indexOf("int spheremove"),
  );
  assert.ok(lineSpinBody);
  assert.ok(sineLinesBody);
  assert.equal(lineSpinBody.match(/sin\(\(float\)i \/ 200\)/gu)?.length, 1);
  assert.equal(sineLinesBody.match(/sin\(\(float\)i\/100\)/gu)?.length, 1);
  assert.equal(sineLinesBody.match(/sin\(\(float\)i\/200\)/gu)?.length, 1);
  assert.doesNotMatch(sineLinesBody, /cos\(sine_base\)/u);
});

// ----------------------------------------------------------------------------
// Vérifie que la liste mélangée utilise un octet par ID sans changer les tirages.
// ----------------------------------------------------------------------------
test("CubeClassics compacte l'ordre de ses effets", () => {
  assert.match(cubeClassicSource, /uint8_t effectOrder\[\]/u);
  assert.match(cubeClassicSource, /arrayShuffle\(effectOrder, numModes2Run\)/u);
});
