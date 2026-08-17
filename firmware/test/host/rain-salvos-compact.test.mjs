// ============================================================================
// RainSalvosCompact - Tests hote de la representation compacte des pluies
// ----------------------------------------------------------------------------
// Ce fichier compare les trajectoires et couleurs historiques aux entiers
// compacts. Il ne simule ni les tirages aleatoires ni le rendu NeoPixel.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Longueur d'un axe du cube logique.
const SIDE = 8;

// Nombre maximal historique de gouttes par salve.
const RAIN_MAX_DROPS = 128;

// Nombre de salves historiques conserve par la representation compacte.
const RAIN_SALVO_COUNT = SIDE;

// Facteur entier utilise pour stocker les vingtiemes de voxel.
const RAIN_POSITION_SCALE = 20;

// Position verticale initiale historique d'une goutte.
const RAIN_INITIAL_Y = SIDE;

// Vitesses float historiques dans l'ordre du tirage aleatoire.
const LEGACY_SPEEDS = [0.5, 0.15, 0.1, 0.25, 0.2, 0.35, 0.3];

// Vitesses compactes correspondantes en vingtiemes de voxel.
const COMPACT_SPEEDS = [10, 3, 2, 5, 4, 7, 6];

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspecte par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Reproduit la conversion C++ d'un float en coordonnee entiere.
//
// Parametres :
// - value : position float historique a convertir.
//
// Retour :
// - entier tronque vers zero comme static_cast<int>.
// ----------------------------------------------------------------------------
function truncateTowardZero(value) {
  return value < 0 ? Math.ceil(value) : Math.floor(value);
}

// ----------------------------------------------------------------------------
// Reproduit la conversion compacte avec les deux frontieres float historiques.
//
// Parametres :
// - yTwentieths : position verticale en vingtiemes de voxel.
// - speedTwentieths : vitesse compacte de la goutte.
//
// Retour :
// - coordonnee logique equivalente au calcul float du Photon.
// ----------------------------------------------------------------------------
function compactLogicalY(yTwentieths, speedTwentieths) {
  // Coordonnee exacte avant reproduction des erreurs d'arrondi historiques.
  const exactY = truncateTowardZero(yTwentieths / RAIN_POSITION_SCALE);
  if (
    (speedTwentieths === 3 || speedTwentieths === 6) &&
    (yTwentieths === 100 || yTwentieths === 40)
  ) {
    return exactY - 1;
  }
  return exactY;
}

// ----------------------------------------------------------------------------
// Simule les coordonnees visibles d'une goutte avec l'arithmetique float32.
//
// Parametres :
// - speed : vitesse float historique.
//
// Retour :
// - suite des coordonnees dessinees jusqu'a la sortie sous le cube.
// ----------------------------------------------------------------------------
function legacyTrajectory(speed) {
  let y = Math.fround(RAIN_INITIAL_Y);
  // Vitesse arrondie une fois comme une constante stockee dans un float C++.
  const floatSpeed = Math.fround(speed);
  // Coordonnees produites apres chaque mise a jour historique.
  const trajectory = [];
  while (true) {
    y = Math.fround(y - floatSpeed);
    if (y < 0) {
      return trajectory;
    }
    trajectory.push(truncateTowardZero(y));
  }
}

// ----------------------------------------------------------------------------
// Simule les coordonnees visibles d'une goutte avec les vingtiemes entiers.
//
// Parametres :
// - speedTwentieths : vitesse compacte de la goutte.
//
// Retour :
// - suite des coordonnees dessinees jusqu'a la sortie sous le cube.
// ----------------------------------------------------------------------------
function compactTrajectory(speedTwentieths) {
  let yTwentieths = RAIN_INITIAL_Y * RAIN_POSITION_SCALE;
  // Coordonnees produites apres chaque mise a jour compacte.
  const trajectory = [];
  while (true) {
    yTwentieths -= speedTwentieths;
    if (yTwentieths < 0) {
      return trajectory;
    }
    trajectory.push(compactLogicalY(yTwentieths, speedTwentieths));
  }
}

// ----------------------------------------------------------------------------
// Reproduit un compound assignment C++ entre uint8_t et float.
//
// Parametres :
// - channel : valeur initiale du canal sur huit bits.
// - increment : increment float applique par le firmware historique.
//
// Retour :
// - canal tronque puis replie sur huit bits.
// ----------------------------------------------------------------------------
function legacyUint8Add(channel, increment) {
  return truncateTowardZero(channel + increment) & 0xff;
}

