// ============================================================================
// CheerLightsFixedResponse - Tests hote de la reponse HTTP bornee
// ----------------------------------------------------------------------------
// Ce fichier verifie le stockage et le parsing #RRGGBB sans ouvrir de socket ni
// appeler le service ThingSpeak reel.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Taille du buffer fixe incluant le terminateur nul.
const CHEERLIGHTS_RESPONSE_CAPACITY = 8;

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware-v2 inspecte par les tests statiques.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Construit l'etat vide du buffer simule.
//
// Retour :
// - buffer de sept caracteres utiles et longueur saturee associee.
// ----------------------------------------------------------------------------
function createResponseState() {
  return {
    characters: Array(CHEERLIGHTS_RESPONSE_CAPACITY - 1).fill("\0"),
    length: 0,
  };
}

// ----------------------------------------------------------------------------
// Reproduit l'ajout borne d'un caractere HTTP.
//
// Parametres :
// - state : etat fixe a modifier.
// - character : caractere recu apres les en-tetes.
//
// Effet de bord :
// - conserve au plus sept caracteres et sature la longueur a huit.
// ----------------------------------------------------------------------------
function appendResponseCharacter(state, character) {
  if (state.length < CHEERLIGHTS_RESPONSE_CAPACITY - 1) {
    state.characters[state.length] = character;
    state.length += 1;
    return;
  }
  state.length = CHEERLIGHTS_RESPONSE_CAPACITY;
}

// ----------------------------------------------------------------------------
// Indique si l'etat contient exactement sept caracteres.
//
// Parametres :
// - state : etat fixe a examiner.
//
// Retour :
// - vrai pour une longueur exacte de sept, faux sinon.
// ----------------------------------------------------------------------------
function hasValidResponse(state) {
  return state.length === CHEERLIGHTS_RESPONSE_CAPACITY - 1;
}

// ----------------------------------------------------------------------------
// Convertit un chiffre hexadecimal comme le helper firmware historique.
//
// Parametres :
// - character : chiffre hexadecimal ASCII.
//
// Retour :
// - valeur comprise entre zero et quinze.
// ----------------------------------------------------------------------------
function hexToInteger(character) {
  const parsed = Number.parseInt(character, 16);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
}

// ----------------------------------------------------------------------------
// Decode les six chiffres RGB d'une reponse valide.
//
// Parametres :
// - state : etat contenant la chaine #RRGGBB.
//
// Retour :
// - triplet rouge, vert et bleu.
// ----------------------------------------------------------------------------
function parseResponseColor(state) {
  const value = state.characters.join("");
  return [
    hexToInteger(value[1]) * 16 + hexToInteger(value[2]),
    hexToInteger(value[3]) * 16 + hexToInteger(value[4]),
    hexToInteger(value[5]) * 16 + hexToInteger(value[6]),
  ];
}

// ----------------------------------------------------------------------------
// Remplit un etat avec tous les caracteres d'un texte de test.
//
// Parametres :
// - text : corps HTTP simule.
//
// Retour :
// - etat obtenu apres lecture complete.
// ----------------------------------------------------------------------------
function readResponse(text) {
  // Etat vide qui recevra le texte caractère par caractère.
  const state = createResponseState();
  for (const character of text) {
    appendResponseCharacter(state, character);
  }
  return state;
}

// ----------------------------------------------------------------------------
// Verifie les longueurs vide, courte, exacte et trop longue.
// ----------------------------------------------------------------------------
test("la reponse CheerLights accepte uniquement sept caracteres", () => {
  assert.equal(hasValidResponse(readResponse("")), false);
  assert.equal(hasValidResponse(readResponse("#12345")), false);
  assert.equal(hasValidResponse(readResponse("#123456")), true);
  assert.equal(hasValidResponse(readResponse("#1234567")), false);
  assert.equal(hasValidResponse(readResponse("#1234567890")), false);
});

// ----------------------------------------------------------------------------
// Verifie que les caracteres excedentaires ne depassent jamais le buffer.
// ----------------------------------------------------------------------------
test("la reponse trop longue conserve seulement ses sept premiers caracteres", () => {
  // Etat obtenu depuis une réponse volontairement trop longue.
  const state = readResponse("#1234567890");
  assert.equal(state.length, CHEERLIGHTS_RESPONSE_CAPACITY);
  assert.equal(state.characters.join(""), "#123456");
});

// ----------------------------------------------------------------------------
// Verifie le parsing RGB historique sur des valeurs representatives.
// ----------------------------------------------------------------------------
test("le parsing CheerLights conserve les canaux RGB", () => {
  assert.deepEqual(parseResponseColor(readResponse("#000000")), [0, 0, 0]);
  assert.deepEqual(parseResponseColor(readResponse("#800080")), [128, 0, 128]);
  assert.deepEqual(parseResponseColor(readResponse("#FFFFFF")), [255, 255, 255]);
});

// ----------------------------------------------------------------------------
// Verifie la suppression des objets et temporaires String actifs.
// ----------------------------------------------------------------------------
test("CheerLights ne contient plus de chaine dynamique applicative", () => {
  // Etat global portant les constantes et le buffer HTTP.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  // Implementation réseau active de CheerLights.
  const cheerSource = fs.readFileSync(
    path.join(firmwareRoot, "src/network/cheerlights.cpp"),
    "utf8",
  );
  assert.doesNotMatch(legacyState, /String hostname|String response/u);
  assert.doesNotMatch(cheerSource, /response\.concat|String\s*\(/u);
  assert.match(legacyState, /const char CHEERLIGHTS_HOST\[\]/u);
  assert.match(legacyState, /char cheerLightsResponse\[CHEERLIGHTS_RESPONSE_CAPACITY\]/u);
  assert.match(legacyState, /sizeof\(cheerLightsResponse\) == 8/u);
});

// ----------------------------------------------------------------------------
// Verifie les constantes de protocole et temporisation historiques.
// ----------------------------------------------------------------------------
test("CheerLights conserve son endpoint et ses delais", () => {
  // Etat global contenant les constantes HTTP inspectées.
  const legacyState = fs.readFileSync(
    path.join(firmwareRoot, "src/core/legacy_state.h"),
    "utf8",
  );
  assert.match(legacyState, /CHEERLIGHTS_POLLING_INTERVAL = 3000/u);
  assert.match(legacyState, /CHEERLIGHTS_RESPONSE_TIMEOUT = 500/u);
  assert.match(legacyState, /CHEERLIGHTS_HTTP_PORT = 80/u);
  assert.match(legacyState, /"api\.thingspeak\.com"/u);
  assert.match(legacyState, /"\/channels\/1417\/field\/2\/last\.txt"/u);
});
