// ============================================================================
// Phase4Rendering - Tests hote des types, du mapping et des calculs compacts
// ----------------------------------------------------------------------------
// Ce fichier verifie les invariants independants du Photon. Il ne pilote pas le
// cube et ne remplace pas la compilation Particle ni la validation visuelle.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Longueur d'un axe du cube logique.
const SIDE = 8;

// Nombre total de voxels et de LED du cube.
const VOXEL_COUNT = SIDE * SIDE * SIDE;

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspecte par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// Plus grande valeur produite par rand sur la cible historique.
const RAND_MAX = 2147483647;

// ----------------------------------------------------------------------------
// Reproduit le mapping historique centralise par VoxelMapping.
//
// Parametres :
// - x : colonne logique candidate.
// - y : hauteur logique candidate.
// - z : plan logique candidat.
//
// Retour :
// - index de 0 a 511, ou null pour une position invalide.
// ----------------------------------------------------------------------------
function voxelIndex(x, y, z) {
  if (x < 0 || x >= SIDE || y < 0 || y >= SIDE || z < 0 || z >= SIDE) {
    return null;
  }
  return z * SIDE * SIDE + x * SIDE + y;
}

// ----------------------------------------------------------------------------
// Calcule l'ancien carre du fondu chaud avec la precision double de pow.
//
// Parametres :
// - value : intensite entiere de 0 a 255.
//
// Retour :
// - octet tronque produit par l'ancienne formule.
// ----------------------------------------------------------------------------
function legacyFadeSquare(value) {
  return Math.trunc(255 * Math.pow(value / 255, 2));
}

// ----------------------------------------------------------------------------
// Simule la nouvelle formule du fondu avec les arrondis float 32 bits.
//
// Parametres :
// - value : intensite entiere de 0 a 255.
//
// Retour :
// - octet tronque produit par la nouvelle formule.
// ----------------------------------------------------------------------------
function compactFadeSquare(value) {
  // Intensite source arrondie et ramenee dans l'intervalle unitaire.
  const normalized = Math.fround(Math.fround(value) / Math.fround(255));
  return Math.trunc(Math.fround(Math.fround(255) * normalized * normalized));
}

// ----------------------------------------------------------------------------
// Calcule l'ancienne distance euclidienne entre deux positions discretes.
//
// Parametres :
// - source : triplet de depart.
// - target : triplet cible.
//
// Retour :
// - distance avec racine carree.
// ----------------------------------------------------------------------------
function legacyDistance(source, target) {
  return Math.sqrt(
    Math.pow(target[0] - source[0], 2) +
    Math.pow(target[1] - source[1], 2) +
    Math.pow(target[2] - source[2], 2),
  );
}

// ----------------------------------------------------------------------------
// Calcule la nouvelle distance entiere au carre entre deux positions.
//
// Parametres :
// - source : triplet de depart.
// - target : triplet cible.
//
// Retour :
// - somme des trois carres sans racine carree.
// ----------------------------------------------------------------------------
function compactDistanceSquared(source, target) {
  // Ecart discret sur l'axe x.
  const deltaX = target[0] - source[0];
  // Ecart discret sur l'axe y.
  const deltaY = target[1] - source[1];
  // Ecart discret sur l'axe z.
  const deltaZ = target[2] - source[2];
  return deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
}

// ----------------------------------------------------------------------------
// Calcule l'ancienne magnitude Spectrum avec des carres issus de pow.
//
// Parametres :
// - realValue : composante reelle stockee en float.
// - imaginaryValue : composante imaginaire stockee en float.
//
// Retour :
// - magnitude reconvertie dans le float du tableau historique.
// ----------------------------------------------------------------------------
function legacySpectrumMagnitude(realValue, imaginaryValue) {
  return Math.fround(Math.sqrt(Math.pow(imaginaryValue, 2) + Math.pow(realValue, 2)));
}

// ----------------------------------------------------------------------------
// Simule la magnitude Spectrum avec des multiplications en float.
//
// Parametres :
// - realValue : composante reelle stockee en float.
// - imaginaryValue : composante imaginaire stockee en float.
//
// Retour :
// - magnitude reconvertie dans le float du tableau historique.
// ----------------------------------------------------------------------------
function compactSpectrumMagnitude(realValue, imaginaryValue) {
  // Carre de la composante reelle arrondi en float 32 bits.
  const squaredReal = Math.fround(Math.fround(realValue) * Math.fround(realValue));
  // Carre de la composante imaginaire arrondi en float 32 bits.
  const squaredImaginary = Math.fround(Math.fround(imaginaryValue) * Math.fround(imaginaryValue));
  return Math.fround(Math.sqrt(Math.fround(squaredImaginary + squaredReal)));
}