// ----------------------------------------------------------------------------
// Verifie la taille et la capacite declarees par l'etat compact.
// ----------------------------------------------------------------------------
test("les salves compactes conservent la capacite historique", () => {
  // Etat global contenant les structures de pluie compactes.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  assert.match(legacyState, /const uint8_t RAIN_MAX_DROPS = 128;/);
  assert.match(legacyState, /CompactRainDrop drops\[RAIN_MAX_DROPS\];/);
  assert.match(legacyState, /CompactRainSalvo salvos\[SIDE\];/);
  assert.match(legacyState, /sizeof\(CompactRainDrop\) == 8/);
  assert.match(legacyState, /sizeof\(CompactRainSalvo\) == 1026/);
  assert.equal(RAIN_MAX_DROPS * RAIN_SALVO_COUNT, 1024);
});

// ----------------------------------------------------------------------------
// Verifie l'absence d'etat dynamique et de position float dans les pluies.
// ----------------------------------------------------------------------------
test("les pluies n'utilisent ni allocation dynamique ni position float", () => {
  // Implementation active des deux modes de pluie.
  const rainSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/rain_salvos.cpp"),
    "utf8",
  );
  // Interface publique des deux modes de pluie.
  const rainHeader = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/rain_salvos.h"),
    "utf8",
  );
  // Etat global qui porte les positions et vitesses compactes.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  assert.doesNotMatch(rainSource, /\b(?:vector|String|new|malloc)\b/);
  assert.doesNotMatch(rainHeader, /\b(?:vector|String|new|malloc)\b/);
  assert.doesNotMatch(legacyState, /float\s+(?:speed|yTwentieths)\b/);
  assert.match(legacyState, /int16_t yTwentieths;/);
  assert.match(legacyState, /uint8_t speedTwentieths;/);
});

// ----------------------------------------------------------------------------
// Verifie la correspondance exacte des sept vitesses tirees aleatoirement.
// ----------------------------------------------------------------------------
test("les sept vitesses historiques ont un equivalent entier exact", () => {
  assert.deepEqual(
    LEGACY_SPEEDS.map((speed) => Math.round(speed * RAIN_POSITION_SCALE)),
    COMPACT_SPEEDS,
  );
});

// ----------------------------------------------------------------------------
// Compare chaque coordonnee visible des trajectoires float et compactes.
// ----------------------------------------------------------------------------
test("les trajectoires compactes reproduisent les coordonnees float32", () => {
  for (let index = 0; index < LEGACY_SPEEDS.length; index += 1) {
    assert.deepEqual(
      compactTrajectory(COMPACT_SPEEDS[index]),
      legacyTrajectory(LEGACY_SPEEDS[index]),
      `difference de trajectoire pour la vitesse ${LEGACY_SPEEDS[index]}`,
    );
  }
});

// ----------------------------------------------------------------------------
// Compare les increments RGB historiques et leur equivalent entier compact.
// ----------------------------------------------------------------------------
test("les increments GoldRain conservent la troncature uint8 historique", () => {
  // Canaux representatifs incluant le repli de 255 vers zero.
  const channels = [0, 95, 127, 254, 255];
  for (let index = 0; index < LEGACY_SPEEDS.length; index += 1) {
    // Vitesse float historique courante.
    const legacySpeed = LEGACY_SPEEDS[index];
    // Vitesse compacte courante.
    const compactSpeed = COMPACT_SPEEDS[index];
    for (const channel of channels) {
      assert.equal(legacyUint8Add(channel, 1 + legacySpeed), (channel + 1) & 0xff);
      assert.equal(
        legacyUint8Add(channel, 0.5 + legacySpeed),
        (channel + (compactSpeed === 10 ? 1 : 0)) & 0xff,
      );
    }
  }
});

// ----------------------------------------------------------------------------
// Verifie que l'optimisation ne reactive pas l'entree AcidRain masquee.
// ----------------------------------------------------------------------------
test("AcidRain reste desactive dans le registre historique", () => {
  // Registre des modes inspecte sans executer le firmware.
  const registrySource = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  // Portion du fichier limitee au registre modeStruct des modes selectionnables.
  const modeRegistrySource = registrySource.slice(
    0,
    registrySource.indexOf("switchParams switchTitleStruct"),
  );
  // Lignes actives du registre, apres exclusion des entrees commentees.
  const activeRegistryLines = modeRegistrySource
    .split(/\r?\n/u)
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  assert.match(modeRegistrySource, /^\/\/\s+\{\s+ACIDRAIN\s*,/mu);
  assert.doesNotMatch(activeRegistryLines, /\{\s+ACIDRAIN\s*,/u);
});
