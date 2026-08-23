// ============================================================================
// BytecodeFormatContract - Tests hote du contrat de bytecode procedural L3D
// ----------------------------------------------------------------------------
// Ces tests figent le contrat normatif et vérifient que le guide utilisateur
// couvre toutes les instructions et fautes réellement publiées.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Racine du firmware contenant le contrat et le plan inspectes.
const firmwareRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Chemin absolu du contrat versionne de la VM.
const formatPath = path.join(firmwareRoot, "docs/BYTECODE_FORMAT.md");

// Contenu UTF-8 du contrat charge une seule fois pour les assertions.
const format = fs.readFileSync(formatPath, "utf8");

// Chemin absolu du guide utilisateur du langage procédural.
const languagePath = path.join(firmwareRoot, "docs/BYTECODE_LANGUAGE.md");

// Contenu UTF-8 du guide chargé une seule fois pour les assertions.
const language = fs.readFileSync(languagePath, "utf8");

// Mnémotechniques publiques exactes de la version 1.
const PUBLIC_MNEMONICS = [
  "HALT", "CLEAR", "SHOW", "YIELD", "FADE",
  "SET_I8", "SET_U8", "COPY", "ADD_I8", "ADD_REG", "SUB_REG", "SIN8", "RAND_U8",
  "COLOR_RGB", "COLOR_WHEEL", "COLOR_REGS",
  "VOXEL", "SPHERE", "BOUNCE",
  "PARTICLE_CONFIG", "PARTICLE_EMIT", "PARTICLE_STEP",
  "JUMP", "JLT", "WAIT",
];

// Offsets de depart attendus pour les dix champs et le payload du conteneur.
const HEADER_OFFSETS = [0, 3, 4, 5, 6, 7, 8, 9, 10, 12];

// ----------------------------------------------------------------------------
// Verifie le budget persistant et les douze octets du conteneur version 1.
// ----------------------------------------------------------------------------
test("le conteneur bytecode reste borne a 197 octets", () => {
  assert.match(format, /taille maximale de 197 octets/u);
  assert.match(format, /12 octets d'en-tête/u);
  assert.match(format, /au plus 185 octets/u);
  for (const offset of HEADER_OFFSETS) {
    assert.match(format, new RegExp(`\\| ${offset} \\|`, "u"));
  }
});

// ----------------------------------------------------------------------------
// Verifie que le langage reste generique et ne cache aucune animation native.
// ----------------------------------------------------------------------------
test("les opcodes restent proceduraux et reutilisables", () => {
  for (const mnemonic of [
    "HALT",
    "CLEAR",
    "SHOW",
    "YIELD",
    "VOXEL",
    "SPHERE",
    "PARTICLE_EMIT",
    "PARTICLE_STEP",
    "JUMP",
    "JLT",
    "WAIT",
  ]) {
    assert.match(format, new RegExp("`" + mnemonic + "(?: |`)", "u"));
  }
  assert.doesNotMatch(format, /Opcode[^\n]*(?:RAIN|FIREWORKS|PLASMA)/iu);
});

// ----------------------------------------------------------------------------
// Verifie les limites qui empechent un programme de bloquer le Photon.
// ----------------------------------------------------------------------------
test("la sandbox impose registres, particules et quotas fixes", () => {
  assert.match(format, /exactement 16 registres signés de 16 bits/u);
  assert.match(format, /1 à 32 particules/u);
  assert.match(format, /au maximum 64 instructions/u);
  assert.match(format, /au plus tard après 256/u);
  assert.match(format, /scratch partagé de 1 536 octets/u);
});

// ----------------------------------------------------------------------------
// Verifie que les fautes publiques occupent une plage numerique stable.
// ----------------------------------------------------------------------------
test("les erreurs bytecode utilisent la plage moins 300", () => {
  // Codes extraits dans l'ordre public du tableau de documentation.
  const errorCodes = [];
  for (const match of format.matchAll(/\| `(-3\d\d)` \| `BYTECODE_ERROR_/gu)) {
    errorCodes.push(Number(match[1]));
  }
  // Suite contractuelle attendue de moins 300 a moins 316.
  const expectedCodes = [];
  for (let index = 0; index < 17; index += 1) {
    expectedCodes.push(-300 - index);
  }
  assert.deepEqual(errorCodes, expectedCodes);
});

// ----------------------------------------------------------------------------
// Vérifie que le guide pratique couvre chaque opcode, faute et limite majeure.
// ----------------------------------------------------------------------------
test("le guide utilisateur couvre integralement la version 1", () => {
  for (const mnemonic of PUBLIC_MNEMONICS) {
    assert.match(language, new RegExp("`" + mnemonic + "(?: |`)", "u"));
  }
  for (let index = 0; index < 17; index += 1) {
    assert.match(language, new RegExp("`" + (-300 - index) + "`", "u"));
  }
  assert.match(language, /64 instructions/u);
  assert.match(language, /256 instructions/u);
  assert.match(language, /1 à 185 octets/u);
  assert.match(language, /ni authentification, ni TLS/u);
  assert.match(language, /L3D_BYTECODE_ENABLED=0/u);
});
