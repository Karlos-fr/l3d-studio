// ============================================================================
// Phase3Safety - Tests hote des bornes et buffers du firmware
// ----------------------------------------------------------------------------
// Ce fichier verifie le contrat des commandes et les invariants statiques de
// la phase 3. Il ne simule ni Particle Device OS ni le rendu physique du cube.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspecte par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// Fixtures capturees depuis le protocole historique valide.
const fixtures = JSON.parse(
  fs.readFileSync(path.join(firmwareRoot, "test/fixtures/protocol-fixtures.json"), "utf8"),
);

// Ensemble des noms de modes acceptes par la fixture historique.
const modeNames = new Set(fixtures.modeList.split(";").filter(Boolean));

// Code representant une validation reussie.
const OK = 0;

// Code representant une commande obligatoire vide.
const EMPTY = -100;

// Code representant une commande ou un champ trop long.
const TOO_LONG = -101;

// Code representant une structure de commande invalide.
const MALFORMED = -102;

// Code representant une valeur situee hors de ses bornes.
const OUT_OF_RANGE = -103;

// Longueur maximale d'une commande Particle acceptee par le firmware.
const MAX_COMMAND_LENGTH = 621;

// ----------------------------------------------------------------------------
// Reproduit le contrat de validation SetMode pour les tests hote.
//
// Parametres :
// - command : commande a verifier sans modifier d'etat firmware.
//
// Retour :
// - code de succes ou d'erreur correspondant au contrat C++.
// ----------------------------------------------------------------------------
function validateSetMode(command) {
  command = command.trim();
  if (command.length === 0) return EMPTY;
  if (command.length > MAX_COMMAND_LENGTH) return TOO_LONG;
  if (!command.endsWith(",")) return MALFORMED;

  const segments = command.slice(0, -1).split(",");
  if (segments.some((segment) => segment.length === 0)) return MALFORMED;
  for (const segment of segments) {
    if (segment.startsWith("M:")) {
      if (!modeNames.has(segment.slice(2))) return MALFORMED;
    } else if (/^S:\d+$/.test(segment)) {
      const value = Number(segment.slice(2));
      if (value > 8) return OUT_OF_RANGE;
    } else if (/^B:\d+$/.test(segment)) {
      const value = Number(segment.slice(2));
      if (value > 100) return OUT_OF_RANGE;
    } else if (/^C[1-6]:[0-9A-Fa-f]{6}$/.test(segment)) {
      continue;
    } else if (/^T[1-4]:[01]$/.test(segment)) {
      continue;
    } else if (segment.startsWith("W:")) {
      if (segment.slice(2).length >= 64) return TOO_LONG;
    } else {
      return MALFORMED;
    }
  }
  return OK;
}

