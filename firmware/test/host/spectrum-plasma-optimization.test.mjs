// ============================================================================
// SpectrumPlasmaOptimization - Tests hote des boucles audio et Plasma
// ----------------------------------------------------------------------------
// Ce fichier vérifie le scratch FFT et compare les canaux Plasma avec une
// simulation float32. Il ne remplace pas la validation matérielle du rythme.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Longueur d'un axe du cube logique.
const SIDE = 8;

// Nombre d'échantillons historiques de la FFT Spectrum.
const SPECTRUM_SAMPLE_COUNT = 16;

// Étirement de couleur initialisé par le mode Plasma.
const PLASMA_COLOR_STRETCH = Math.fround(0.23);

// Nombre de phases représentatives comparées sur les 512 voxels.
const PLASMA_PHASE_COUNT = 128;

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspecte par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Convertit une valeur en float32 après chaque opération critique.
//
// Parametres :
// - value : valeur JavaScript à arrondir.
//
// Retour :
// - représentation float32 correspondante.
// ----------------------------------------------------------------------------
function float32(value) {
  return Math.fround(value);
}

// ----------------------------------------------------------------------------
// Reproduit la conversion courante d'un float positif vers uint8_t.
//
// Parametres :
// - value : canal Plasma avant conversion.
//
// Retour :
// - valeur tronquée et repliée sur huit bits.
// ----------------------------------------------------------------------------
function toUint8(value) {
  return ((Math.trunc(value) % 256) + 256) % 256;
}

// ----------------------------------------------------------------------------
// Calcule une distance au carré avec l'ordre float32 du firmware.
//
// Parametres :
// - x : coordonnée X du voxel.
// - y : coordonnée Y du voxel.
// - z : coordonnée Z du voxel.
// - point : centre Plasma à trois coordonnées.
//
// Retour :
// - distance au carré arrondie en float32.
// ----------------------------------------------------------------------------
function squaredDistance(x, y, z, point) {
  // Écart X arrondi comme une soustraction de floats.
  const deltaX = float32(x - point[0]);
  // Écart Y arrondi comme une soustraction de floats.
  const deltaY = float32(y - point[1]);
  // Écart Z arrondi comme une soustraction de floats.
  const deltaZ = float32(z - point[2]);
  return float32(
    float32(float32(deltaX * deltaX) + float32(deltaY * deltaY)) +
    float32(deltaZ * deltaZ),
  );
}

// ----------------------------------------------------------------------------
// Produit les trois centres Lissajous historiques pour une phase.
//
// Parametres :
// - phase : phase float32 de la frame.
//
// Retour :
// - trois triplets arrondis comme des Point du firmware.
// ----------------------------------------------------------------------------
function plasmaPoints(phase) {
  // Fréquences historiques des trois centres et de leurs trois axes.
  const frequencies = [
    [1.000, 1.310, 1.380],
    [1.770, 2.865, 1.410],
    [0.250, 0.750, 0.380],
  ];
  return frequencies.map(
    // ------------------------------------------------------------------------
    // Convertit les trois fréquences d'un centre en coordonnées.
    //
    // Parametres :
    // - pointFrequencies : fréquences X, Y et Z du centre.
    //
    // Retour :
    // - coordonnées float32 dans le domaine zéro à huit.
    // ------------------------------------------------------------------------
    (pointFrequencies) => pointFrequencies.map(
      // ----------------------------------------------------------------------
      // Calcule une coordonnée Lissajous.
      //
      // Parametres :
      // - frequency : multiplicateur de phase de l'axe.
      //
      // Retour :
      // - coordonnée float32 du centre.
      // ----------------------------------------------------------------------
      (frequency) => float32((Math.sin(phase * frequency) + 1) * 4),
    ),
  );
}

// ----------------------------------------------------------------------------
// Calcule les canaux de l'algorithme Plasma historique.
//
// Parametres :
// - squaredDistances : trois distances au carré.
//
// Retour :
// - trois canaux uint8_t à luminosité maximale.
// ----------------------------------------------------------------------------
function legacyPlasmaChannels(squaredDistances) {
  // Distances historiques obtenues avec trois racines.
  const distances = squaredDistances.map((value) => float32(Math.sqrt(value)));
  // Produit historique des deux premières distances.
  const distanceProduct = float32(distances[0] * distances[1]);
  // Modulation sinusoïdale historique.
  const modulation = float32(
    Math.sin(float32(distanceProduct * PLASMA_COLOR_STRETCH)) + 1,
  );
  return distances.map((distance) => toUint8(
    float32(distance * float32(distance * modulation)),
  ));
}

