// ============================================================================
// MatrixCompactState - Tests hote des coordonnees compactes de Matrix
// ----------------------------------------------------------------------------
// Ce fichier verifie tailles, bornes et ordre aleatoire sans simuler le pilote
// NeoPixel ni les temporisations de l'animation reelle.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Longueur d'un axe du cube logique.
const SIDE = 8;

// Nombre de cases conserve pour les index historiques 1 a 8.
const MATRIX_COORDINATE_SLOTS = SIDE + 1;

// Decalages verticaux initiaux des quatre flux Matrix.
const MATRIX_INITIAL_WAVES = [7, 10, 15, 19];

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspecte par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Verifie la taille exacte des huit tableaux de coordonnees Matrix.
// ----------------------------------------------------------------------------
test("les coordonnees Matrix occupent exactement 72 octets", () => {
  // Etat global contenant les tableaux compacts de Matrix.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  assert.match(legacyState, /const uint8_t MATRIX_COORDINATE_SLOTS = SIDE \+ 1;/);
  assert.equal(8 * MATRIX_COORDINATE_SLOTS, 72);
  assert.equal(
    [...legacyState.matchAll(/CubeAxisIndex voxel[XYZ]w[1-4]\[MATRIX_COORDINATE_SLOTS\];/gu)]
      .length,
    8,
  );
  assert.match(legacyState, /== 72,/);
  assert.doesNotMatch(legacyState, /#define VOX_POINTS|int voxel[XYZ]w[1-4]\[/u);
});

// ----------------------------------------------------------------------------
// Verifie que les compteurs signes couvrent tout leur domaine historique.
// ----------------------------------------------------------------------------
test("les positions verticales Matrix tiennent dans int8_t", () => {
  // Plus petite position traitee avant le renouvellement d'un flux.
  const minimumWave = -10;
  // Plus grande position utilisee pendant l'amorcage historique.
  const maximumWave = Math.max(...MATRIX_INITIAL_WAVES);
  assert.ok(minimumWave >= -128);
  assert.ok(maximumWave <= 127);

  // Etat global contenant les quatre compteurs signes.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  for (let index = 0; index < MATRIX_INITIAL_WAVES.length; index += 1) {
    // Numero historique du flux inspecte.
    const streamNumber = index + 1;
    // Expression attendue pour l'initialisation d'entree du compteur.
    const initialization = new RegExp(
      `wave0${streamNumber} = ${MATRIX_INITIAL_WAVES[index]};`,
      "u",
    );
    // Implementation Matrix contenant l'initialisation complete d'entree.
    const matrixSource = fs.readFileSync(
      path.join(firmwareRoot, "src/animations/matrix.cpp"),
      "utf8",
    );
    assert.match(matrixSource, initialization);
  }
  assert.doesNotMatch(legacyState, /\bvoxDelay\b/u);
});

// ----------------------------------------------------------------------------
// Verifie que les 64 tirages de setup gardent leur ordre historique exact.
// ----------------------------------------------------------------------------
test("matrix_setup conserve les index et l'ordre des tirages aleatoires", () => {
  // Implementation Matrix inspectee sans executer le firmware.
  const matrixSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/matrix.cpp"),
    "utf8",
  );
  assert.match(matrixSource, /for\(int i=8;i>0;i--\)/u);

  // Affectations attendues pour un tour de boucle, dans l'ordre historique.
  const expectedAssignments = [];
  for (let stream = 1; stream <= 4; stream += 1) {
    expectedAssignments.push(`voxelXw${stream}[i]=rand()%8;`);
    expectedAssignments.push(`voxelZw${stream}[i]=rand()%8;`);
  }
  // Position de recherche apres la derniere affectation retrouvee.
  let searchOffset = matrixSource.indexOf("void matrix_setup()");
  for (const assignment of expectedAssignments) {
    // Position de l'affectation courante dans le corps de setup.
    const assignmentOffset = matrixSource.indexOf(assignment, searchOffset);
    assert.ok(assignmentOffset > searchOffset, `${assignment} absente ou deplacee`);
    searchOffset = assignmentOffset;
  }
  assert.equal(expectedAssignments.length * SIDE, 64);
});

// ----------------------------------------------------------------------------
// Verifie que chaque boucle de rendu conserve les index historiques 8 a 1.
// ----------------------------------------------------------------------------
test("les quatre flux Matrix conservent huit points rendus", () => {
  // Implementation Matrix inspectee pour compter les boucles descendantes.
  const matrixSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/matrix.cpp"),
    "utf8",
  );
  // Boucles descendantes de setup, rendu et renouvellement des quatre flux.
  const descendingLoops = matrixSource.match(/for\(int i=8;i>0;i--\)/gu) ?? [];
  assert.equal(descendingLoops.length, 9);
});
