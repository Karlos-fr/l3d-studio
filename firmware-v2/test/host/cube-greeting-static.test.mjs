// ============================================================================
// CubeGreetingStatic - Tests hôte de la séquence de bienvenue
// ----------------------------------------------------------------------------
// Ce fichier vérifie les messages bornés et les sept branches historiques. Il
// ne déroule pas la longue démonstration sur le cube physique.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware-v2 inspectée par le test.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// Source de la séquence de bienvenue.
const greetingSource = fs.readFileSync(
  path.join(firmwareRoot, "src/animations/cube_greeting.cpp"),
  "utf8",
);

// ----------------------------------------------------------------------------
// Vérifie que les sept branches historiques restent présentes et bornées.
// ----------------------------------------------------------------------------
test("CubeGreeting conserve ses sept écrans sans chaîne dynamique", () => {
  for (let textMode = 0; textMode <= 6; textMode += 1) {
    assert.match(greetingSource, new RegExp(`case\\(${textMode}\\):`, "u"));
  }
  assert.doesNotMatch(greetingSource, /\bString\b|std::string|new|malloc/u);
  assert.match(
    greetingSource,
    /boundedTextCopy\(message, sizeof\(message\), currentModeName\)/u,
  );
  // Chaque branche texte calcule au plus une fois sa longueur pour la frame.
  const lengthCalls = greetingSource.match(/strlen\(message\)/gu) ?? [];
  assert.equal(lengthCalls.length, 3);
});