// ----------------------------------------------------------------------------
// Calcule les canaux de l'algorithme Plasma à une seule racine.
//
// Parametres :
// - squaredDistances : trois distances au carré.
//
// Retour :
// - trois canaux uint8_t à luminosité maximale.
// ----------------------------------------------------------------------------
function optimizedPlasmaChannels(squaredDistances) {
  // Produit des distances obtenu avec une seule racine.
  const distanceProduct = float32(Math.sqrt(
    float32(squaredDistances[0] * squaredDistances[1]),
  ));
  // Modulation sinusoïdale optimisée.
  const modulation = float32(
    Math.sin(float32(distanceProduct * PLASMA_COLOR_STRETCH)) + 1,
  );
  return squaredDistances.map((distanceSquared) =>
    toUint8(float32(distanceSquared * modulation))
  );
}

// ----------------------------------------------------------------------------
// Verifie que les deux tableaux FFT réutilisent exactement 128 octets.
// ----------------------------------------------------------------------------
test("Spectrum place ses deux tableaux FFT dans le scratch partage", () => {
  // Etat global contenant l'union de scratch.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  assert.match(legacyState, /float spectrumSamples\[2\]\[ARRAY_SIZE\];/u);
  assert.match(legacyState, /sizeof\(\(\(SharedAnimationScratch\*\)0\)->spectrumSamples\) == 128/u);
  assert.doesNotMatch(legacyState, /^float (?:real|imaginary)\[ARRAY_SIZE\];/mu);
  assert.equal(2 * SPECTRUM_SAMPLE_COUNT * 4, 128);
});

// ----------------------------------------------------------------------------
// Compare les canaux Plasma sur 65 536 combinaisons phase/voxel.
// ----------------------------------------------------------------------------
test("Plasma reste a un niveau de canal de la reference float32", () => {
  let maximumDifference = 0;
  let differingChannels = 0;
  for (let phaseIndex = 0; phaseIndex < PLASMA_PHASE_COUNT; phaseIndex += 1) {
    // Phase représentative, volontairement non alignée sur une période simple.
    const phase = float32(phaseIndex * 0.137);
    // Trois centres calculés pour la phase courante.
    const points = plasmaPoints(phase);
    for (let x = 0; x < SIDE; x += 1) {
      for (let y = 0; y < SIDE; y += 1) {
        for (let z = 0; z < SIDE; z += 1) {
          // Trois distances au carré du voxel courant.
          const squaredDistances = points.map((point) =>
            squaredDistance(x, y, z, point)
          );
          // Canaux de la formule historique.
          const legacyChannels = legacyPlasmaChannels(squaredDistances);
          // Canaux de la formule à une racine.
          const optimizedChannels = optimizedPlasmaChannels(squaredDistances);
          for (let channel = 0; channel < 3; channel += 1) {
            // Écart absolu du canal courant.
            const difference = Math.abs(
              legacyChannels[channel] - optimizedChannels[channel],
            );
            maximumDifference = Math.max(maximumDifference, difference);
            if (difference !== 0) {
              differingChannels += 1;
            }
          }
        }
      }
    }
  }
  assert.ok(maximumDifference <= 1);
  assert.ok(differingChannels <= 2);
});

// ----------------------------------------------------------------------------
// Verifie que l'implémentation active n'exécute qu'une racine par voxel.
// ----------------------------------------------------------------------------
test("Plasma n'appelle sqrt qu'une fois dans sa boucle de voxel", () => {
  // Implementation active de Plasma.
  const plasmaSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/plasma.cpp"),
    "utf8",
  );
  // Appels sqrt présents dans tout le module Plasma.
  const squareRootCalls = plasmaSource.match(/\bsqrt\(/gu) ?? [];
  assert.equal(squareRootCalls.length, 1);
  assert.doesNotMatch(plasmaSource, /Point dist[123]/u);
});
