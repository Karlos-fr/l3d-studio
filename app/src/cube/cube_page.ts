// ============================================================================
// CubePage - Page « cube virtuel » : le cube L3D en 3D, pilote par le studio
// ----------------------------------------------------------------------------
// Rend le modele photographique du cube (cube_model.ts) sur fond noir avec
// Three.js WebGPU : reflets d'un studio photo, ombres douces, halo des LED.
// Le vrai firmware tourne dans emulator_worker.ts et allume les LED ; le studio
// s'y connecte avec l'adresse « cube-virtuel » (meme navigateur, meme origine).
// La souris fait tourner la camera autour du cube, la molette rapproche.
// ============================================================================

import * as THREE from "three/webgpu";
import { float, pass, reflector, smoothstep, uv } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildCube } from "./cube_model";
import type { PhotonSignal, WorkerInit, WorkerOut } from "./emulator_worker";
import { photonLedColour } from "./photon_led";

const EEPROM_KEY = "l3d-studio:cube-eeprom";
const ROOM_LIGHT_KEY = "l3d-studio:cube-room-light";

// ----------------------------------------------------------------------------
// Demarre le Photon virtuel et transmet chaque image de LED.
// ----------------------------------------------------------------------------
function startEmulator(onFrame: (rgb: Uint8Array) => void, onSignal: (signal: PhotonSignal) => void): void {
  const worker = new Worker(new URL("./emulator_worker.ts", import.meta.url), { type: "module", name: "l3d-virtual-cube" });
  worker.onmessage = (event: MessageEvent<WorkerOut>) => {
    const message = event.data;
    if (message.kind === "frame") onFrame(message.rgb);
    else if (message.kind === "led") onSignal(message.signal);
    else if (message.kind === "eeprom") {
      try { localStorage.setItem(EEPROM_KEY, btoa(String.fromCharCode(...message.bytes))); } catch { /* stockage indisponible */ }
    }
  };
  let eeprom: Uint8Array | null = null;
  try {
    const saved = localStorage.getItem(EEPROM_KEY);
    if (saved !== null) eeprom = Uint8Array.from(atob(saved), (char) => char.charCodeAt(0));
  } catch { eeprom = null; }
  const emulatorUrl = new URL(`${import.meta.env.BASE_URL}emulator/l3d-emulator.mjs`, location.href).href;
  const init: WorkerInit = { kind: "init", emulatorUrl, eeprom, autostart: true };
  worker.postMessage(init);
}

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#cube");
  if (canvas === null) return;
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  await renderer.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  // Reflets d'un studio photo sur l'acrylique, sans eclairer le fond.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  camera.position.set(0.2, 0.24, 0.66);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.118, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 0.32;
  controls.maxDistance = 1.3;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  // Lumiere principale douce au-dessus a gauche, contre-jour froid derriere.
  const key = new THREE.SpotLight(0xfff4e6, 9, 2.5, Math.PI / 7, 0.8, 1.6);
  key.position.set(-0.45, 0.85, 0.55);
  key.target.position.set(0, 0.1, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0002;
  const rim = new THREE.DirectionalLight(0xbfd6ff, 0.9);
  rim.position.set(0.6, 0.5, -0.8);
  const ambient = new THREE.AmbientLight(0xffffff, 0.04);
  scene.add(key, key.target, rim, ambient);
  // Lumiere de la piece reglable de 0 a 100 % : dans le noir, seules les LED restent.
  const dimmer = document.querySelector<HTMLInputElement>("#room-light");
  const dimmerValue = document.querySelector<HTMLOutputElement>("#room-light-value");
  const applyRoomLight = (percent: number) => {
    const f = Math.max(0, Math.min(100, percent)) / 100;
    key.intensity = 9 * f;
    rim.intensity = 0.9 * f;
    ambient.intensity = 0.04 * f;
    scene.environmentIntensity = 0.22 * f;
    if (dimmerValue !== null) dimmerValue.textContent = `${Math.round(f * 100)} %`;
  };
  let roomLight = 100;
  try { roomLight = Number(localStorage.getItem(ROOM_LIGHT_KEY) ?? 100); } catch { roomLight = 100; }
  if (!Number.isFinite(roomLight)) roomLight = 100;
  if (dimmer !== null) {
    dimmer.value = String(roomLight);
    dimmer.addEventListener("input", () => {
      applyRoomLight(Number(dimmer.value));
      try { localStorage.setItem(ROOM_LIGHT_KEY, dimmer.value); } catch { /* stockage indisponible */ }
    });
  }
  applyRoomLight(roomLight);

  // Sol noir laque : il ne recoit aucune lumiere et ne montre que le reflet du cube, fondu vers le noir.
  const mirror = reflector({ resolutionScale: 0.6 });
  mirror.target.rotateX(-Math.PI / 2);
  scene.add(mirror.target);
  const floorMaterial = new THREE.MeshBasicNodeMaterial();
  const fade = float(1).sub(smoothstep(float(0.04), float(0.3), uv().sub(0.5).length()));
  floorMaterial.colorNode = mirror.rgb.mul(0.16).mul(fade);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const cube = buildCube();
  scene.add(cube.group);
  // LED d'etat du Photon : motif du signal en cours, rejoue a chaque image.
  let signal: PhotonSignal = "off";
  let signalStart = performance.now();
  startEmulator((rgb) => cube.setLeds(rgb), (next) => {
    signal = next;
    signalStart = performance.now();
  });

  // Rendu multi-echantillonne puis halo des LED.
  const pipeline = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera, { samples: 4 });
  const colour = scenePass.getTextureNode("output");
  pipeline.outputNode = colour.add(bloom(colour, 1.25, 0.55, 1.0));

  function resize(): void {
    const width = canvas!.clientWidth;
    const height = canvas!.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  renderer.setAnimationLoop(() => {
    controls.update();
    const [r, g, b] = photonLedColour(signal, performance.now() - signalStart);
    cube.setStatusLed(r, g, b);
    pipeline.render();
  });
  document.body.dataset.state = "ready";
}

main().catch((error: unknown) => {
  document.body.dataset.state = "failed";
  const message = document.querySelector("#message");
  if (message !== null) message.textContent = error instanceof Error ? error.message : "Rendu 3D indisponible.";
});
