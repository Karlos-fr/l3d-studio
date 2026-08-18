// ============================================================================
// DigiCubePainterStatic - Tests hôte du scratch et du parsing fixe
// ----------------------------------------------------------------------------
// Ce fichier vérifie que Digi réutilise le scratch et que CubePainter ne crée
// plus de sous-chaînes dynamiques. Il ne réalise aucune écriture EEPROM.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Nombre de voxels du cube logique.
const PIXEL_COUNT = 512;

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
// Reproduit la lecture bornée d'une tranche d'index CubePainter.
//
// Parametres :
// - command : commande complète.
// - beginIndex : premier caractère inclus.
// - endIndex : premier caractère exclu.
//
// Retour :
// - index valide ou null lorsque la tranche est invalide.
// ----------------------------------------------------------------------------
function parseVoxelSlice(command, beginIndex, endIndex) {
  const slice = command.slice(beginIndex, endIndex);
  if (!/^\d+$/u.test(slice)) {
    return null;
  }
  const value = Number(slice);
  return value >= 0 && value < PIXEL_COUNT ? value : null;
}

// ----------------------------------------------------------------------------
// Vérifie les bornes et formats d'une tranche CubePainter.
// ----------------------------------------------------------------------------
test("CubePainter conserve les bornes de ses index sans substring C++", () => {
  assert.equal(parseVoxelSlice("I0,", 1, 2), 0);
  assert.equal(parseVoxelSlice("I511,", 1, 4), 511);
  assert.equal(parseVoxelSlice("I512,", 1, 4), null);
  assert.equal(parseVoxelSlice("I-1,", 1, 3), null);
  assert.equal(parseVoxelSlice("I,", 1, 1), null);

  // Implémentation active de CubePainter.
  const painterSource = readFirmwareSource("src/animations/cube_painter.cpp");
  assert.doesNotMatch(painterSource, /\.substring\(/u);
  assert.doesNotMatch(painterSource, /\.toInt\(/u);
  assert.match(
    painterSource,
    /int cubePainterFromBuffer\(const char\* commandText, size_t commandLength\)/u,
  );
  assert.match(
    painterSource,
    /return recordCommandResult\(\s*cubePainterFromBuffer\(command\.c_str\(\), command\.length\(\)\)\);/u,
  );
});

// ----------------------------------------------------------------------------
// Vérifie que CubePainter garde une validation complète avant les écritures.
// ----------------------------------------------------------------------------
test("CubePainter conserve ses deux passes validation puis écriture", () => {
  // Implémentation active de CubePainter.
  const painterSource = readFirmwareSource("src/animations/cube_painter.cpp");
  const loopMatches = painterSource.match(/while \(endIndex != -1\)/gu) ?? [];
  assert.equal(loopMatches.length, 2);
  assert.ok(
    painterSource.indexOf("La commande complète est contrôlée") <
      painterSource.indexOf("run = TRUE"),
  );
});

// ----------------------------------------------------------------------------
// Vérifie le scratch et les 512 affichages de chaque passe Digi.
// ----------------------------------------------------------------------------
test("Digi conserve son ordre fixe et ses affichages historiques", () => {
  // Implémentation active de Digi.
  const digiSource = readFirmwareSource("src/animations/digi.cpp");
  assert.match(
    digiSource,
    /uint16_t\* pixelFillOrder = sharedAnimationScratch\.pixelOrder/u,
  );
  assert.match(digiSource, /random\(0, index \+ 1\)/u);
  assert.equal(
    (digiSource.match(/randomPixelFill\(/gu) ?? []).length,
    3,
  );
  assert.doesNotMatch(digiSource, /\bpulseRate\b/u);
});
