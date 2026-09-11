// ============================================================================
// ShuffleOrchestrationCompact - Tests hôte de l'ordre des modes
// ----------------------------------------------------------------------------
// Ce fichier vérifie la capacité compacte du shuffle et l'équivalence de ses
// permutations. Il ne lance pas la démonstration matérielle multi-modes.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspectée par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Charge un fichier source du firmware.
//
// Parametres :
// - relativePath : chemin relatif depuis la racine firmware.
//
// Retour :
// - contenu UTF-8 du fichier demandé.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  return fs.readFileSync(path.join(firmwareRoot, relativePath), "utf8");
}

// ----------------------------------------------------------------------------
// Applique la permutation historique à une représentation donnée.
//
// Parametres :
// - values : tableau initial d'index.
// - randomIndexes : positions successives déjà tirées.
//
// Retour :
// - tableau permuté sur place puis retourné.
// ----------------------------------------------------------------------------
function applyShuffle(values, randomIndexes) {
  for (let index = 0; index < values.length; index += 1) {
    // Position déterministe remplaçant le tirage Particle du test.
    const randomIndex = randomIndexes[index];
    // Valeur temporaire échangée avec l'entrée courante.
    const value = values[index];
    values[index] = values[randomIndex];
    values[randomIndex] = value;
  }
  return values;
}

// ----------------------------------------------------------------------------
// Vérifie que les 67 index actifs occupent un octet chacun.
// ----------------------------------------------------------------------------
test("Shuffle conserve un octet par entrée après les imports CubeTube", () => {
  // État global portant l'ordre mélangé.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  // Initialisation de l'ordre au démarrage.
  const mainSource = readFirmwareSource("src/main.cpp");
  assert.match(legacyState, /const uint8_t ACTIVE_MODE_COUNT = 69;/u);
  assert.match(legacyState, /modeStruct\[0\] == ACTIVE_MODE_COUNT/u);
  assert.match(legacyState, /uint8_t shuffleIdx;/u);
  assert.match(legacyState, /uint8_t modeShuffleOrder\[/u);
  assert.match(legacyState, /static_assert\(sizeof modeShuffleOrder < 256/u);
  assert.match(mainSource, /for\(uint8_t i=0;/u);
});

// ----------------------------------------------------------------------------
// Compare les permutations int et uint8 pour tous les index du registre.
// ----------------------------------------------------------------------------
test("Shuffle conserve chaque échange et chaque tirage", () => {
  // Valeurs initiales de la représentation historique.
  const legacyValues = [];
  // Valeurs initiales de la représentation compacte.
  const compactValues = new Uint8Array(67);
  // Suite déterministe couvrant les deux extrémités du registre.
  const randomIndexes = [];
  for (let index = 0; index < 67; index += 1) {
    legacyValues.push(index);
    compactValues[index] = index;
    randomIndexes.push((index * 31 + 66) % 67);
  }
  // Permutation obtenue avec les anciens entiers.
  const legacyResult = applyShuffle(legacyValues, randomIndexes);
  // Permutation obtenue avec les nouveaux octets.
  const compactResult = applyShuffle(compactValues, randomIndexes);
  assert.deepEqual(Array.from(compactResult), legacyResult);

  // Primitive commune portant désormais le mélange compact.
  const primitivesSource = readFirmwareSource("src/rendering/primitives.cpp");
  // Dispatcher consommant l'ordre global compact.
  const runtimeSource = readFirmwareSource("src/core/mode_runtime.cpp");
  assert.match(
    primitivesSource,
    /void arrayShuffle\(uint8_t arrayToShuffle\[\], uint8_t arraySize\)/u,
  );
  assert.match(runtimeSource, /arrayShuffle\(\s*modeShuffleOrder,/u);
});