// ----------------------------------------------------------------------------
// Reproduit le choix Crumble historique en precision double.
//
// Parametres :
// - randomValue : sortie positive de rand.
// - remainingCount : nombre de positions restantes.
//
// Retour :
// - indice tronque dans le vector historique.
// ----------------------------------------------------------------------------
function legacyCrumbleIndex(randomValue, remainingCount) {
  return Math.trunc((randomValue / RAND_MAX) * (remainingCount - 1));
}

// ----------------------------------------------------------------------------
// Reproduit le choix Crumble avec une mise a l'echelle entiere exacte.
//
// Parametres :
// - randomValue : sortie positive de rand.
// - remainingCount : nombre de positions restantes.
//
// Retour :
// - indice tronque dans le vector historique.
// ----------------------------------------------------------------------------
function compactCrumbleIndex(randomValue, remainingCount) {
  return Number((BigInt(randomValue) * BigInt(remainingCount - 1)) / BigInt(RAND_MAX));
}

// ----------------------------------------------------------------------------
// Verifie les huit coins connus du mapping physique historique.
// ----------------------------------------------------------------------------
test("le mapping conserve les huit coins historiques", () => {
  assert.equal(voxelIndex(0, 0, 0), 0);
  assert.equal(voxelIndex(0, 7, 0), 7);
  assert.equal(voxelIndex(7, 0, 0), 56);
  assert.equal(voxelIndex(7, 7, 0), 63);
  assert.equal(voxelIndex(0, 0, 7), 448);
  assert.equal(voxelIndex(0, 7, 7), 455);
  assert.equal(voxelIndex(7, 0, 7), 504);
  assert.equal(voxelIndex(7, 7, 7), 511);
});

// ----------------------------------------------------------------------------
// Verifie que les plans et aretes couvrent exactement les 512 LED.
// ----------------------------------------------------------------------------
test("les plans produisent 512 index uniques et contigus", () => {
  // Ensemble global des index rencontres dans l'ordre du parcours logique.
  const indexes = new Set();
  for (let z = 0; z < SIDE; z += 1) {
    // Ensemble des 64 index appartenant au plan courant.
    const planeIndexes = new Set();
    for (let x = 0; x < SIDE; x += 1) {
      for (let y = 0; y < SIDE; y += 1) {
        // Index produit pour le voxel courant.
        const index = voxelIndex(x, y, z);
        indexes.add(index);
        planeIndexes.add(index);
      }
    }
    assert.equal(planeIndexes.size, SIDE * SIDE);
    assert.equal(Math.min(...planeIndexes), z * SIDE * SIDE);
    assert.equal(Math.max(...planeIndexes), z * SIDE * SIDE + 63);
  }
  assert.deepEqual([...indexes], [...Array(VOXEL_COUNT).keys()]);
});

// ----------------------------------------------------------------------------
// Verifie que chaque axe refuse ses deux sentinelles immediates.
// ----------------------------------------------------------------------------
test("le mapping refuse les coordonnees hors de 0 a 7", () => {
  for (let axis = 0; axis < 3; axis += 1) {
    // Sentinelle basse puis haute testee sur l'axe courant.
    for (const invalidCoordinate of [-1, 8]) {
      // Position valide par defaut dont un axe sera rendu invalide.
      const coordinates = [0, 0, 0];
      coordinates[axis] = invalidCoordinate;
      assert.equal(voxelIndex(...coordinates), null);
    }
  }
});

// ----------------------------------------------------------------------------
// Verifie que les primitives passent par le mapping unique et borne.
// ----------------------------------------------------------------------------
test("les primitives utilisent le mapping centralise", () => {
  // Source des primitives de lecture et d'ecriture logiques.
  const primitives = fs.readFileSync(path.join(firmwareRoot, "src/rendering/primitives.cpp"), "utf8");
  // Source portant l'unique formule de mapping physique.
  const mapping = fs.readFileSync(path.join(firmwareRoot, "src/rendering/voxel_mapping.h"), "utf8");
  // Source de Spectrum, qui ecrit directement certaines couleurs physiques.
  const spectrum = fs.readFileSync(path.join(firmwareRoot, "src/animations/spectrum.cpp"), "utf8");
  assert.match(primitives, /tryVoxelIndex\(x, y, z, &index\)/);
  assert.doesNotMatch(primitives, /\(z\s*\*\s*64\)\s*\+\s*\(x\s*\*\s*8\)\s*\+\s*y/);
  assert.match(mapping, /voxelIndexUnchecked/);
  assert.match(mapping, /CUBE_VOXEL_COUNT\s*==\s*PIXEL_CNT/);
  assert.match(spectrum, /tryVoxelIndex\(i, y, SIDE - 1, &mappedIndex\)/);
  assert.match(spectrum, /voxelIndexUnchecked\(x, y, z \+ 1\)/);
});

