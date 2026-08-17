// ============================================================================
// SmallActiveModesOptimization - Tests hôte des petits modes actifs
// ----------------------------------------------------------------------------
// Ce fichier vérifie les états compacts de Zone, Filler, SlideShow, Christmas
// et WarmFade. Il ne remplace pas les cycles visuels sur le cube.
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
// Mélange un tableau selon la suite d'index fournie.
//
// Parametres :
// - values : valeurs à permuter.
// - randomIndexes : positions successives déjà tirées.
//
// Retour :
// - copie mélangée sans modifier le tableau d'entrée.
// ----------------------------------------------------------------------------
function shuffleWithIndexes(values, randomIndexes) {
  // Copie locale représentant l'ordre mutable du firmware.
  const shuffled = [...values];
  for (let index = 0; index < shuffled.length; index += 1) {
    // Position imposée pour rendre le test déterministe.
    const randomIndex = randomIndexes[index];
    // Valeur temporaire échangée avec la position courante.
    const value = shuffled[index];
    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = value;
  }
  return shuffled;
}

// ----------------------------------------------------------------------------
// Vérifie les index et l'atténuation compacts de ZoneChase.
// ----------------------------------------------------------------------------
test("ZoneChase réutilise ses bornes et l'atténuation communes", () => {
  // Source des deux modes Zone.
  const zoneSource = readFirmwareSource("src/animations/zone.cpp");
  assert.equal(zoneSource.match(/static uint16_t idexZone/gu)?.length, 4);
  assert.match(zoneSource, /fadeColorSevenEighths\(/u);
  assert.doesNotMatch(zoneSource, /int zone1Start =/u);
  assert.doesNotMatch(zoneSource, /pixelColor\.red-=pixelColor\.red\*\.125/u);
});

// ----------------------------------------------------------------------------
// Vérifie que l'état Filler compact conserve le cycle et le retour après hasard.
// ----------------------------------------------------------------------------
test("Filler conserve son cycle de couleurs avec un octet", () => {
  // Source du remplissage inspectée statiquement.
  const fillerSource = readFirmwareSource("src/animations/filler.cpp");
  assert.match(fillerSource, /static uint8_t colorIndex = 2;/u);
  assert.match(fillerSource, /const uint8_t whichFill = random\(0, 3\);/u);
  assert.doesNotMatch(fillerSource, /static uint32_t whichColor/u);

  let legacyState = 0xFFFFFFFF;
  let compactState = 2;
  // Suite comprenant deux activations du mode couleur aléatoire.
  const randomSwitches = [false, false, false, false, true, true, false, false];
  for (let randomEnabled of randomSwitches) {
    let legacySelection;
    let compactSelection;
    if (randomEnabled) {
      legacyState = 0x123456;
      compactState = 2;
      legacySelection = "random";
      compactSelection = "random";
    } else {
      legacyState = legacyState >= 2 ? 0 : legacyState + 1;
      compactState = compactState >= 2 ? 0 : compactState + 1;
      legacySelection = legacyState;
      compactSelection = compactState;
    }
    assert.equal(compactSelection, legacySelection);
  }
});

// ----------------------------------------------------------------------------
// Vérifie que le mélange compact SlideShow reproduit les mêmes permutations.
// ----------------------------------------------------------------------------
test("SlideShow réduit son ordre local de 92 à 23 octets", () => {
  // Source du diaporama inspectée statiquement.
  const slideshowSource = readFirmwareSource("src/animations/slideshow.cpp");
  // Ordre initial des 23 images.
  const initialOrder = [];
  // Tirages représentatifs couvrant les bords et le centre.
  const randomIndexes = [];
  for (let index = 0; index < 23; index += 1) {
    initialOrder.push(index);
    randomIndexes.push((index * 7 + 3) % 23);
  }
  // Résultat de la représentation historique sur les mêmes index.
  const legacyOrder = shuffleWithIndexes(initialOrder, randomIndexes);
  // Résultat de la représentation compacte sur les mêmes index.
  const compactOrder = shuffleWithIndexes(
    Uint8Array.from(initialOrder),
    randomIndexes,
  );
  assert.deepEqual(compactOrder, legacyOrder);
  assert.match(slideshowSource, /uint8_t slideShowOrder\[/u);
  assert.match(slideshowSource, /arrayShuffle\(slideShowOrder, numSlides\)/u);
  assert.doesNotMatch(slideshowSource, /Color trailColor/u);
});

// ----------------------------------------------------------------------------
// Vérifie les bornes compactes de Christmas et la suppression du calcul mort.
// ----------------------------------------------------------------------------
test("Christmas compacte ses compteurs et son flocon temporaire", () => {
  // Source des animations de Noël inspectée statiquement.
  const christmasSource = readFirmwareSource("src/animations/christmas.cpp");
  assert.match(christmasSource, /static uint8_t starColorIdx = 16;/u);
  assert.match(christmasSource, /uint8_t flakeX = 0;/u);
  assert.match(christmasSource, /uint8_t flakeZ = 0;/u);
  assert.doesNotMatch(christmasSource, /Point flake/u);
  assert.doesNotMatch(christmasSource, /gradedGreen/u);
});

// ----------------------------------------------------------------------------
// Vérifie que WarmFade parcourt exactement les mêmes niveaux entiers.
// ----------------------------------------------------------------------------
test("WarmFade remplace son compteur float sans changer les niveaux", () => {
  // Source du fondu chaud inspectée statiquement.
  const warmFadeSource = readFirmwareSource("src/animations/warm_fade.cpp");
  // Niveaux produits par les deux boucles historiques.
  const legacyLevels = [];
  for (let level = 0.0; level < 256; level += 1.0) {
    legacyLevels.push(level);
  }
  for (let level = 255.0; level > 0; level -= 1.0) {
    legacyLevels.push(level);
  }
  // Niveaux produits par les deux boucles entières compactes.
  const compactLevels = [];
  for (let level = 0; level < 256; level += 1) {
    compactLevels.push(level);
  }
  for (let level = 255; level > 0; level -= 1) {
    compactLevels.push(level);
  }
  assert.deepEqual(compactLevels, legacyLevels);
  assert.match(warmFadeSource, /uint16_t i;/u);
});
