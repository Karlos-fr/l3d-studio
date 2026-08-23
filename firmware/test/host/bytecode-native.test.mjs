// ============================================================================
// BytecodeNativeTest - Compilation et execution du banc C++ de la VM L3D
// ----------------------------------------------------------------------------
// Ce test utilise le compilateur C++ disponible sur l'hote. Il est ignore
// proprement lorsque ni Visual C++ ni g++ ne sont installes.
// ============================================================================

import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Racine absolue du depot derivee du fichier de test.
const REPOSITORY_ROOT = new URL("../../../", import.meta.url);

// Source C++ du banc d'essai natif.
const HARNESS_PATH = new URL("cpp/bytecode_native_harness.cpp", import.meta.url);

// Repertoire ignore reserve aux artefacts du test natif.
const BUILD_DIRECTORY = new URL("../../build/host-bytecode-tests/", import.meta.url);

// Executable produit selon la plateforme courante.
const EXECUTABLE_PATH = new URL(
  process.platform === "win32" ? "bytecode-native.exe" : "bytecode-native",
  BUILD_DIRECTORY,
);

// Script Windows qui protege les chemins Visual Studio contenant des espaces.
const WINDOWS_COMPILE_SCRIPT_PATH = new URL(
  "compile-bytecode-native.cmd",
  import.meta.url,
);

// Chemin systeme de la racine du depot.
const REPOSITORY_PATH = fileURLToPath(REPOSITORY_ROOT);

// Chemin systeme de la source C++.
const HARNESS_SYSTEM_PATH = fileURLToPath(HARNESS_PATH);

// Chemin systeme de l'executable produit.
const EXECUTABLE_SYSTEM_PATH = fileURLToPath(EXECUTABLE_PATH);

// Chemins Visual Studio courants tries du plus recent au plus minimal.
const VISUAL_STUDIO_DEVELOPER_SCRIPTS = [
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\Common7\\Tools\\VsDevCmd.bat",
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\Common7\\Tools\\VsDevCmd.bat",
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\Common7\\Tools\\VsDevCmd.bat",
  "C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\Common7\\Tools\\VsDevCmd.bat",
];

// Configuration du compilateur disponible, ou absence explicite.
const COMPILER = findHostCompiler();

// ----------------------------------------------------------------------------
// Recherche Visual C++ sous Windows puis g++ sur les autres plateformes.
//
// Retour :
// - configuration du compilateur ou null lorsqu'aucun outil n'est disponible.
// ----------------------------------------------------------------------------
function findHostCompiler() {
  if (process.platform === "win32") {
    for (const developerScript of VISUAL_STUDIO_DEVELOPER_SCRIPTS) {
      if (existsSync(developerScript)) return { kind: "msvc", developerScript };
    }
    return null;
  }
  // Resultat silencieux de la recherche de g++ dans le PATH.
  const probe = spawnSync("g++", ["--version"], { encoding: "utf8" });
  return probe.status === 0 ? { kind: "gcc" } : null;
}

// ----------------------------------------------------------------------------
// Compile le banc avec l'outil detecte et retourne son processus termine.
//
// Retour :
// - resultat spawnSync contenant statut et sorties.
// ----------------------------------------------------------------------------
function compileHarness() {
  mkdirSync(BUILD_DIRECTORY, { recursive: true });
  if (COMPILER.kind === "msvc") {
    // Arguments transmis au script batch qui charge l'environnement Visual C++.
    const compilerArguments = [
      "/d",
      "/c",
      fileURLToPath(WINDOWS_COMPILE_SCRIPT_PATH),
      COMPILER.developerScript,
      HARNESS_SYSTEM_PATH,
      EXECUTABLE_SYSTEM_PATH,
      fileURLToPath(new URL("bytecode-native.obj", BUILD_DIRECTORY)),
    ];
    return spawnSync("cmd.exe", compilerArguments, {
      cwd: REPOSITORY_PATH,
      encoding: "utf8",
    });
  }
  return spawnSync(
    "g++",
    ["-std=c++14", HARNESS_SYSTEM_PATH, "-o", EXECUTABLE_SYSTEM_PATH],
    { cwd: REPOSITORY_PATH, encoding: "utf8" },
  );
}

// ----------------------------------------------------------------------------
// Compile puis execute les scenarios du vrai code C++ firmware.
// ----------------------------------------------------------------------------
function testNativeFirmwareVm() {
  // Resultat de la compilation hote.
  const compilation = compileHarness();
  assert.equal(
    compilation.status,
    0,
    `Compilation native impossible :\n${compilation.stdout}\n${compilation.stderr}`,
  );
  // Resultat de tous les scenarios regroupes dans le binaire.
  const execution = spawnSync(EXECUTABLE_SYSTEM_PATH, [], { encoding: "utf8" });
  assert.equal(
    execution.status,
    0,
    `VM native en echec :\n${execution.stdout}\n${execution.stderr}`,
  );
}

test(
  "le vrai validateur et la vraie VM passent les scenarios natifs",
  { skip: COMPILER === null },
  testNativeFirmwareVm,
);
