// ============================================================================
// Phase7NoDynamicAllocation - Tests hote des allocations applicatives
// ----------------------------------------------------------------------------
// Ce fichier interdit les conteneurs, allocations et sous-chaines dynamiques
// dans le firmware applicatif. Le pilote NeoPixel est controle separement.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine des sources du firmware inspectees.
const sourceRoot = path.resolve(hostDirectory, "../../src");

// ----------------------------------------------------------------------------
// Retourne recursivement les fichiers C++ et en-tetes d'un repertoire.
//
// Parametres :
// - directory : repertoire a parcourir.
//
// Retour :
// - chemins absolus tries des sources trouvees.
// ----------------------------------------------------------------------------
function listSources(directory) {
  // Collection construite sans callback implicite afin de garder le test lisible.
  const sources = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    // Chemin absolu de l'entree courante.
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      sources.push(...listSources(entryPath));
    } else if (/\.(?:cpp|h)$/u.test(entry.name)) {
      sources.push(entryPath);
    }
  }
  return sources.sort();
}

// ----------------------------------------------------------------------------
// Retire les commentaires afin de controler uniquement le code actif.
//
// Parametres :
// - source : contenu C++ complet.
//
// Retour :
// - contenu sans commentaires de ligne ni de bloc.
// ----------------------------------------------------------------------------
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/.*$/gmu, "");
}

// ----------------------------------------------------------------------------
// Verifie l'absence des allocations interdites hors pilote NeoPixel.
// ----------------------------------------------------------------------------
test("le code applicatif ne contient plus d'allocation dynamique", () => {
  // Sources applicatives, le pilote materiel etant exclu explicitement.
  const applicationSources = [];
  for (const sourcePath of listSources(sourceRoot)) {
    if (!sourcePath.endsWith(path.join("platform", "neopixel.cpp"))) {
      applicationSources.push(sourcePath);
    }
  }
  // Motifs interdits par le critere de sortie de la phase 7.
  const forbiddenPattern = /\b(?:std::vector|std::string|vector\s*<|new\s+|malloc\s*\(|realloc\s*\()/u;
  for (const sourcePath of applicationSources) {
    // Code actif du fichier courant.
    const activeSource = stripComments(fs.readFileSync(sourcePath, "utf8"));
    assert.doesNotMatch(activeSource, forbiddenPattern, sourcePath);
  }
});

// ----------------------------------------------------------------------------
// Verifie que les commandes Cloud ne creent plus de sous-chaines temporaires.
// ----------------------------------------------------------------------------
test("le parseur Cloud travaille directement sur le buffer Particle", () => {
  // Adaptateurs Particle des commandes historiques.
  const parser = fs.readFileSync(
    path.join(sourceRoot, "cloud/command_parser.cpp"),
    "utf8",
  );
  // Coeur metier independant de Particle et des String.
  const dispatch = fs.readFileSync(
    path.join(sourceRoot, "core/command_dispatch.cpp"),
    "utf8",
  );
  assert.doesNotMatch(stripComments(dispatch), /\.(?:substring|charAt|indexOf|trim|toUpperCase)\s*\(/u);
  assert.doesNotMatch(parser, /FnRouter\(tempBuf\)|SetText\(""\)|GetDiagnostics\("/u);
  assert.match(parser, /setModeFromBuffer\(command\.c_str\(\), command\.length\(\)\)/u);
  assert.match(parser, /routeCommandFromBuffer\(command\.c_str\(\), command\.length\(\)\)/u);
  assert.match(parser, /setTextFromBuffer\(command\.c_str\(\), command\.length\(\)\)/u);
  assert.match(dispatch, /boundedTextCopyRange\(/u);
  assert.match(dispatch, /parseHexText\(/u);
});

// ----------------------------------------------------------------------------
// Verifie que String reste limite aux signatures imposees par Particle Cloud.
// ----------------------------------------------------------------------------
test("String reste uniquement aux quatre frontieres Cloud", () => {
  // Toutes les sources afin de compter les definitions de callbacks Particle.
  let definitions = "";
  for (const sourcePath of listSources(sourceRoot)) {
    if (sourcePath.endsWith(".cpp")) {
      definitions += `${fs.readFileSync(sourcePath, "utf8")}\n`;
    }
  }
  // Signatures autorisees : les quatre callbacks imposes par Particle.
  const stringSignatures = [...definitions.matchAll(
    /(?:SetMode\(String|FnRouter\(String|SetText\(String|CubePainter\(String)/gu,
  )];
  assert.equal(stringSignatures.length, 4);
  assert.doesNotMatch(
    stripComments(definitions),
    /\bString\s+[A-Za-z_][A-Za-z0-9_]*\s*[=;]/u,
  );
});

// ----------------------------------------------------------------------------
// Verifie que l'allocation NeoPixel est unique, durable et sans reallocation.
// ----------------------------------------------------------------------------
test("le pilote NeoPixel conserve sa seule allocation materielle", () => {
  // Pilote local dont le framebuffer depend du nombre de LED configure.
  const neopixel = fs.readFileSync(
    path.join(sourceRoot, "platform/neopixel.cpp"),
    "utf8",
  );
  assert.equal((neopixel.match(/malloc\s*\(/gu) ?? []).length, 1);
  assert.equal((neopixel.match(/free\s*\(/gu) ?? []).length, 1);
  assert.doesNotMatch(neopixel, /realloc\s*\(/u);
});