// ----------------------------------------------------------------------------
// Reproduit le contrat de validation CubePainter pour les tests hote.
//
// Parametres :
// - command : commande de voxel ou de plage a verifier.
//
// Retour :
// - code de succes ou d'erreur correspondant au contrat C++.
// ----------------------------------------------------------------------------
function validateCubePainter(command) {
  command = command.trim().toUpperCase();
  if (command.length === 0) return EMPTY;
  if (command.length > MAX_COMMAND_LENGTH) return TOO_LONG;
  if (!command.endsWith(",")) return MALFORMED;

  let selectedVoxel = -1;
  for (const segment of command.slice(0, -1).split(",")) {
    if (/^I\d+$/.test(segment)) {
      selectedVoxel = Number(segment.slice(1));
      if (selectedVoxel > 511) return OUT_OF_RANGE;
    } else if (segment.startsWith("#")) {
      if (selectedVoxel < 0 || !/^#[0-9A-F]{6}$/.test(segment)) return MALFORMED;
    } else {
      const clear = /^C(\d+):(\d+)$/.exec(segment);
      if (!clear) return MALFORMED;
      const start = Number(clear[1]);
      const finish = Number(clear[2]);
      if (start > finish || finish > 511) return OUT_OF_RANGE;
    }
  }
  return OK;
}

// ----------------------------------------------------------------------------
// Reproduit les controles de structure de la fonction Cloud generique.
//
// Parametres :
// - command : commande FnRouter a verifier.
//
// Retour :
// - code de succes ou d'erreur correspondant au contrat C++.
// ----------------------------------------------------------------------------
function validateFnRouter(command) {
  command = command.trim().toUpperCase();
  if (command.length === 0) return EMPTY;
  if (command.length > MAX_COMMAND_LENGTH) return TOO_LONG;
  if (command === "GETDIAG" || command === "RESETDIAG") return OK;

  const colon = command.indexOf(":");
  if (colon <= 0) return MALFORMED;
  const name = command.slice(0, colon);
  const value = command.slice(colon + 1);
  if (name === "SETTIMEZONE") {
    if (!/^-?\d+$/.test(value) || Number(value) < -14 || Number(value) > 14) return OUT_OF_RANGE;
    return OK;
  }
  if (name === "GETSWITCHSTATE") return /^[1-4]$/.test(value) ? OK : OUT_OF_RANGE;
  if (name === "GETCOLOR") return /^[1-6]$/.test(value) ? OK : OUT_OF_RANGE;
  if (name === "SETAUXSWITCH") return /^(?:\d+,[01];)+$/.test(value) ? OK : MALFORMED;
  if (name === "REBOOT") return OK;
  return MALFORMED;
}

// ----------------------------------------------------------------------------
// Reproduit la borne du buffer persistant de SetText.
//
// Parametres :
// - command : texte a verifier.
//
// Retour :
// - zero jusqu'a 63 caracteres, sinon COMMAND_ERROR_TOO_LONG.
// ----------------------------------------------------------------------------
function validateSetText(command) {
  return command.length < 64 ? OK : TOO_LONG;
}

// ----------------------------------------------------------------------------
// Verifie que les commandes SetMode capturees restent acceptees.
// ----------------------------------------------------------------------------
test("SetMode conserve les commandes historiques", () => {
  for (const key of ["setModeColor", "settingsOnly", "modeWithSwitches", "textMode"]) {
    assert.equal(validateSetMode(fixtures.commands[key]), OK, key);
  }
});

// ----------------------------------------------------------------------------
// Verifie les commandes SetMode vides, maximales, tronquees et malformees.
// ----------------------------------------------------------------------------
test("SetMode traite les limites et entrées malformées", () => {
  assert.equal(validateSetMode(""), EMPTY);
  assert.equal(validateSetMode(`W:${"A".repeat(63)},`), OK);
  assert.equal(validateSetMode(`W:${"A".repeat(64)},`), TOO_LONG);
  assert.equal(validateSetMode(`W:${"A".repeat(620)},`), TOO_LONG);
  assert.equal(validateSetMode("M:Rain,S:4"), MALFORMED);
  assert.equal(validateSetMode("M:Unknown,"), MALFORMED);
  assert.equal(validateSetMode("C1:GG0000,"), MALFORMED);
  assert.equal(validateSetMode("S:9,"), OUT_OF_RANGE);
  assert.equal(validateSetMode("B:101,"), OUT_OF_RANGE);
});

// ----------------------------------------------------------------------------
// Verifie les deux bornes voxel et les formes invalides de CubePainter.
// ----------------------------------------------------------------------------
test("CubePainter accepte uniquement les voxels 0 à 511", () => {
  assert.equal(validateCubePainter(fixtures.commands.cubePainterVoxel), OK);
  assert.equal(validateCubePainter(fixtures.commands.cubePainterClear), OK);
  assert.equal(validateCubePainter("I0,#000000,"), OK);
  assert.equal(validateCubePainter("I511,#FFFFFF,"), OK);
  assert.equal(validateCubePainter("I512,#FFFFFF,"), OUT_OF_RANGE);
  assert.equal(validateCubePainter("#FFFFFF,"), MALFORMED);
  assert.equal(validateCubePainter("I42,#FFFF,"), MALFORMED);
  assert.equal(validateCubePainter("C20:10,"), OUT_OF_RANGE);
  assert.equal(validateCubePainter("C0:512,"), OUT_OF_RANGE);
  assert.equal(validateCubePainter("I42,#FF0000"), MALFORMED);
});

// ----------------------------------------------------------------------------
// Verifie les fixtures et formes invalides de FnRouter et SetText.
// ----------------------------------------------------------------------------
test("FnRouter et SetText bornent leurs entrées", () => {
  for (const key of ["getSwitchState", "getColor", "setTimeZone", "setAuxSwitch", "reboot"]) {
    assert.equal(validateFnRouter(fixtures.commands[key]), OK, key);
  }
  assert.equal(validateFnRouter(""), EMPTY);
  assert.equal(validateFnRouter("GETCOLOR"), MALFORMED);
  assert.equal(validateFnRouter("GETCOLOR:7"), OUT_OF_RANGE);
  assert.equal(validateFnRouter("SETTIMEZONE:15"), OUT_OF_RANGE);
  assert.equal(validateFnRouter("SETAUXSWITCH:1,2;"), MALFORMED);
  assert.equal(validateSetText(""), OK);
  assert.equal(validateSetText("A".repeat(63)), OK);
  assert.equal(validateSetText("A".repeat(64)), TOO_LONG);
});

// ----------------------------------------------------------------------------
// Retire les commentaires avant une recherche de fonctions interdites.
//
// Parametres :
// - source : contenu d'un fichier source C++.
//
// Retour :
// - source sans commentaires de ligne ni de bloc.
// ----------------------------------------------------------------------------
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

// ----------------------------------------------------------------------------
// Enumere recursivement les fichiers C++ d'un repertoire.
//
// Parametres :
// - directory : repertoire a parcourir.
//
// Retour :
// - liste des chemins absolus se terminant par `.cpp`.
// ----------------------------------------------------------------------------
function cppFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? cppFiles(entryPath) : entryPath.endsWith(".cpp") ? [entryPath] : [];
  });
}

