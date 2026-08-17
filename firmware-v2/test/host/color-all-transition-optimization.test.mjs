// ============================================================================
// ColorAllTransitionOptimization - Tests hôte des facteurs de transition
// ----------------------------------------------------------------------------
// Ce fichier compare les calculs historiques et mutualisés de ColorAll. Il ne
// pilote pas les LEDs et ne valide pas visuellement la transition physique.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Nombre historique d'étapes d'une transition.
const TRANSITION_STEP_COUNT = 8;

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware-v2 inspectée par le test statique.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// Source des transitions partagées.
const transitionSource = fs.readFileSync(
  path.join(firmwareRoot, "src/rendering/transitions.cpp"),
  "utf8",
);

// ----------------------------------------------------------------------------
// Tronque un nombre comme une conversion C++ vers int16_t.
//
// Parametres :
// - value : nombre flottant compris dans la plage signée sur 16 bits.
//
// Retour :
// - entier tronqué vers zéro.
// ----------------------------------------------------------------------------
function truncateToInt16(value) {
  return Math.trunc(value);
}

// ----------------------------------------------------------------------------
// Reproduit le calcul historique d'un canal.
//
// Parametres :
// - startChannel : niveau initial compris entre zéro et 255.
// - endChannel : niveau cible compris entre zéro et 255.
// - step : étape courante comprise entre un et huit.
// - polar : vrai pour la courbe polaire, faux pour la courbe linéaire.
//
// Retour :
// - incrément signé historique.
// ----------------------------------------------------------------------------
function legacyStep(startChannel, endChannel, step, polar) {
  // Écart signé exact des deux octets.
  const difference = endChannel - startChannel;
  if (!polar) {
    return truncateToInt16((step * difference) / TRANSITION_STEP_COUNT);
  }
  // Division effectuée en simple précision sur le Photon.
  const progress = Math.fround(step / TRANSITION_STEP_COUNT);
  if (endChannel < startChannel) {
    return truncateToInt16(Math.sqrt(progress) * Math.fround(difference));
  }
  return truncateToInt16(
    Math.fround(Math.fround(progress * progress) * Math.fround(difference)),
  );
}

// ----------------------------------------------------------------------------
// Reproduit le calcul avec facteurs mutualisés par étape.
//
// Parametres :
// - startChannel : niveau initial compris entre zéro et 255.
// - endChannel : niveau cible compris entre zéro et 255.
// - step : étape courante comprise entre un et huit.
// - polar : vrai pour la courbe polaire, faux pour la courbe linéaire.
//
// Retour :
// - incrément signé optimisé.
// ----------------------------------------------------------------------------
function optimizedStep(startChannel, endChannel, step, polar) {
  // Écart signé exact des deux octets.
  const difference = endChannel - startChannel;
  if (!polar) {
    return truncateToInt16((step * difference) / TRANSITION_STEP_COUNT);
  }
  // Progression simple précision calculée une fois pour l'étape.
  const progress = Math.fround(step / TRANSITION_STEP_COUNT);
  // Facteur décroissant double précision calculé une fois pour l'étape.
  const decreaseFactor = Math.sqrt(progress);
  // Facteur croissant simple précision calculé une fois pour l'étape.
  const increaseFactor = Math.fround(progress * progress);
  if (endChannel < startChannel) {
    return truncateToInt16(decreaseFactor * Math.fround(difference));
  }
  return truncateToInt16(
    Math.fround(increaseFactor * Math.fround(difference)),
  );
}

// ----------------------------------------------------------------------------
// Compare toutes les paires de canaux et toutes les étapes historiques.
// ----------------------------------------------------------------------------
test("ColorAll conserve chaque incrément linéaire et polaire", () => {
  for (let startChannel = 0; startChannel <= 255; startChannel += 1) {
    for (let endChannel = 0; endChannel <= 255; endChannel += 1) {
      for (let step = 1; step <= TRANSITION_STEP_COUNT; step += 1) {
        assert.equal(
          optimizedStep(startChannel, endChannel, step, false),
          legacyStep(startChannel, endChannel, step, false),
        );
        assert.equal(
          optimizedStep(startChannel, endChannel, step, true),
          legacyStep(startChannel, endChannel, step, true),
        );
      }
    }
  }
});

// ----------------------------------------------------------------------------
// Vérifie que ColorAll ne calcule plus une racine par canal et par voxel.
// ----------------------------------------------------------------------------
test("ColorAll mutualise les facteurs polaires par étape", () => {
  // Appels à sqrt restants : un dans chaque boucle d'étapes publique.
  const squareRootCalls = transitionSource.match(/sqrt\(progress\)/gu) ?? [];
  assert.equal(squareRootCalls.length, 2);
  assert.doesNotMatch(
    transitionSource,
    /sqrt\(float\(step\)\s*\/\s*numSteps\)/u,
  );
  assert.match(transitionSource, /for\(uint8_t step = 1;/u);
});
