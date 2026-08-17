// ============================================================================
// Phase8CooperativeScheduler - Tests hote de l'ordonnanceur cooperatif
// ----------------------------------------------------------------------------
// Ce fichier verifie les frontieres de changement de mode et les attentes
// servies. Il ne simule pas la pile reseau de Particle Device OS.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Valeur maximale d'un compteur millis non signe sur Photon.
const UINT32_MAX = 0xFFFFFFFF;

// Repertoire absolu contenant les tests hote.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspectee.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Charge un fichier source du firmware.
//
// Parametres :
// - relativePath : chemin relatif depuis firmware.
//
// Retour :
// - contenu UTF-8 du fichier demande.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  return fs.readFileSync(path.join(firmwareRoot, relativePath), "utf8");
}

// ----------------------------------------------------------------------------
// Reproduit la soustraction uint32 utilisee apres un debordement de millis.
//
// Parametres :
// - current : valeur courante du compteur.
// - started : valeur capturee au debut de l'attente.
//
// Retour :
// - duree ecoulee modulo 2 puissance 32.
// ----------------------------------------------------------------------------
function elapsedMillis(current, started) {
  return (current - started) >>> 0;
}

// ----------------------------------------------------------------------------
// Verifie l'ordre begin, rendu, finish autour de chaque cycle principal.
// ----------------------------------------------------------------------------
test("la boucle applique les changements differes apres le rendu", () => {
  // Point d'entree qui encadre demo et animationTick.
  const mainSource = readFirmwareSource("src/main.cpp");
  // Position du debut de cycle.
  const beginOffset = mainSource.indexOf("animationSchedulerBeginCycle();");
  // Position du choix de rendu.
  const renderOffset = mainSource.indexOf("if(demo) { runDemo(); }");
  // Position de la fin de cycle.
  const finishOffset = mainSource.indexOf("animationSchedulerFinishCycle();");
  assert.ok(beginOffset >= 0);
  assert.ok(beginOffset < renderOffset);
  assert.ok(renderOffset < finishOffset);
});

// ----------------------------------------------------------------------------
// Verifie qu'un callback ne remplace jamais l'etat partage en cours d'usage.
// ----------------------------------------------------------------------------
test("setNewMode differe une demande recue pendant Particle.process", () => {
  // Parseur contenant l'unique changement de mode public.
  const parser = readFirmwareSource("src/cloud/command_parser.cpp");
  // Ordonnanceur qui conserve la derniere demande Cloud.
  const scheduler = readFirmwareSource("src/core/animation_scheduler.cpp");
  assert.match(
    parser,
    /if\(animationSchedulerDeferModeChange\(newModeIndex\)\)[\s\S]*return newModeIndex;/u,
  );
  assert.match(scheduler, /animationPendingModeIndex = modeIndex;/u);
  assert.match(scheduler, /stop = TRUE;[\s\S]*stopDemo = TRUE;/u);
  assert.match(
    scheduler,
    /animationCycleActive = FALSE;[\s\S]*setNewMode\(modeIndex\);/u,
  );
});

// ----------------------------------------------------------------------------
// Verifie qu'un nom inconnu ne lit jamais modeStruct avec l'index moins un.
// ----------------------------------------------------------------------------
test("SetMode protege le registre avant de lire le mode demande", () => {
  // Parseur qui conserve le mode courant lorsque la recherche echoue.
  const parser = readFirmwareSource("src/cloud/command_parser.cpp");
  assert.match(
    parser,
    /requestedModeIndex >= 0[\s\S]*modeStruct\[requestedModeIndex\]\.modeId[\s\S]*: currentModeID/u,
  );
});

// ----------------------------------------------------------------------------
// Verifie les attentes cooperatives et la securite au debordement de millis.
// ----------------------------------------------------------------------------
test("les attentes servent Particle et supportent le debordement de millis", () => {
  // Implementation de l'attente commune a tous les modules du unity build.
  const scheduler = readFirmwareSource("src/core/animation_scheduler.cpp");
  assert.match(
    scheduler,
    /static_cast<uint32_t>\(millis\(\) - startedAt\) < durationMillis/u,
  );
  assert.match(scheduler, /ANIMATION_CLOUD_SERVICE_INTERVAL_MS = 20UL/u);
  assert.match(
    scheduler,
    /animationCloudCallbackWindow = TRUE;\s*Particle\.process\(\);/u,
  );
  assert.match(scheduler, /delay\(waitSliceMillis\);/u);
  assert.equal(elapsedMillis(3, UINT32_MAX - 4), 8);
  assert.equal(elapsedMillis(120, 100), 20);
});

// ----------------------------------------------------------------------------
// Verifie que tous les modules historiques utilisent l'adaptateur cooperatif.
// ----------------------------------------------------------------------------
test("le unity build redirige ses delay vers l'ordonnanceur", () => {
  // Assemblage qui place la macro uniquement autour des anciens modules.
  const mainSource = readFirmwareSource("src/main.cpp");
  // Dispatcher inclus sous la redirection cooperative.
  const runtimeInclude = '#include "core/mode_runtime.cpp"';
  assert.match(
    mainSource,
    /#define delay\(durationMillis\) animationCooperativeDelay\(durationMillis\)/u,
  );
  assert.ok(mainSource.indexOf("#define delay") < mainSource.indexOf(runtimeInclude));
  assert.ok(mainSource.indexOf(runtimeInclude) < mainSource.indexOf("#undef delay"));
});

// ----------------------------------------------------------------------------
// Verifie que le timer logiciel ne fait que poser un drapeau simple.
// ----------------------------------------------------------------------------
test("le callback de demonstration reste borne a un drapeau", () => {
  // Runtime contenant advanceDemo et le dispatcher historique.
  const runtime = readFirmwareSource("src/core/mode_runtime.cpp");
  // Corps exact du callback avant la fonction suivante.
  const callback = runtime.slice(
    runtime.indexOf("void advanceDemo()"),
    runtime.indexOf("void runMode()"),
  );
  assert.match(callback, /stopDemo = true;/u);
  assert.doesNotMatch(callback, /Particle|delay|setNewMode|runMode/u);
});

// ----------------------------------------------------------------------------
// Verifie que le switch compact reste le dispatcher de production.
// ----------------------------------------------------------------------------
test("le dispatcher conserve le switch sans registre resident", () => {
  // Runtime dont le switch est optimise directement par le compilateur ARM.
  const runtime = readFirmwareSource("src/core/mode_runtime.cpp");
  assert.match(runtime, /switch \(currentModeID\)/u);
  assert.doesNotMatch(runtime, /ModeTickRegistry|virtual|dynamic_cast/u);
});
