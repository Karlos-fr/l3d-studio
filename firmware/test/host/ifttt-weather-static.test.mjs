// ============================================================================
// IftttWeatherStatic - Tests hôte de l'affichage IFTTT
// ----------------------------------------------------------------------------
// Ce fichier vérifie la longueur bornée mutualisée et l'absence de ressource
// réseau propre. Il ne simule pas une commande IFTTT externe.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspectée par le test.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// Source de l'affichage IFTTT.
const iftttSource = fs.readFileSync(
  path.join(firmwareRoot, "src/network/ifttt_weather.cpp"),
  "utf8",
);

// ----------------------------------------------------------------------------
// Vérifie que la longueur est bornée, calculée une fois et réutilisée.
// ----------------------------------------------------------------------------
test("IFTTT mutualise la longueur de son message fixe", () => {
  assert.match(
    iftttSource,
    /const size_t messageLength = strnlen\(message, sizeof\(message\)\);/u,
  );
  assert.doesNotMatch(iftttSource, /strlen\(message\)/u);
  assert.match(iftttSource, /10UL \* 60UL \* 1000UL/u);
});

// ----------------------------------------------------------------------------
// Vérifie que le module IFTTT ne porte ni socket ni allocation dynamique.
// ----------------------------------------------------------------------------
test("IFTTT reste un affichage sans client réseau propre", () => {
  assert.doesNotMatch(iftttSource, /TCPClient|UDP|new|malloc|String\s/u);
  assert.match(iftttSource, /setNewMode\(getModeIndexFromID\(previousModeID\)\);/u);
  assert.doesNotMatch(iftttSource, /currentModeID = previousModeID;/u);
  assert.match(iftttSource, /brightness = lastBrightness;/u);
});
