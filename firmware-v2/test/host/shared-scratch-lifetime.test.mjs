// ============================================================================
// SharedScratchLifetime - Tests hôte de l'union temporaire des animations
// ----------------------------------------------------------------------------
// Ce fichier vérifie ses capacités et l'ordre de vie critique de Whirlwind. Il
// ne simule pas le framebuffer ni les transitions sur le matériel.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware-v2 inspectée par les tests.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// État global et contrats de taille de l'union.
const legacyState = fs.readFileSync(
  path.join(firmwareRoot, "src/core/legacy_state.h"),
  "utf8",
);

// Dispatcher qui initialise les états partageant l'union.
const runtimeSource = fs.readFileSync(
  path.join(firmwareRoot, "src/core/mode_runtime.cpp"),
  "utf8",
);

// ----------------------------------------------------------------------------
// Vérifie la capacité exacte de chaque vue critique du scratch.
// ----------------------------------------------------------------------------
test("Le scratch reste borné à un framebuffer de 1 536 octets", () => {
  // Tailles décimales imposées par les assertions C++.
  const expectedSizes = [1536, 1024, 1200, 243, 1536, 64, 128];
  // Taille individuelle recherchée dans les contrats de compilation.
  for (const expectedSize of expectedSizes) {
    assert.match(
      legacyState,
      new RegExp(`== ${expectedSize}\\b`, "u"),
    );
  }
  assert.match(
    legacyState,
    /sizeof\(SharedAnimationScratch\) == PIXEL_CNT \* BPP/u,
  );
  assert.match(legacyState, /sizeof\(WhirlwindState\) >= 288/u);
});

// ----------------------------------------------------------------------------
// Vérifie que transitionAll ne détruit plus l'état Whirlwind initialisé.
// ----------------------------------------------------------------------------
test("Whirlwind initialise son état après la transition partagée", () => {
  // Début de la dernière branche Whirlwind, située dans resetVariables.
  const resetStart = runtimeSource.lastIndexOf("case WHIRLWIND:");
  assert.ok(resetStart >= 0);
  // Fin de cette branche avant le mode suivant.
  const resetEnd = runtimeSource.indexOf("break;", resetStart);
  assert.ok(resetEnd > resetStart);
  // Corps isolé de la réinitialisation Whirlwind.
  const whirlwindReset = runtimeSource.slice(resetStart, resetEnd);
  // Position de la transition dans ce bloc.
  const transitionPosition = whirlwindReset.indexOf(
    "transitionAll(black,LINEAR)",
  );
  // Position de la première écriture dans la vue Whirlwind.
  const initializationPosition = whirlwindReset.indexOf(
    "whirlwindHeights[i]",
  );
  assert.ok(transitionPosition >= 0);
  assert.ok(initializationPosition >= 0);
  assert.ok(transitionPosition < initializationPosition);
});
