// ============================================================================
// CommandTransportSeparation - Tests hote des frontieres de commandes
// ----------------------------------------------------------------------------
// Ce fichier verifie que Particle ne porte plus la logique metier et que les
// entrees a buffers fixes restent bornees avant tout effet de bord.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspectee.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Charge un fichier source du firmware.
//
// Parametres :
// - relativePath : chemin relatif depuis la racine firmware.
//
// Retour :
// - contenu UTF-8 du fichier demande.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  return fs.readFileSync(path.join(firmwareRoot, relativePath), "utf8");
}

// ----------------------------------------------------------------------------
// Retire les commentaires avant de rechercher une dependance active.
//
// Parametres :
// - source : contenu C++ complet.
//
// Retour :
// - contenu prive de ses commentaires de ligne et de bloc.
// ----------------------------------------------------------------------------
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/.*$/gmu, "");
}

// ----------------------------------------------------------------------------
// Extrait le corps textuel d'une fonction C++ delimitee par la suivante.
//
// Parametres :
// - source : module C++ inspecte.
// - signature : signature de debut recherchee.
// - nextSignature : signature suivant immediatement la fonction.
//
// Retour :
// - tranche source contenant la fonction.
// ----------------------------------------------------------------------------
function extractFunction(source, signature, nextSignature) {
  const begin = source.indexOf(signature);
  const end = source.indexOf(nextSignature, begin + signature.length);
  assert.ok(begin >= 0, `${signature} doit exister`);
  assert.ok(end > begin, `${nextSignature} doit suivre ${signature}`);
  return source.slice(begin, end);
}

// ----------------------------------------------------------------------------
// Verifie que chaque callback Particle delegue sans logique intermediaire.
// ----------------------------------------------------------------------------
test("les quatre callbacks Particle sont de simples adaptateurs", () => {
  const cloud = readFirmwareSource("src/cloud/command_parser.cpp");
  const painter = readFirmwareSource("src/animations/cube_painter.cpp");
  assert.match(
    cloud,
    /int SetMode\(String command\) \{\s*return setModeFromBuffer\(command\.c_str\(\), command\.length\(\)\);\s*\}/u,
  );
  assert.match(
    cloud,
    /int FnRouter\(String command\) \{\s*return routeCommandFromBuffer\(command\.c_str\(\), command\.length\(\)\);\s*\}/u,
  );
  assert.match(
    cloud,
    /int SetText\(String command\) \{\s*return setTextFromBuffer\(command\.c_str\(\), command\.length\(\)\);\s*\}/u,
  );
  assert.match(
    painter,
    /int CubePainter\(String command\) \{\s*return cubePainterFromBuffer\(command\.c_str\(\), command\.length\(\)\);\s*\}/u,
  );
});

// ----------------------------------------------------------------------------
// Verifie que le coeur commun ne depend d'aucun transport.
// ----------------------------------------------------------------------------
test("le coeur des commandes ignore Particle, HTTP et String", () => {
  const dispatch = stripComments(readFirmwareSource("src/core/command_dispatch.cpp"));
  const header = stripComments(readFirmwareSource("src/core/command_dispatch.h"));
  assert.doesNotMatch(dispatch, /\bParticle\b|\bTCP|\bHTTP\b|\bString\b/u);
  assert.doesNotMatch(header, /\bParticle\b|\bTCP|\bHTTP\b|\bString\b/u);
  assert.match(dispatch, /int setModeFromBuffer\(const char\* commandText, size_t commandLength\)/u);
  assert.match(dispatch, /int routeCommandFromBuffer\(const char\* commandText, size_t commandLength\)/u);
  assert.match(dispatch, /int setTextFromBuffer\(const char\* text, size_t textLength\)/u);
});

// ----------------------------------------------------------------------------
// Verifie que SetMode termine sa validation avant son premier effet de bord.
// ----------------------------------------------------------------------------
test("SetMode refuse une commande invalide avant de modifier l'etat", () => {
  const dispatch = readFirmwareSource("src/core/command_dispatch.cpp");
  const body = extractFunction(
    dispatch,
    "int setModeFromBuffer(const char* commandText, size_t commandLength)",
    "int routeCommandFromBuffer(const char* commandText, size_t commandLength)",
  );
  const validation = body.indexOf("validateSetModeBuffer(commandText, commandLength)");
  const rejection = body.indexOf("return validationResult;");
  const firstEffect = body.indexOf("lastCommandReceived = millis();");
  assert.ok(validation >= 0);
  assert.ok(validation < rejection);
  assert.ok(rejection < firstEffect);
});

// ----------------------------------------------------------------------------
// Verifie que CubePainter conserve ses deux passes avant toute ecriture.
// ----------------------------------------------------------------------------
test("CubePainter valide le corps complet avant framebuffer et EEPROM", () => {
  const painter = readFirmwareSource("src/animations/cube_painter.cpp");
  const body = extractFunction(
    painter,
    "int cubePainterFromBuffer(const char* commandText, size_t commandLength)",
    "int CubePainter(String command)",
  );
  const validationEnd = body.indexOf("run = TRUE;");
  const framebufferWrite = body.indexOf("drawingBuffer[voxelOffset] =");
  const eepromWrite = body.indexOf("EEPROM.write(voxelOffset");
  assert.ok(validationEnd >= 0);
  assert.ok(validationEnd < framebufferWrite);
  assert.ok(validationEnd < eepromWrite);
  assert.equal((body.match(/while \(endIndex != -1\)/gu) ?? []).length, 2);
});

// ----------------------------------------------------------------------------
// Verifie les bornes avant les acces persistants des commandes texte.
// ----------------------------------------------------------------------------
test("SetText controle sa longueur avant de lire ou ecrire l'EEPROM", () => {
  const dispatch = readFirmwareSource("src/core/command_dispatch.cpp");
  const body = extractFunction(
    dispatch,
    "int setTextFromBuffer(const char* text, size_t textLength)",
    "int setNewMode(int newModeIndex)",
  );
  const guard = body.indexOf("textLength >= TEXT_LENGTH");
  const rejection = body.indexOf("return COMMAND_ERROR_TOO_LONG;");
  const firstRead = body.indexOf("EEPROM.get(TEXT_START_ADDR");
  assert.ok(guard >= 0);
  assert.ok(guard < rejection);
  assert.ok(rejection < firstRead);
});
