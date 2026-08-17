// ============================================================================
// CrumbleFixedState - Tests hôte du stockage borné de CrumblingPlane
// ----------------------------------------------------------------------------
// Ce fichier vérifie le retrait et la réinitialisation des 64 positions. Il ne
// simule ni le rendu NeoPixel ni les changements d'axe du matériel réel.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Nombre de positions dans un plan logique 8 x 8.
const POSITION_COUNT = 64;

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware-v2 inspecté par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Produit un cycle complet contenant les positions de zéro à 63.
//
// Retour :
// - tableau neuf représentant un reset complet du mode.
// ----------------------------------------------------------------------------
function resetPositions() {
  return Array.from(
    { length: POSITION_COUNT },
    // ------------------------------------------------------------------------
    // Retourne l'index fourni comme valeur de position.
    //
    // Parametres :
    // - _value : valeur inutilisée fournie par Array.from.
    // - index : index de la position produite.
    //
    // Retour :
    // - index inchangé.
    // ------------------------------------------------------------------------
    (_value, index) => index,
  );
}

// ----------------------------------------------------------------------------
// Retire une position en décalant les éléments suivants vers la gauche.
//
// Parametres :
// - positions : tableau fixe simulé dont seule la longueur est valide.
// - removalIndex : index à retirer.
//
// Retour :
// - position retirée et liste compacte restante.
// ----------------------------------------------------------------------------
function removePosition(positions, removalIndex) {
  // Position mémorisée avant le déplacement des éléments suivants.
  const selectedPosition = positions[removalIndex];
  // Copie utilisée uniquement par le modèle de test hôte.
  const remaining = positions.slice();
  for (let index = removalIndex + 1; index < remaining.length; index += 1) {
    remaining[index - 1] = remaining[index];
  }
  remaining.length -= 1;
  return { selectedPosition, remaining };
}

// ----------------------------------------------------------------------------
// Vérifie que CrumblingPlane ne dépend plus d'un conteneur dynamique.
// ----------------------------------------------------------------------------
test("CrumblingPlane ne contient plus d'allocation dynamique", () => {
  // Implémentation active de CrumblingPlane.
  const crumbleSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/crumble.cpp"),
    "utf8",
  );
  // Interface publique de CrumblingPlane.
  const crumbleHeader = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/crumble.h"),
    "utf8",
  );
  assert.doesNotMatch(crumbleSource, /\b(?:vector|String|new|malloc)\b/);
  assert.doesNotMatch(crumbleHeader, /\b(?:vector|String|new|malloc)\b/);
});

// ----------------------------------------------------------------------------
// Vérifie la représentation sur 64 octets dans le scratch partagé.
// ----------------------------------------------------------------------------
test("les 64 positions réutilisent le scratch partagé", () => {
  // État global historique contenant l'union de scratch.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  assert.match(legacyState, /uint8_t crumbleRemaining\[SIDE \* SIDE\];/);
  assert.match(legacyState, /const uint8_t CRUMBLE_POSITION_COUNT = SIDE \* SIDE;/);
  assert.match(legacyState, /uint8_t crumbleRemainingCount;/);
});

// ----------------------------------------------------------------------------
// Vérifie les retraits au début, au milieu et à la fin d'un cycle.
// ----------------------------------------------------------------------------
test("le retrait compacte exactement les positions suivantes", () => {
  // Cycle complet utilisé indépendamment pour chaque cas de retrait.
  const positions = resetPositions();

  // Résultat du retrait de la première position.
  const first = removePosition(positions, 0);
  assert.equal(first.selectedPosition, 0);
  assert.deepEqual(first.remaining, positions.slice(1));

  // Résultat du retrait d'une position centrale.
  const middle = removePosition(positions, 31);
  assert.equal(middle.selectedPosition, 31);
  assert.deepEqual(middle.remaining, [...positions.slice(0, 31), ...positions.slice(32)]);

  // Résultat du retrait de la dernière position.
  const last = removePosition(positions, POSITION_COUNT - 1);
  assert.equal(last.selectedPosition, POSITION_COUNT - 1);
  assert.deepEqual(last.remaining, positions.slice(0, -1));
});

// ----------------------------------------------------------------------------
// Vérifie qu'un reset remplace un cycle partiellement consommé sans l'ajouter.
// ----------------------------------------------------------------------------
test("un reset recharge exactement 64 positions sans résidu", () => {
  // Cycle partiel simulant une sortie de mode avant sa fin.
  const partialCycle = resetPositions().slice(17);
  assert.equal(partialCycle.length, 47);

  // Nouveau cycle indépendant produit par la réinitialisation.
  const resetCycle = resetPositions();
  assert.equal(resetCycle.length, POSITION_COUNT);
  assert.deepEqual(resetCycle, [...Array(POSITION_COUNT).keys()]);
});
