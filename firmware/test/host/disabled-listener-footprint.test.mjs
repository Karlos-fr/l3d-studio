// ============================================================================
// DisabledListenerFootprint - Tests hôte du récepteur UDP optionnel
// ----------------------------------------------------------------------------
// Ce fichier vérifie que Listener ne réserve rien dans le build courant. Il ne
// valide pas le protocole TPM2.net lorsque le mode est réactivé.
// ============================================================================

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Répertoire absolu contenant les tests hôte.
const hostDirectory = path.dirname(fileURLToPath(import.meta.url));

// Racine du projet firmware inspectée par les tests.
const firmwareRoot = path.resolve(hostDirectory, "../..");

// ----------------------------------------------------------------------------
// Charge un fichier source du firmware.
//
// Parametres :
// - relativePath : chemin relatif depuis la racine firmware.
//
// Retour :
// - contenu UTF-8 du fichier demandé.
// ----------------------------------------------------------------------------
function readFirmwareSource(relativePath) {
  return fs.readFileSync(path.join(firmwareRoot, relativePath), "utf8");
}

// ----------------------------------------------------------------------------
// Vérifie que le build courant désactive explicitement Listener.
// ----------------------------------------------------------------------------
test("Listener retire son buffer UDP du build actif", () => {
  // Configuration centrale des capacités optionnelles.
  const buildConfig = readFirmwareSource("src/config/build_config.h");
  // État historique contenant le buffer TPM2.net.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  // Implémentation du récepteur UDP.
  const listenerSource = readFirmwareSource("src/network/udp_listener.cpp");
  // Reset partagé susceptible de référencer le socket.
  const runtimeSource = readFirmwareSource("src/core/mode_runtime.cpp");

  assert.match(buildConfig, /#define L3D_LISTENER_ENABLED 0/u);
  assert.match(
    legacyState,
    /#if L3D_LISTENER_ENABLED[\s\S]*char listenerData\[CUBE_PACKET_SIZE\];[\s\S]*#endif/u,
  );
  assert.match(
    listenerSource,
    /#if defined\(L3D_UNITY_BUILD\) && L3D_LISTENER_ENABLED/u,
  );
  assert.match(
    runtimeSource,
    /#if L3D_LISTENER_ENABLED[\s\S]*case LISTENER:[\s\S]*#endif/u,
  );
});

// ----------------------------------------------------------------------------
// Vérifie que Listener reste absent du registre et du dispatcher actifs.
// ----------------------------------------------------------------------------
test("Listener reste inaccessible tant que son drapeau vaut zéro", () => {
  // Registre historique où la ligne Listener doit rester commentée.
  const legacyState = readFirmwareSource("src/core/legacy_state.h");
  // Dispatcher où l'appel de listen doit rester commenté.
  const runtimeSource = readFirmwareSource("src/core/mode_runtime.cpp");

  assert.match(legacyState, /\/\/\s*\{\s*LISTENER,/u);
  assert.match(
    runtimeSource,
    /\/\*\s*case LISTENER:[\s\S]*listen\(\);[\s\S]*break;\*\//u,
  );
});
