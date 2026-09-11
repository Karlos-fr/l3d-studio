// ============================================================================
// GyrophareFr - Tests hôte du gyrophare tournant
// ----------------------------------------------------------------------------
// Ce fichier verrouille le registre, les directions entières et les choix de
// sûreté. Il ne remplace pas l'observation du mouvement sur le cube physique.
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

// Chemin de l'implémentation du gyrophare.
const gyrophareSourcePath = "src/animations/gyrophare_fr.cpp";

// Directions attendues autour de l'axe vertical dans l'ordre de rotation.
const expectedDirections = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

// Motifs interdits dans le chemin de rendu compact.
const forbiddenPatterns = [
  /\bnew\b/u,
  /\bmalloc\s*\(/u,
  /\brealloc\s*\(/u,
  /\bString\b/u,
  /\bvector\b/u,
  /\bfloat\b/u,
  /\bdouble\b/u,
  /\b(?:sin|cos|tan)\s*\(/u,
  /\bFFT\s*\(/u,
  /\bdelay\s*\(/u,
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
// Extrait une table d'entiers signés depuis le module C++.
//
// Paramètres :
// - source : contenu du module GyrophareFr.
// - name : nom exact de la table recherchée.
//
// Retour :
// - valeurs numériques de la table.
// ----------------------------------------------------------------------------
function extractIntegerTable(source, name) {
  const expression = new RegExp(`${name}\\[[^\\]]+\\]\\s*=\\s*\\{([^}]+)\\}`, "u");
  const match = source.match(expression);
  assert.ok(match, `${name} doit rester déclarée`);
  return match[1].split(",").map((value) => Number.parseInt(value.trim(), 10));
}

// ----------------------------------------------------------------------------
// Vérifie l'ID, le nom et les trois switches exposés par Particle.
// ----------------------------------------------------------------------------
test("GyrophareFR publie l'ID 75 et ses trois options", () => {
  const identifiers = readFirmwareSource("src/config/mode_ids.h");
  const state = readFirmwareSource("src/core/legacy_state.h");
  assert.match(identifiers, /#define GYROPHARE_FR\s+75\b/u);
  assert.match(
    state,
    /\{\s*GYROPHARE_FR,\s*"GyrophareFR",\s*0,\s*3,\s*FALSE\s*\}/u,
  );
  assert.match(
    state,
    /\{\s*GYROPHARE_FR,\s*"Bicolore",\s*"Reactif au son",\s*"Trainee"/u,
  );
  assert.match(state, /const uint8_t ACTIVE_MODE_COUNT = 69;/u);
  assert.match(state, /modeStruct\[0\] == ACTIVE_MODE_COUNT/u);
});

// ----------------------------------------------------------------------------
// Vérifie le branchement du mode et son plafond de luminosité plein cube.
// ----------------------------------------------------------------------------
test("GyrophareFR est inclus, dispatché, réinitialisé et plafonné", () => {
  const mainSource = readFirmwareSource("src/main.cpp");
  const runtimeSource = readFirmwareSource("src/core/mode_runtime.cpp");
  const parserSource = readFirmwareSource("src/core/command_dispatch.cpp");
  assert.match(mainSource, /#include "animations\/gyrophare_fr\.cpp"/u);
  assert.match(runtimeSource, /case GYROPHARE_FR:[\s\S]*?runGyrophareFr\(\)/u);
  assert.match(runtimeSource, /case GYROPHARE_FR:[\s\S]*?resetGyrophareFr\(\)/u);
  assert.match(parserSource, /case TRANQUILITY:\s*case GYROPHARE_FR:\s*maxBright = 37/u);
});

// ----------------------------------------------------------------------------
// Vérifie le tour entier et l'opposition exacte des deux demi-faisceaux.
// ----------------------------------------------------------------------------
test("Le gyrophare parcourt huit directions entières opposées deux à deux", () => {
  const source = readFirmwareSource(gyrophareSourcePath);
  const directionsX = extractIntegerTable(source, "GYROPHARE_DIRECTION_X");
  const directionsZ = extractIntegerTable(source, "GYROPHARE_DIRECTION_Z");
  const directions = directionsX.map((x, index) => [x, directionsZ[index]]);
  assert.deepEqual(directions, expectedDirections);
  assert.equal(new Set(directions.map((direction) => direction.join(","))).size, 8);
  for (let index = 0; index < 4; index += 1) {
    assert.deepEqual(
      directions[index + 4],
      directions[index].map((coordinate) => coordinate === 0 ? 0 : -coordinate),
    );
  }
});

// ----------------------------------------------------------------------------
// Vérifie le choix bleu par défaut et rouge sur le faisceau opposé.
// ----------------------------------------------------------------------------
test("Le mode reste bleu seul sauf lorsque Bicolore est actif", () => {
  const source = readFirmwareSource(gyrophareSourcePath);
  assert.match(
    source,
    /switch1 && along < 0\s*\? Color\(beamIntensity, 0, 0\)\s*:\s*Color\(0, 0, beamIntensity\)/u,
  );
  assert.match(source, /cross != 0\s*\? intensity \/ 2/u);
});

// ----------------------------------------------------------------------------
// Vérifie que l'option sonore utilise une enveloppe légère sans FFT.
// ----------------------------------------------------------------------------
test("La réaction sonore mesure une amplitude seulement quand elle est active", () => {
  const source = readFirmwareSource(gyrophareSourcePath);
  assert.match(source, /if \(!switch2\) \{\s*return 255;/u);
  assert.match(source, /analogRead\(MICROPHONE\) - SAMPLES/u);
  assert.match(source, /gyrophareAudioEnvelope \* GYROPHARE_ENVELOPE_DECAY_NUMERATOR/u);
  assert.doesNotMatch(source, /spectrumReal|spectrumImaginary/u);
});

// ----------------------------------------------------------------------------
// Interdit les opérations coûteuses ou dynamiques dans le nouveau rendu.
// ----------------------------------------------------------------------------
test("GyrophareFR reste entier, statique et non bloquant", () => {
  const source = readFirmwareSource(gyrophareSourcePath);
  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern, `motif interdit dans GyrophareFR : ${pattern}`);
  }
  assert.match(source, /gyrophareNextFrameAt = now \+ 20 \+ speed/u);
});
