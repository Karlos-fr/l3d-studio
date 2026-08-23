// ============================================================================
// CubeTubeImports - Tests hôte des quatre animations importées
// ----------------------------------------------------------------------------
// Ce fichier verrouille leurs IDs, leur branchement et les choix de mémoire.
// Il ne remplace pas la validation visuelle sur le cube physique.
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

// Noms Cloud ajoutés au registre dans l'ordre alphabétique attendu.
const importedModeNames = [
  "FFTJoy",
  "FFTMeteors",
  "LightningBox",
  "Tranquility",
];

// Fichiers d'implémentation propres aux quatre imports et à leur FFT commune.
const importedImplementationPaths = [
  "src/animations/cubetube_fft_common.cpp",
  "src/animations/fft_joy_legacy.cpp",
  "src/animations/fft_meteors_rainbow.cpp",
  "src/animations/lightning_in_a_box.cpp",
  "src/animations/tranquility.cpp",
];

// Motifs d'allocation ou de conteneur dynamiques interdits dans le rendu.
const forbiddenDynamicPatterns = [
  /\bnew\b/u,
  /\bmalloc\s*\(/u,
  /\brealloc\s*\(/u,
  /\bstd::vector\b/u,
  /\bstd::string\b/u,
  /\bString\b/u,
];

// ----------------------------------------------------------------------------
// Charge un fichier source du firmware.
//
// Paramètres :
// - relativePath : chemin relatif depuis la racine firmware.
//
// Retour :
// - contenu UTF-8 du fichier demandé.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  return fs.readFileSync(path.join(firmwareRoot, relativePath), "utf8");
}

// ----------------------------------------------------------------------------
// Extrait les noms actifs du tableau modeStruct.
//
// Retour :
// - noms Cloud des entrées non commentées, dans l'ordre du registre.
// ----------------------------------------------------------------------------
function extractActiveModeNames() {
  const source = readFirmwareSource("src/core/legacy_state.h");
  const table = source.match(/static const modeParams modeStruct\[\][\s\S]*?\n\};/u);
  assert.ok(table, "modeStruct doit rester déclaré");
  return [...table[0].matchAll(/^\s*\{\s*[A-Z0-9_]+,\s*"([^"]+)"/gmu)]
    .map((match) => match[1]);
}

// ----------------------------------------------------------------------------
// Reproduit la palette entière du firmware pour en vérifier les bornes.
//
// Paramètres :
// - level : position dans le cycle.
// - maximumLevel : borne finale du cycle.
// - maximumChannel : intensité maximale d'un canal.
//
// Retour :
// - triplet RGB borné.
// ----------------------------------------------------------------------------
function cubeTubeColorMap(level, maximumLevel, maximumChannel) {
  if (maximumLevel === 0 || level >= maximumLevel) {
    return [0, 0, maximumChannel];
  }
  const palettePosition = Math.floor(level * 6 * 256 / maximumLevel);
  const segment = Math.floor(palettePosition / 256);
  const position = palettePosition % 256;
  const rising = Math.floor(maximumChannel * position / 255);
  const falling = maximumChannel - rising;
  const segments = [
    [0, rising, maximumChannel],
    [0, maximumChannel, falling],
    [rising, maximumChannel, 0],
    [maximumChannel, falling, 0],
    [maximumChannel, 0, rising],
    [falling, 0, maximumChannel],
  ];
  return segments[segment];
}

// ----------------------------------------------------------------------------
// Vérifie les IDs nouveaux et le contrat Cloud des modes importés.
// ----------------------------------------------------------------------------
test("Les imports CubeTube utilisent quatre nouveaux IDs stables", () => {
  const identifiers = readFirmwareSource("src/config/mode_ids.h");
  assert.match(identifiers, /#define LIGHTNING_BOX\s+71\b/u);
  assert.match(identifiers, /#define FFT_METEORS_RAINBOW\s+72\b/u);
  assert.match(identifiers, /#define FFT_JOY_LEGACY\s+73\b/u);
  assert.match(identifiers, /#define TRANQUILITY\s+74\b/u);

  const names = extractActiveModeNames();
  assert.equal(names.length, 69);
  assert.ok(names.includes("L3DProgram"), "le mode bytecode doit être enregistré");
  for (const modeName of importedModeNames) {
    assert.ok(names.includes(modeName), `${modeName} doit être publié`);
  }
  const particleNames = names.filter((name) => name !== "L3DProgram");
  assert.ok(
    `${particleNames.join(";")};`.length < 621,
    "la liste Cloud doit tenir dans modeNameList",
  );
});

// ----------------------------------------------------------------------------
// Vérifie le branchement complet des animations dans le unity build.
// ----------------------------------------------------------------------------
test("Chaque import est inclus, dispatché et réinitialisé", () => {
  const mainSource = readFirmwareSource("src/main.cpp");
  const runtimeSource = readFirmwareSource("src/core/mode_runtime.cpp");
  const expectations = [
    ["lightning_in_a_box.cpp", "LIGHTNING_BOX", "runLightningInABox", "resetLightningInABox"],
    ["fft_meteors_rainbow.cpp", "FFT_METEORS_RAINBOW", "runFftMeteorsRainbow", "resetFftMeteorsRainbow"],
    ["fft_joy_legacy.cpp", "FFT_JOY_LEGACY", "runFftJoyLegacy", "resetFftJoyLegacy"],
    ["tranquility.cpp", "TRANQUILITY", "runTranquility", "resetTranquility"],
  ];

  for (const [fileName, identifier, runner, resetter] of expectations) {
    assert.ok(mainSource.includes(`#include "animations/${fileName}"`));
    assert.match(runtimeSource, new RegExp(`case ${identifier}:[\\s\\S]*?${runner}\\(\\)`));
    assert.match(runtimeSource, new RegExp(`case ${identifier}:[\\s\\S]*?${resetter}\\(\\)`));
  }
});

// ----------------------------------------------------------------------------
// Interdit l'allocation dynamique et les attentes bloquantes milliseconde.
// ----------------------------------------------------------------------------
test("Les imports n'allouent pas dynamiquement et restent non bloquants", () => {
  for (const relativePath of importedImplementationPaths) {
    const source = readFirmwareSource(relativePath);
    for (const pattern of forbiddenDynamicPatterns) {
      assert.doesNotMatch(source, pattern, `${relativePath} contient ${pattern}`);
    }
    assert.doesNotMatch(source, /\bdelay\s*\(/u);
  }
});

// ----------------------------------------------------------------------------
// Vérifie la mutualisation du scratch FFT existant entre les deux spectres.
// ----------------------------------------------------------------------------
test("Les deux spectres CubeTube partagent les 128 octets du scratch FFT", () => {
  const commonSource = readFirmwareSource("src/animations/cubetube_fft_common.cpp");
  assert.match(commonSource, /spectrumReal\[index\]/u);
  assert.match(commonSource, /spectrumImaginary\[index\]/u);
  assert.match(commonSource, /FFT\(1, M, spectrumReal, spectrumImaginary\)/u);

  for (const relativePath of [
    "src/animations/fft_joy_legacy.cpp",
    "src/animations/fft_meteors_rainbow.cpp",
  ]) {
    const source = readFirmwareSource(relativePath);
    assert.match(source, /captureCubeTubeFft\(/u);
    assert.doesNotMatch(source, /(?:float|double)\s+\w+\s*\[\s*ARRAY_SIZE\s*\]/u);
  }
});

// ----------------------------------------------------------------------------
// Vérifie l'orientation historique des barres FFT et de leur profondeur.
// ----------------------------------------------------------------------------
test("Les spectres montent sur y depuis le plan arrière puis avancent sur z", () => {
  for (const relativePath of [
    "src/animations/fft_joy_legacy.cpp",
    "src/animations/fft_meteors_rainbow.cpp",
  ]) {
    const source = readFirmwareSource(relativePath);
    assert.match(source, /setPixelColor\([\s\S]*?band,[\s\S]*?y,[\s\S]*?SIDE - 1/u);
    assert.match(source, /for \(uint8_t z = 0; z < SIDE - 1; z\+\+\)/u);
    assert.match(source, /getPixelColor\(x, y, z \+ 1\)/u);
  }
});

// ----------------------------------------------------------------------------
// Vérifie les extrémités et les bornes des deux palettes importées.
// ----------------------------------------------------------------------------
test("La palette CubeTube reste bornée à 80 et 75 par canal", () => {
  for (const [maximumLevel, maximumChannel] of [[8, 80], [255, 75]]) {
    assert.deepEqual(cubeTubeColorMap(0, maximumLevel, maximumChannel), [0, 0, maximumChannel]);
    assert.deepEqual(
      cubeTubeColorMap(maximumLevel, maximumLevel, maximumChannel),
      [0, 0, maximumChannel],
    );
    for (let level = 0; level <= maximumLevel; level += 1) {
      for (const channel of cubeTubeColorMap(level, maximumLevel, maximumChannel)) {
        assert.ok(channel >= 0 && channel <= maximumChannel);
      }
    }
  }
});

// ----------------------------------------------------------------------------
// Verrouille la mise en flash du registre et l'absence de mutation métadonnée.
// ----------------------------------------------------------------------------
test("Les tables de métadonnées restent constantes en flash", () => {
  const stateSource = readFirmwareSource("src/core/legacy_state.h");
  const metadataSource = readFirmwareSource("src/cloud/metadata.cpp");
  assert.match(stateSource, /static const modeParams modeStruct\[\]/u);
  assert.match(stateSource, /static const switchParams switchTitleStruct\[\]/u);
  assert.doesNotMatch(
    metadataSource,
    /modeStruct\[i\]\.numOf(?:Colors|Switches)\s*=(?!=)/u,
  );
});