// ----------------------------------------------------------------------------
// Verifie la taille explicite des structures critiques de rendu.
// ----------------------------------------------------------------------------
test("les types critiques possedent des assertions de taille", () => {
  // Declarations des scalaires compacts et du fixed-point.
  const numericTypes = fs.readFileSync(path.join(firmwareRoot, "src/core/numeric_types.h"), "utf8");
  // Declarations des couleurs et points partages.
  const sharedTypes = fs.readFileSync(path.join(firmwareRoot, "src/core/shared_types.h"), "utf8");
  // Etat historique contenant le voxel compact de Snake.
  const legacyState = fs.readFileSync(path.join(firmwareRoot, "src/core/legacy_state.h"), "utf8");
  assert.match(numericTypes, /sizeof\(FixedQ8_8\)\s*==\s*2/);
  assert.match(sharedTypes, /sizeof\(Color\)\s*==\s*3/);
  assert.match(sharedTypes, /sizeof\(PackedPoint\)\s*==\s*3/);
  assert.match(legacyState, /sizeof\(voxel\)\s*==\s*3/);
});

// ----------------------------------------------------------------------------
// Verifie le contrat RGB logique et le stockage GRB propre au WS2812B.
// ----------------------------------------------------------------------------
test("le pilote restitue RGB apres son stockage physique GRB", () => {
  // Implementation du stockage et de la restitution des octets NeoPixel.
  const driver = fs.readFileSync(path.join(firmwareRoot, "src/platform/neopixel.cpp"), "utf8");
  assert.match(driver, /case WS2812B:[\s\S]*?\*p\+\+ = g;[\s\S]*?\*p\+\+ = r;[\s\S]*?\*p = b;/);
  assert.match(driver, /c = \(\(uint32_t\)p\[1\] << 16\) \| \(\(uint32_t\)p\[0\] <<\s+8\) \| \(uint32_t\)p\[2\]/);
});

// ----------------------------------------------------------------------------
// Compare toutes les valeurs visibles de la courbe WarmFade avant et apres.
// ----------------------------------------------------------------------------
test("le carre WarmFade reste identique pour les 256 intensites", () => {
  for (let value = 0; value <= 255; value += 1) {
    assert.equal(compactFadeSquare(value), legacyFadeSquare(value), value);
  }
});

// ----------------------------------------------------------------------------
// Verifie que la distance au carre conserve tout classement de Snake.
// ----------------------------------------------------------------------------
test("la distance entiere conserve le classement des directions Snake", () => {
  for (let x = -1; x <= 8; x += 1) {
    for (let y = -1; y <= 8; y += 1) {
      for (let z = -1; z <= 8; z += 1) {
        // Position candidate de la tete du serpent.
        const source = [x, y, z];
        // Cible deterministe couvrant des ecarts differents sur les trois axes.
        const target = [7 - (x & 7), 7 - (y & 7), 7 - (z & 7)];
        assert.equal(Math.sqrt(compactDistanceSquared(source, target)), legacyDistance(source, target));
      }
    }
  }
});

// ----------------------------------------------------------------------------
// Compare les magnitudes Spectrum sur la plage utile du convertisseur audio.
// ----------------------------------------------------------------------------
test("la magnitude Spectrum reste equivalente sans pow", () => {
  for (let realValue = -4096; realValue <= 4096; realValue += 257) {
    for (let imaginaryValue = -4096; imaginaryValue <= 4096; imaginaryValue += 263) {
      // Ecart absolu entre la formule de reference et la formule compacte.
      const difference = Math.abs(
        compactSpectrumMagnitude(realValue, imaginaryValue) -
        legacySpectrumMagnitude(realValue, imaginaryValue),
      );
      assert.ok(difference <= 0.001, `${realValue},${imaginaryValue}: ${difference}`);
    }
  }
});

// ----------------------------------------------------------------------------
// Compare les seuils representatifs du tirage Crumble en double et en entier.
// ----------------------------------------------------------------------------
test("le tirage Crumble reste identique sur ses seuils representatifs", () => {
  for (let remainingCount = 1; remainingCount <= 64; remainingCount += 1) {
    // Sorties de rand couvrant les bornes et les principaux quantiles.
    const samples = [0, 1, RAND_MAX >>> 2, RAND_MAX >>> 1, RAND_MAX - 1, RAND_MAX];
    // Sortie de rand courante comparee entre les deux formules.
    for (const randomValue of samples) {
      assert.equal(
        compactCrumbleIndex(randomValue, remainingCount),
        legacyCrumbleIndex(randomValue, remainingCount),
      );
    }
  }
});
