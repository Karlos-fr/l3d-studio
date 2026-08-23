// ============================================================================
// BytecodeStorageNativeTest - Execution native du stockage EEPROM L3D
// ----------------------------------------------------------------------------
// Ce test compile le vrai module C++ de persistance. Il est ignore uniquement
// lorsqu'aucun compilateur hote compatible n'est installe.
// ============================================================================

import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Racine absolue du depot.
const REPOSITORY_ROOT = new URL("../../../", import.meta.url);

// Source du banc de stockage transactionnel.
const HARNESS_PATH = new URL("cpp/bytecode_storage_native_harness.cpp", import.meta.url);

// Repertoire ignore des artefacts natifs.
const BUILD_DIRECTORY = new URL("../../build/host-bytecode-storage-tests/", import.meta.url);

// Executable produit pour la plateforme courante.
const EXECUTABLE_PATH = new URL(
  process.platform === "win32" ? "bytecode-storage-native.exe" : "bytecode-storage-native",
  BUILD_DIRECTORY,
);

// Script batch de compilation Visual Studio deja partage par la VM.
const WINDOWS_COMPILE_SCRIPT_PATH = new URL("compile-bytecode-native.cmd", import.meta.url);

// Racine systeme utilisee comme repertoire courant.
const REPOSITORY_PATH = fileURLToPath(REPOSITORY_ROOT);

// Scripts Visual Studio recherches par priorite.
const VISUAL_STUDIO_DEVELOPER_SCRIPTS = [
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\Common7\\Tools\\VsDevCmd.bat",
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\Common7\\Tools\\VsDevCmd.bat",
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\Common7\\Tools\\VsDevCmd.bat",
  "C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\Common7\\Tools\\VsDevCmd.bat",
];

// Compilateur hote disponible ou absence explicite.
const COMPILER = findHostCompiler();

// ----------------------------------------------------------------------------
// Recherche Visual C++ puis g++ selon la plateforme.
//
// Retour :
// - configuration du compilateur ou null.
// ----------------------------------------------------------------------------
function findHostCompiler() {
  if (process.platform === "win32") {
    for (const developerScript of VISUAL_STUDIO_DEVELOPER_SCRIPTS) {
      if (existsSync(developerScript)) return { kind: "msvc", developerScript };
    }
    return null;
  }
  const probe = spawnSync("g++", ["--version"], { encoding: "utf8" });
  return probe.status === 0 ? { kind: "gcc" } : null;
}

// ----------------------------------------------------------------------------
// Compile le banc avec le compilateur detecte.
//
// Retour :
// - processus de compilation termine.
// ----------------------------------------------------------------------------
function compileHarness() {
  mkdirSync(BUILD_DIRECTORY, { recursive: true });
  const harness = fileURLToPath(HARNESS_PATH);
  const executable = fileURLToPath(EXECUTABLE_PATH);
  if (COMPILER?.kind === "msvc") {
    return spawnSync("cmd.exe", [
      "/d",
      "/c",
      fileURLToPath(WINDOWS_COMPILE_SCRIPT_PATH),
      COMPILER.developerScript,
      harness,
      executable,
      fileURLToPath(new URL("bytecode-storage-native.obj", BUILD_DIRECTORY)),
    ], { cwd: REPOSITORY_PATH, encoding: "utf8" });
  }
  return spawnSync("g++", ["-std=c++14", harness, "-o", executable], {
    cwd: REPOSITORY_PATH,
    encoding: "utf8",
  });
}

// ----------------------------------------------------------------------------
// Compile puis execute tous les scenarios de persistance.
// ----------------------------------------------------------------------------
function testNativeStorage() {
  const compilation = compileHarness();
  assert.equal(
    compilation.status,
    0,
    `Compilation native impossible :\n${compilation.stdout}\n${compilation.stderr}`,
  );
  const execution = spawnSync(fileURLToPath(EXECUTABLE_PATH), [], { encoding: "utf8" });
  assert.equal(
    execution.status,
    0,
    `Stockage natif en echec :\n${execution.stdout}\n${execution.stderr}`,
  );
}

test(
  "le stockage EEPROM conserve toujours une generation complete",
  { skip: COMPILER === null },
  testNativeStorage,
);