// ----------------------------------------------------------------------------
// Verifie que le code actif utilise uniquement les writers bornes.
// ----------------------------------------------------------------------------
test("le code actif n'utilise plus sprintf, strcat ou strcpy", () => {
  for (const sourcePath of cppFiles(path.join(firmwareRoot, "src"))) {
    const source = stripComments(fs.readFileSync(sourcePath, "utf8"));
    assert.doesNotMatch(source, /\b(?:sprintf|strcat|strcpy|vsprintf)\s*\(/, sourcePath);
  }
});

// ----------------------------------------------------------------------------
// Verifie la mutualisation statique des anciens gros buffers de pile.
// ----------------------------------------------------------------------------
test("les gros états temporaires utilisent le scratch statique partagé", () => {
  // Implémentation des transitions utilisant le framebuffer partagé.
  const transitions = fs.readFileSync(path.join(firmwareRoot, "src/rendering/transitions.cpp"), "utf8");
  // Implémentation Digi utilisant l'ordre de pixels partagé.
  const digi = fs.readFileSync(path.join(firmwareRoot, "src/animations/digi.cpp"), "utf8");
  // Famille CubeClassics utilisant les particules partagées.
  const classics = fs.readFileSync(path.join(firmwareRoot, "src/animations/cube_classics.cpp"), "utf8");
  // Implémentation PacMan utilisant ses trois sprites compacts partagés.
  const puck = fs.readFileSync(path.join(firmwareRoot, "src/animations/puck_dude.cpp"), "utf8");
  assert.doesNotMatch(transitions, /uint32_t\s+startColor\s*\[/);
  assert.match(transitions, /drawingBuffer\[offset\]/);
  assert.match(digi, /sharedAnimationScratch\.pixelOrder/);
  assert.match(classics, /sharedAnimationScratch\.particles/);
  assert.match(puck, /sharedAnimationScratch\.puckDude/);
});
