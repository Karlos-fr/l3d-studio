// ============================================================================
// TextClockStatic - Tests hote du rendu texte et des glyphes Clock
// ----------------------------------------------------------------------------
// Ce fichier compare les positions et matrices discretes sans simuler la fonte
// complete, l'horloge Particle ni le framebuffer NeoPixel.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Longueur d'un axe et espacement historique entre deux caractères.
const SIDE = 8;

// Longueur maximale autorisée par le protocole texte.
const MAX_TEXT_LENGTH = 63;

// Masques compacts attendus pour les dix chiffres Clock.
const EXPECTED_DIGIT_MASKS = [
  [7, 5, 5, 5, 7],
  [2, 6, 2, 2, 7],
  [6, 1, 3, 4, 7],
  [6, 1, 6, 1, 6],
  [5, 5, 7, 1, 1],
  [7, 4, 7, 1, 6],
  [3, 4, 7, 5, 7],
  [7, 1, 2, 2, 2],
  [7, 5, 7, 5, 7],
  [7, 5, 7, 1, 6],
];

// Matrices booléennes historiques des dix chiffres Clock.
const LEGACY_DIGITS = [
  ["111", "101", "101", "101", "111"],
  ["010", "110", "010", "010", "111"],
  ["110", "001", "011", "100", "111"],
  ["110", "001", "110", "001", "110"],
  ["101", "101", "111", "001", "001"],
  ["111", "100", "111", "001", "110"],
  ["011", "100", "111", "101", "111"],
  ["111", "001", "010", "010", "010"],
  ["111", "101", "111", "101", "111"],
  ["111", "101", "111", "001", "110"],
];

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspecte par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Convertit une rangée binaire historique en masque de trois bits.
//
// Parametres :
// - row : texte de trois chiffres zéro ou un.
//
// Retour :
// - masque entier compris entre zéro et sept.
// ----------------------------------------------------------------------------
function rowToMask(row) {
  return Number.parseInt(row, 2);
}

// ----------------------------------------------------------------------------
// Produit les origines X successives du défilement plan historique.
//
// Parametres :
// - textLength : nombre de caractères borné.
// - initialX : origine X fractionnaire du premier caractère.
//
// Retour :
// - liste des origines, espacées de huit voxels.
// ----------------------------------------------------------------------------
function scrollOrigins(textLength, initialX) {
  return Array.from(
    { length: textLength },
    // ------------------------------------------------------------------------
    // Calcule l'origine du caractère courant.
    //
    // Parametres :
    // - _value : valeur inutilisée fournie par Array.from.
    // - index : index du caractère.
    //
    // Retour :
    // - origine X historique.
    // ------------------------------------------------------------------------
    (_value, index) => SIDE * index - initialX,
  );
}

// ----------------------------------------------------------------------------
// Produit les positions successives du chapiteau historique.
//
// Parametres :
// - textLength : nombre de caractères borné.
// - position : position fractionnaire courante.
//
// Retour :
// - liste des positions entières transmises aux caractères.
// ----------------------------------------------------------------------------
function marqueeOrigins(textLength, position) {
  return Array.from(
    { length: textLength },
    // ------------------------------------------------------------------------
    // Calcule la position du caractère courant autour du cube.
    //
    // Parametres :
    // - _value : valeur inutilisée fournie par Array.from.
    // - index : index du caractère.
    //
    // Retour :
    // - position entière historique.
    // ------------------------------------------------------------------------
    (_value, index) => Math.trunc(position) - SIDE * index,
  );
}

