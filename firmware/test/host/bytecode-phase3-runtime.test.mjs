// ============================================================================
// BytecodePhase3RuntimeTest - Contrats statiques de la VM firmware L3D
// ----------------------------------------------------------------------------
// Ces tests verifient l'integration, les bornes et le programme transitoire sans
// Photon. Les validations visuelles et reseau restent explicitement materielles.
// ============================================================================

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Racine des sources firmware inspectees.
const FIRMWARE_SOURCE_ROOT = new URL("../../src/", import.meta.url);

// Source du contrat binaire.
const FORMAT_SOURCE = readFirmwareSource("bytecode/bytecode_format.h");

// Source du validateur embarque.
const VALIDATOR_SOURCE = readFirmwareSource("bytecode/bytecode_validator.cpp");

// Source de la VM embarquee.
const VM_SOURCE = readFirmwareSource("bytecode/bytecode_vm.cpp");

// Source de l'etat partage historique.
const LEGACY_STATE_SOURCE = readFirmwareSource("core/legacy_state.h");

// Source du cycle de vie des animations.
const LIFECYCLE_SOURCE = readFirmwareSource("core/animation_lifecycle.cpp");

// Source de l'ordonnanceur cooperatif.
const SCHEDULER_SOURCE = readFirmwareSource("core/animation_scheduler.cpp");

// Source des identifiants de modes.
const MODE_IDS_SOURCE = readFirmwareSource("config/mode_ids.h");

// Source du catalogue Particle historique.
const CLOUD_METADATA_SOURCE = readFirmwareSource("cloud/metadata.cpp");

// Opcodes numeriques attendus dans la VM version 1.
const EXPECTED_OPCODES = [
  0x00, 0x01, 0x02, 0x03, 0x04,
  0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
  0x20, 0x21, 0x22,
  0x30, 0x31, 0x32, 0x38, 0x39, 0x3a,
  0x40, 0x41, 0x50,
];

// Conteneur Sphere attendu depuis l'assembleur TypeScript de phase 2.
const EXPECTED_SPHERE_CONTAINER = [
  0x4c, 0x33, 0x44, 0x01, 0x01, 0x01, 0x00, 0x31, 0x00, 0x00, 0x2d, 0x14,
  0x11, 0x00, 0x02, 0x11, 0x01, 0x02, 0x11, 0x02, 0x02, 0x10, 0x03, 0x01,
  0x10, 0x04, 0x01, 0x10, 0x05, 0x01, 0x11, 0x06, 0x00, 0x01, 0x21, 0x06,
  0x31, 0x01, 0x20, 0x01, 0x32, 0x03, 0x01, 0x06, 0x32, 0x14, 0x01, 0x06,
  0x32, 0x25, 0x01, 0x06, 0x13, 0x06, 0x03, 0x02, 0x50, 0x32, 0x00, 0x40,
  0xe4,
];

// ----------------------------------------------------------------------------
// Lit une source firmware relative a la racine partagee.
//
// Parametres :
// - relativePath : chemin source relatif a firmware/src.
//
// Retour :
// - contenu UTF-8 integral du fichier.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  return readFileSync(new URL(relativePath, FIRMWARE_SOURCE_ROOT), "utf8");
}

// ----------------------------------------------------------------------------
// Retire les commentaires C++ avant une recherche d'appel executable.
//
// Parametres :
// - source : contenu C++ integral.
//
// Retour :
// - contenu prive des commentaires de ligne et de bloc.
// ----------------------------------------------------------------------------
function stripCppComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/.*$/gmu, "");
}

// ----------------------------------------------------------------------------
// Extrait les octets decimaux ou hexadecimaux d'un tableau C++ nomme.
//
// Parametres :
// - source : source C++ contenant le tableau.
// - symbol : nom exact du tableau a extraire.
//
// Retour :
// - liste des octets dans leur ordre source.
// ----------------------------------------------------------------------------
function extractByteArray(source, symbol) {
  // Expression limitee au corps du tableau nomme.
  const arrayPattern = new RegExp(`${symbol}[^=]*=\\s*\\{([\\s\\S]*?)\\};`, "u");
  // Capture du contenu entre accolades.
  const match = arrayPattern.exec(source);
  assert.ok(match, `tableau ${symbol} introuvable`);
  // Jetons numeriques acceptes dans les tables bytecode.
  const tokens = match[1].match(/0x[0-9a-f]+|\d+/giu) ?? [];
  return tokens.map(parseByteToken);
}

// ----------------------------------------------------------------------------
// Convertit un jeton decimal ou hexadecimal en octet.
//
// Parametres :
// - token : representation numerique extraite du C++.
//
// Retour :
// - valeur numerique du jeton.
// ----------------------------------------------------------------------------
function parseByteToken(token) {
  return Number.parseInt(token, token.toLowerCase().startsWith("0x") ? 16 : 10);
}

