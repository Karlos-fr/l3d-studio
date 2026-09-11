// ============================================================================
// KittScanner - Tests hote du scanner rouge K2000
// ----------------------------------------------------------------------------
// Ce fichier verrouille le registre, le balayage et les contraintes de cout.
// Il ne remplace pas la validation visuelle sur le cube physique.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Repertoire absolu contenant les tests hote.
const HOST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspectee par les tests.
const FIRMWARE_ROOT = path.resolve(HOST_DIRECTORY, "../..");

// Chemin de l'implementation attendue du scanner.
const KITT_SOURCE_PATH = "src/animations/kitt_scanner.cpp";

// Motifs interdits dans le chemin de rendu compact.
const FORBIDDEN_PATTERNS = [
  /\bnew\b/u,
  /\bmalloc\s*\(/u,
  /\brealloc\s*\(/u,
  /\bString\b/u,
  /\bvector\b/u,
  /\bfloat\b/u,
  /\bdouble\b/u,
  /\bdelay\s*\(/u,
];

// ----------------------------------------------------------------------------
// Charge un fichier du firmware, ou une chaine vide avant son ajout.
//
// Parametres :
// - relativePath : chemin relatif depuis la racine firmware.
//
// Retour :
// - contenu UTF-8 du fichier, ou chaine vide si le fichier manque.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  // Chemin absolu borne a la racine firmware connue.
  const sourcePath = path.join(FIRMWARE_ROOT, relativePath);
  return fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, "utf8") : "";
}

// ----------------------------------------------------------------------------
// Verifie l'ID stable, le catalogue et le libelle de l'option 3D.
// ----------------------------------------------------------------------------
test("K2000 expose le mode 78 et une seule option de profondeur", () => {
  // Identifiants publics du firmware.
  const identifiers = readFirmwareSource("src/config/mode_ids.h");
  // Catalogue et metadonnees servis a L3D Studio.
  const state = readFirmwareSource("src/core/legacy_state.h");
  assert.match(identifiers, /#define KITT_SCANNER\s+78\b/u);
  assert.match(state, /\{\s*KITT_SCANNER,\s*"K2000",\s*0,\s*1,\s*FALSE\s*\}/u);
  assert.match(state, /\{\s*KITT_SCANNER,\s*"Effet 3D"/u);
});

// ----------------------------------------------------------------------------
// Verifie le branchement du mode et sa reinitialisation a chaque entree.
// ----------------------------------------------------------------------------
test("K2000 est inclus, execute et reinitialise par le runtime", () => {
  // Unite principale qui assemble les modules du firmware.
  const mainSource = readFirmwareSource("src/main.cpp");
  // Dispatcher et cycle de vie des animations natives.
  const runtimeSource = readFirmwareSource("src/core/mode_runtime.cpp");
  assert.match(mainSource, /#include "animations\/kitt_scanner\.cpp"/u);
  assert.match(runtimeSource, /case KITT_SCANNER:[\s\S]*?runKittScanner\(\)/u);
  assert.match(runtimeSource, /case KITT_SCANNER:[\s\S]*?resetKittScanner\(\)/u);
});

// ----------------------------------------------------------------------------
// Verifie le balayage fluide, le rouge fixe et la profondeur optionnelle.
// ----------------------------------------------------------------------------
test("K2000 balaie quinze demi-positions rouges avec une trainee 3D", () => {
  // Implementation reelle du rendu K2000.
  const source = readFirmwareSource(KITT_SOURCE_PATH);
  assert.match(source, /KITT_LAST_PHASE\s*=\s*14/u);
  assert.match(source, /kittPhase\s*\+=\s*kittDirection/u);
  assert.match(source, /Color\(red,\s*0,\s*0\)/u);
  assert.match(source, /switch1\s*\?\s*KITT_DEPTH\s*:\s*1/u);
  assert.match(source, /columnRed\s*>>\s*z/u);
});

// ----------------------------------------------------------------------------
// Verifie que la tete du scanner est dessinee sur la face physique avant.
// ----------------------------------------------------------------------------
test("K2000 part de la face z 7 et prolonge la trainee vers le fond", () => {
  // Implementation reelle du rendu K2000.
  const source = readFirmwareSource(KITT_SOURCE_PATH);
  assert.match(source, /const uint8_t cubeZ\s*=\s*SIDE\s*-\s*1\s*-\s*z/u);
  assert.match(
    source,
    /setPixelColor\(x,\s*y,\s*cubeZ,\s*Color\(red,\s*0,\s*0\)\)/u,
  );
});

// ----------------------------------------------------------------------------
// Interdit les operations dynamiques, flottantes ou bloquantes.
// ----------------------------------------------------------------------------
test("K2000 reste entier, statique et non bloquant", () => {
  // Implementation dont le cout doit rester previsible sur Photon.
  const source = readFirmwareSource(KITT_SOURCE_PATH);
  for (const pattern of FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(source, pattern, `motif interdit dans K2000 : ${pattern}`);
  }
  assert.match(source, /kittNextFrameAt\s*=\s*now\s*\+\s*20\s*\+\s*speed/u);
});
