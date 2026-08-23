// ============================================================================
// BytecodePhase4PersistenceTest - Contrats statiques EEPROM et API LAN
// ----------------------------------------------------------------------------
// Ces tests completent le banc C++ natif par les frontieres d'integration. Ils
// ne remplacent pas une coupure d'alimentation sur le Photon physique.
// ============================================================================

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Racine des sources firmware inspectees.
const SOURCE_ROOT = new URL("../../src/", import.meta.url);

// Source du contrat de stockage.
const STORAGE_HEADER = readSource("bytecode/bytecode_storage.h");

// Implementation transactionnelle EEPROM.
const STORAGE_SOURCE = readSource("bytecode/bytecode_storage.cpp");

// Implementation de l'API HTTP locale.
const SERVER_SOURCE = readSource("network/local_api_server.cpp");

// Integration de la persistance a l'entree du mode.
const VM_SOURCE = readSource("bytecode/bytecode_vm.cpp");

// Integration du chargement dans le unity build.
const MAIN_SOURCE = readSource("main.cpp");

// ----------------------------------------------------------------------------
// Lit un fichier source relatif au firmware.
//
// Parametres :
// - relativePath : chemin depuis firmware/src.
//
// Retour :
// - contenu UTF-8 integral.
// ----------------------------------------------------------------------------
function readSource(relativePath) {
  return readFileSync(new URL(relativePath, SOURCE_ROOT), "utf8");
}

// ----------------------------------------------------------------------------
// Retire les commentaires C++ avant les recherches d'appels executables.
//
// Parametres :
// - source : contenu C++ integral.
//
// Retour :
// - code prive des commentaires.
// ----------------------------------------------------------------------------
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/.*$/gmu, "");
}

test("les banques occupent uniquement les adresses libres 1652 a 2045", () => {
  assert.match(STORAGE_HEADER, /BANK_A_ADDRESS = 1652/u);
  assert.match(STORAGE_HEADER, /BANK_B_ADDRESS = 1849/u);
  assert.match(STORAGE_HEADER, /BANK_SIZE = BYTECODE_CONTAINER_MAX_SIZE/u);
  assert.match(STORAGE_SOURCE, /AUXSW_START_ADDR[\s\S]*BYTECODE_STORAGE_BANK_A_ADDRESS/u);
});

test("l'ecriture invalide puis active la signature en dernier", () => {
  const install = STORAGE_SOURCE.match(
    /int16_t bytecodeStorageInstall\([\s\S]*?\n\}/u,
  );
  assert.ok(install, "la fonction d'installation doit rester isolee");
  const code = stripComments(install[0]);
  const invalidateIndex = code.indexOf("bytecodeStorageWriteChanged(targetAddress, 0)");
  const payloadIndex = code.indexOf("for(size_t index = 1");
  const verificationIndex = code.indexOf("bytecodeStorageVerifyBeforeActivation");
  const activateIndex = code.indexOf("bytecodeStorageWriteChanged(targetAddress, 'L')");
  assert.ok(invalidateIndex >= 0 && payloadIndex > invalidateIndex);
  assert.ok(verificationIndex > payloadIndex && activateIndex > verificationIndex);
  assert.match(stripComments(STORAGE_SOURCE), /EEPROM\.read\(address\) != value/u);
});

test("la VM relit l'EEPROM seulement lors de l'entree dans le mode", () => {
  assert.match(VM_SOURCE, /int16_t bytecodeEnter\([\s\S]*bytecodeStorageRead/u);
  const tick = VM_SOURCE.match(/void bytecodeTick\([\s\S]*$/u);
  assert.ok(tick);
  assert.doesNotMatch(stripComments(tick[0]), /bytecodeStorageRead|EEPROM\./u);
  assert.match(MAIN_SOURCE, /#include "bytecode\/bytecode_storage\.cpp"/u);
});

test("l'API LAN expose lecture, installation, suppression, lancement et arret", () => {
  for (const path of [
    "/api/v1/bytecode",
    "/api/v1/bytecode/program",
    "/api/v1/bytecode/delete",
    "/api/v1/bytecode/run",
    "/api/v1/bytecode/stop",
  ]) {
    assert.ok(SERVER_SOURCE.includes(path), `route absente : ${path}`);
  }
  assert.match(SERVER_SOURCE, /application\/octet-stream/u);
  assert.match(SERVER_SOURCE, /bodyLength > BYTECODE_CONTAINER_MAX_SIZE/u);
  assert.match(SERVER_SOURCE, /bytecodeStorageInstall/u);
  assert.match(SERVER_SOURCE, /bytecodeStorageRead/u);
  assert.doesNotMatch(STORAGE_SOURCE, /TCP|HTTP|localApi/u);
});

test("la desactivation du bytecode retire aussi ses routes LAN", () => {
  assert.match(SERVER_SOURCE, /#if L3D_BYTECODE_ENABLED[\s\S]*localApiRouteBytecodeStatus/u);
  assert.match(STORAGE_SOURCE, /#if L3D_BYTECODE_ENABLED/u);
  assert.match(MAIN_SOURCE, /#include "bytecode\/bytecode_storage\.h"/u);
});
