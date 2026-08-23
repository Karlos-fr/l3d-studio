// ============================================================================
// WebStreaming - Tests hote du recepteur de frames web
// ----------------------------------------------------------------------------
// Ces tests figent le format RGB332, l'absence de buffer supplementaire et les
// frontieres du mode Stream sans simuler le pilote NeoPixel complet.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Racine du firmware inspectee par les assertions de structure.
const firmwareRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ----------------------------------------------------------------------------
// Lit un fichier source du firmware.
//
// Parametres :
// - relativePath : chemin sous la racine firmware.
//
// Retour :
// - contenu UTF-8 complet.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  return fs.readFileSync(path.join(firmwareRoot, relativePath), "utf8");
}

// ----------------------------------------------------------------------------
// Etend une composante RGB332 comme le recepteur embarque.
//
// Parametres :
// - packedColor : octet RRR GGG BB.
//
// Retour :
// - triplet RGB888 attendu.
// ----------------------------------------------------------------------------
function decodeRgb332(packedColor) {
  const red = packedColor >> 5;
  const green = (packedColor >> 2) & 7;
  const blue = packedColor & 3;
  return [
    (red << 5) | (red << 2) | (red >> 1),
    (green << 5) | (green << 2) | (green >> 1),
    blue * 85,
  ];
}

test("le mode Stream conserve l'ID 76 et Listener reste archive", () => {
  const identifiers = readFirmwareSource("src/config/mode_ids.h");
  const state = readFirmwareSource("src/core/legacy_state.h");
  const buildConfig = readFirmwareSource("src/config/build_config.h");
  assert.match(identifiers, /#define STREAM\s+76\b/u);
  assert.match(state, /\{\s+STREAM,\s+"Stream",\s+0,\s+0,\s+FALSE/u);
  assert.match(state, /\/\/\s*\{\s+LISTENER/u);
  assert.match(buildConfig, /#define L3D_LISTENER_ENABLED 0/u);
});

test("les routes streaming et peinture partagent le rendu de 512 octets binaires", () => {
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  const receiver = readFirmwareSource("src/network/stream_frames.cpp");
  assert.match(server, /"\/api\/v1\/stream\/frame"/u);
  assert.match(server, /"\/api\/v1\/painter\/frame"/u);
  assert.match(server, /!localApiParser\.contentTypeBinary/u);
  assert.match(
    server,
    /contentTypeBinary[\s\S]*?"\/api\/v1\/stream\/frame"\) != 0[\s\S]*?"\/api\/v1\/painter\/frame"\) != 0/u,
  );
  assert.match(server, /localApiParser\.bodyLength != STREAM_FRAME_BYTES/u);
  assert.match(server, /localApiRouteRgb332Frame\(bool holdFrame\)/u);
  assert.match(server, /streamApplyFrame\([\s\S]*?localApiParser\.body[\s\S]*?holdFrame/u);
  assert.match(server, /localApiRouteRgb332Frame\(holdFrame\)/u);
  assert.match(
    server,
    /localApiCommandActive = true;[\s\S]*?streamApplyFrame\([\s\S]*?localApiCommandActive = false;/u,
    "le rendu d'une frame ne doit pas reentrer recursivement dans le serveur LAN",
  );
  assert.match(receiver, /for\(uint8_t z[\s\S]*?for\(uint8_t y[\s\S]*?for\(uint8_t x/u);
  assert.equal((receiver.match(/showPixels\(\);/gu) ?? []).length, 3);
  assert.doesNotMatch(receiver, /static\s+(?:uint8_t|char)\s+\w+\s*\[\s*512/u);
  assert.doesNotMatch(receiver, /\b(?:malloc|calloc|realloc|new)\b/u);
});

test("le decodeur RGB332 couvre noir, blanc et couleurs primaires", () => {
  assert.deepEqual(decodeRgb332(0x00), [0, 0, 0]);
  assert.deepEqual(decodeRgb332(0xff), [255, 255, 255]);
  assert.deepEqual(decodeRgb332(0xe0), [255, 0, 0]);
  assert.deepEqual(decodeRgb332(0x1c), [0, 255, 0]);
  assert.deepEqual(decodeRgb332(0x03), [0, 0, 255]);
});

test("le streaming expire mais une frame de peinture reste affichee", () => {
  const receiver = readFirmwareSource("src/network/stream_frames.cpp");
  const server = readFirmwareSource("src/network/local_api_server.cpp");
  const lifecycle = readFirmwareSource("src/core/animation_lifecycle.cpp");
  const dispatch = readFirmwareSource("src/core/command_dispatch.cpp");
  const runtime = readFirmwareSource("src/core/mode_runtime.cpp");
  assert.match(receiver, /STREAM_FRAME_TIMEOUT_MS/u);
  assert.match(receiver, /static bool streamFrameHeld = false;/u);
  assert.match(receiver, /streamFrameHeld = holdFrame;/u);
  assert.match(receiver, /void streamTick\(void\) \{\s*if\(streamFrameHeld\)\s*return;/u);
  assert.match(server, /"\/api\/v1\/painter\/frame"\) == 0;[\s\S]*?localApiRouteRgb332Frame\(holdFrame\)/u);
  assert.match(receiver, /void streamEnter\(void\) \{[\s\S]*?run = TRUE;/u);
  assert.match(receiver, /void streamEnter\(void\) \{[\s\S]*?streamFrameHeld = false;/u);
  assert.match(receiver, /void streamExit\(void\) \{\s*streamFrameHeld = false;/u);
  assert.match(receiver, /getModeIndexFromID\(STANDBY\)/u);
  assert.match(lifecycle, /modeId == STREAM[\s\S]*?streamExit\(\)/u);
  assert.match(dispatch, /currentModeID != STREAM[\s\S]*?EEPROM\.write\(LASTMODE_START_ADDR/u);
  assert.match(runtime, /selectedModeID == STREAM/u);
});