// ----------------------------------------------------------------------------
// Calcule le CRC-16/CCITT-FALSE contractuel d'un conteneur.
//
// Parametres :
// - container : octets de l'en-tete puis du payload.
//
// Retour :
// - CRC couvrant les champs 3 a 9 puis le payload.
// ----------------------------------------------------------------------------
function calculateContainerCrc(container) {
  // Offsets couverts avant le champ CRC.
  const headerOffsets = [3, 4, 5, 6, 7, 8, 9];
  // Offsets couverts dans le payload.
  const payloadOffsets = Array.from(
    { length: container.length - 12 },
    createPayloadOffset,
  );
  let crc = 0xffff;
  for (const offset of [...headerOffsets, ...payloadOffsets]) {
    crc ^= container[offset] << 8;
    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      crc = (crc & 0x8000) !== 0
        ? ((crc << 1) ^ 0x1021) & 0xffff
        : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

// ----------------------------------------------------------------------------
// Construit l'offset d'un octet de payload pour Array.from.
//
// Parametres :
// - _value : valeur inutilisee du tableau virtuel.
// - index : index zero-base dans le payload.
//
// Retour :
// - offset correspondant dans le conteneur.
// ----------------------------------------------------------------------------
function createPayloadOffset(_value, index) {
  return index + 12;
}

// ----------------------------------------------------------------------------
// Verifie la structure modulaire et le retrait complet par drapeau.
// ----------------------------------------------------------------------------
function testModularFeatureFlag() {
  assert.match(FORMAT_SOURCE, /#if L3D_BYTECODE_ENABLED/u);
  assert.match(VALIDATOR_SOURCE, /#if L3D_BYTECODE_ENABLED/u);
  assert.match(VM_SOURCE, /#if L3D_BYTECODE_ENABLED/u);
  assert.match(MODE_IDS_SOURCE, /#if L3D_BYTECODE_ENABLED[\s\S]*#define BYTECODE\s+77/u);
}

// ----------------------------------------------------------------------------
// Verifie que l'etat complet reutilise le scratch existant.
// ----------------------------------------------------------------------------
function testSharedFixedStorage() {
  // Corps executable de la VM sans ses affirmations documentaires.
  const executableVmSource = stripCppComments(VM_SOURCE);
  assert.match(LEGACY_STATE_SOURCE, /BytecodeVmStorage bytecode;/u);
  assert.match(LEGACY_STATE_SOURCE, /sizeof\(SharedAnimationScratch\) == PIXEL_CNT \* BPP/u);
  assert.match(VM_SOURCE, /memset\(&bytecodeStorage, 0, sizeof\(bytecodeStorage\)\)/u);
  assert.doesNotMatch(executableVmSource, /\b(?:new|malloc|calloc|realloc|vector|String)\b/u);
  assert.doesNotMatch(executableVmSource, /\bEEPROM\s*[.(]/u);
}

// ----------------------------------------------------------------------------
// Verifie le cycle enter, tick, exit et le changement de mode differe.
// ----------------------------------------------------------------------------
function testLifecycleAndSafeFault() {
  assert.match(LIFECYCLE_SOURCE, /modeId == BYTECODE[\s\S]*bytecodeExit\(\)/u);
  assert.match(LIFECYCLE_SOURCE, /modeId == BYTECODE[\s\S]*bytecodeEnter\(\)/u);
  assert.match(VM_SOURCE, /bytecodeFail[\s\S]*background\(black\)[\s\S]*showPixels\(\)/u);
  assert.match(VM_SOURCE, /animationSchedulerRequestModeChange\(standbyModeIndex\)/u);
  assert.match(SCHEDULER_SOURCE, /if\(animationCycleActive\)[\s\S]*animationPendingModeIndex = modeIndex/u);
}

// ----------------------------------------------------------------------------
// Verifie les deux passes de validation et les bornes critiques.
// ----------------------------------------------------------------------------
function testValidatorContracts() {
  // Corps executable du validateur sans ses affirmations documentaires.
  const executableValidatorSource = stripCppComments(VALIDATOR_SOURCE);
  assert.match(VALIDATOR_SOURCE, /uint8_t boundaries\[BYTECODE_BOUNDARY_BYTES\] = \{\}/u);
  assert.match(VALIDATOR_SOURCE, /bytecodeCalculateCrc/u);
  assert.match(VALIDATOR_SOURCE, /requiredCapabilities/u);
  assert.match(VALIDATOR_SOURCE, /BYTECODE_ERROR_JUMP/u);
  assert.match(VALIDATOR_SOURCE, /BYTECODE_ERROR_ENTRY_POINT/u);
  assert.match(VALIDATOR_SOURCE, /BYTECODE_ERROR_PARTICLE_LIMIT/u);
  assert.match(VALIDATOR_SOURCE, /BYTECODE_WAIT_MAX_MS/u);
  assert.doesNotMatch(
    executableValidatorSource,
    /\bEEPROM\s*[.(]|\bsetPixelColor\s*\(|\bshowPixels\s*\(/u,
  );
}

// ----------------------------------------------------------------------------
// Verifie que chaque opcode contractuel possede taille et execution.
// ----------------------------------------------------------------------------
function testAllOpcodesImplemented() {
  // Valeurs extraites de l'enum de format.
  const formatOpcodes = [...FORMAT_SOURCE.matchAll(/BYTECODE_OPCODE_[A-Z0-9_]+\s*=\s*(0x[0-9A-F]+)/gu)]
    .map(extractOpcodeValue);
  assert.deepEqual(formatOpcodes, EXPECTED_OPCODES);
  for (const opcodeNameMatch of FORMAT_SOURCE.matchAll(/(BYTECODE_OPCODE_[A-Z0-9_]+)\s*=\s*0x/gu)) {
    assert.match(VM_SOURCE, new RegExp(`case ${opcodeNameMatch[1]}:`, "u"));
  }
  assert.match(VM_SOURCE, /BYTECODE_COOPERATIVE_INSTRUCTION_LIMIT/u);
  assert.match(VM_SOURCE, /BYTECODE_SLICE_INSTRUCTION_LIMIT/u);
}

// ----------------------------------------------------------------------------
// Convertit une capture d'opcode hexadecimal en nombre.
//
// Parametres :
// - match : resultat matchAll contenant la valeur en premiere capture.
//
// Retour :
// - valeur numerique de l'opcode.
// ----------------------------------------------------------------------------
function extractOpcodeValue(match) {
  return Number.parseInt(match[1], 16);
}

// ----------------------------------------------------------------------------
// Compare le programme embarque au binaire produit en phase 2.
// ----------------------------------------------------------------------------
function testDefaultProgramParity() {
  // Conteneur extrait directement du tableau C++ compile.
  const actualContainer = extractByteArray(VM_SOURCE, "BYTECODE_DEFAULT_PROGRAM");
  // CRC little-endian stocke dans le conteneur.
  const storedCrc = actualContainer[10] | (actualContainer[11] << 8);
  assert.deepEqual(actualContainer, EXPECTED_SPHERE_CONTAINER);
  assert.equal(calculateContainerCrc(actualContainer), storedCrc);
  assert.equal(actualContainer.length, 61);
  assert.equal(actualContainer[7], 49);
}

// ----------------------------------------------------------------------------
// Compare la table SIN8 embarquee aux 256 resultats TypeScript.
// ----------------------------------------------------------------------------
function testSin8Parity() {
  // Table extraite directement de la source firmware.
  const actualTable = extractByteArray(VM_SOURCE, "BYTECODE_SIN8_TABLE");
  // Table recalculee avec la formule de la VM TypeScript.
  const expectedTable = Array.from({ length: 256 }, calculateSin8Value);
  assert.deepEqual(actualTable, expectedTable);
}

// ----------------------------------------------------------------------------
// Calcule une entree SIN8 avec la semantique TypeScript de reference.
//
// Parametres :
// - _value : valeur inutilisee du tableau virtuel.
// - index : phase comprise entre zero et 255.
//
// Retour :
// - sinus non signe arrondi entre zero et 255.
// ----------------------------------------------------------------------------
function calculateSin8Value(_value, index) {
  return Math.round((Math.sin((index / 256) * Math.PI * 2) + 1) * 127.5);
}

test("la VM bytecode reste modulaire et desactivable", testModularFeatureFlag);
test("le mode bytecode ne deborde pas le catalogue Particle historique", () => {
  assert.match(CLOUD_METADATA_SOURCE, /modeStruct\[i\]\.modeId == BYTECODE/u);
  assert.match(CLOUD_METADATA_SOURCE, /continue;/u);
});
test("la VM bytecode reutilise un etat fixe partage", testSharedFixedStorage);
test("le cycle de vie protege le scratch lors des fautes", testLifecycleAndSafeFault);
test("le validateur borne conteneur, operandes et branchements", testValidatorContracts);
test("chaque opcode version 1 possede une implementation firmware", testAllOpcodesImplemented);
test("la Sphere embarquee correspond au binaire TypeScript", testDefaultProgramParity);
test("SIN8 produit les memes 256 valeurs que TypeScript", testSin8Parity);