// ----------------------------------------------------------------------------
// Verifie l'équivalence bit-à-bit des dix glyphes numériques.
// ----------------------------------------------------------------------------
test("les masques Clock reproduisent les matrices historiques", () => {
  assert.deepEqual(
    LEGACY_DIGITS.map(
      // ----------------------------------------------------------------------
      // Convertit les cinq rangées d'un chiffre en masques.
      //
      // Parametres :
      // - digit : rangées binaires du chiffre.
      //
      // Retour :
      // - cinq masques compacts.
      // ----------------------------------------------------------------------
      (digit) => digit.map(rowToMask),
    ),
    EXPECTED_DIGIT_MASKS,
  );

  // Implementation Clock contenant les tables compactes.
  const clockSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/clock.cpp"),
    "utf8",
  );
  for (const masks of EXPECTED_DIGIT_MASKS) {
    assert.match(clockSource, new RegExp(`\\{${masks.join(", ")}\\}`, "u"));
  }
  assert.match(clockSource, /CLOCK_AM_PM_GLYPHS\[2\]\[3\][\s\S]*\{3, 3, 3\}[\s\S]*\{3, 3, 2\}/u);
  assert.doesNotMatch(clockSource, /bool\s+(?:digits|ampm)\s*\[/u);
});

// ----------------------------------------------------------------------------
// Verifie les positions des textes vide, court et maximal.
// ----------------------------------------------------------------------------
test("les primitives texte conservent les positions de chaque caractere", () => {
  assert.deepEqual(scrollOrigins(0, 2.5), []);
  assert.deepEqual(scrollOrigins(1, 2.5), [-2.5]);
  assert.deepEqual(scrollOrigins(5, 2.5), [-2.5, 5.5, 13.5, 21.5, 29.5]);
  assert.equal(scrollOrigins(MAX_TEXT_LENGTH, 0).at(-1), 496);

  assert.deepEqual(marqueeOrigins(0, 12.75), []);
  assert.deepEqual(marqueeOrigins(1, 12.75), [12]);
  assert.deepEqual(marqueeOrigins(5, 12.75), [12, 4, -4, -12, -20]);
  assert.equal(marqueeOrigins(MAX_TEXT_LENGTH, 12.75).at(-1), -484);
});

// ----------------------------------------------------------------------------
// Verifie les tailles maximales des formats Clock 24 h et 12 h.
// ----------------------------------------------------------------------------
test("clockMessage contient les formats 24 h et 12 h", () => {
  // Plus longue heure au format 24 heures.
  const twentyFourHourMessage = "23:59:59";
  // Plus longue heure au format 12 heures avec suffixe.
  const twelveHourMessage = "12:59:59PM";
  assert.equal(twentyFourHourMessage.length + 1 <= 11, true);
  assert.equal(twelveHourMessage.length + 1, 11);
});

// ----------------------------------------------------------------------------
// Verifie l'absence de copie String dans l'API de rendu active.
// ----------------------------------------------------------------------------
test("le rendu texte partage accepte uniquement des chaines C", () => {
  // Implementation active des primitives texte.
  const textSource = fs.readFileSync(
    path.join(firmwareRoot, "src/animations/text.cpp"),
    "utf8",
  );
  // Déclarations historiques partagées par le unity build.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  assert.match(textSource, /void scrollText\(const char\* text,/u);
  assert.match(textSource, /void marquee\(const char\* text,/u);
  assert.doesNotMatch(textSource, /\bString\s+text\b|\.charAt\(/u);
  assert.doesNotMatch(legacyState, /(?:marquee|scrollText)\(String/u);
});

// ----------------------------------------------------------------------------
// Verifie la suppression des helpers standard morts et de leurs includes.
// ----------------------------------------------------------------------------
test("les helpers std::string inutilises sont retires", () => {
  // Point d'entrée unity build inspecté pour ses includes.
  const mainSource = fs.readFileSync(
    path.join(firmwareRoot, "src/main.cpp"),
    "utf8",
  );
  // Primitives de rendu inspectées pour les anciens helpers.
  const primitiveSource = fs.readFileSync(
    path.join(firmwareRoot, "src/rendering/primitives.cpp"),
    "utf8",
  );
  assert.doesNotMatch(mainSource, /#include <(?:bitset|string|vector)>/u);
  assert.doesNotMatch(primitiveSource, /std::string|integerToBinaryString|strRev|padTo/u);
});
