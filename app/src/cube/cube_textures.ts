// ============================================================================
// CubeTextures - Textures dessinees du cube L3D (LED, serigraphie, gravure)
// ----------------------------------------------------------------------------
// Toutes les textures sont peintes sur canvas a partir des photos du cube reel
// et des plans officiels : face de la LED WS2812B 5050, serigraphie blanche des
// barrettes noires (D1 a D8, J1) et gravure laser des panneaux en acrylique.
// Ce fichier ne connait ni la scene ni l'emulateur.
// ============================================================================

import * as THREE from "three/webgpu";

type Point = [number, number];

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const context = element.getContext("2d");
  if (context === null) throw new Error("Canvas 2D indisponible.");
  return [element, context];
}

function toTexture(element: HTMLCanvasElement, colour = true): THREE.CanvasTexture {
  const map = new THREE.CanvasTexture(element);
  map.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.anisotropy = 8;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  return map;
}

// ----------------------------------------------------------------------------
// Face avant d'une WS2812B : boitier blanc, lentille ronde en resine, cadre de
// connexion en trois secteurs, trois puces (rouge, verte, bleue) et le circuit
// de commande. Retour : couleur et masque d'emission (la lentille).
// ----------------------------------------------------------------------------
export function ledFaceTextures(): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
  const size = 256;
  const [element, g] = canvas(size, size);
  g.fillStyle = "#f3f1ea";
  g.fillRect(0, 0, size, size);
  // Liseré plus sombre du moulage, coins legerement casses.
  g.strokeStyle = "rgba(120,115,105,0.45)";
  g.lineWidth = 6;
  g.strokeRect(3, 3, size - 6, size - 6);
  const c = size / 2;
  const r = size * 0.43;
  // Cavite : resine laiteuse sur un fond reflechissant.
  const cavity = g.createRadialGradient(c, c * 0.95, r * 0.1, c, c, r);
  cavity.addColorStop(0, "#e9e6e3");
  cavity.addColorStop(0.75, "#cfcac6");
  cavity.addColorStop(1, "#a9a39d");
  g.fillStyle = cavity;
  g.beginPath();
  g.arc(c, c, r, 0, Math.PI * 2);
  g.fill();
  // Cadre de connexion : trois secteurs separes par des fentes sombres en Y.
  g.strokeStyle = "rgba(95,88,82,0.75)";
  g.lineWidth = 7;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(c, c - r * 0.95);
  g.lineTo(c, c);
  g.lineTo(c - r * 0.85, c + r * 0.5);
  g.moveTo(c, c);
  g.lineTo(c + r * 0.2, c + r * 0.95);
  g.stroke();
  // Puces et fils d'or.
  const chip = (x: number, y: number, w: number, colour: string) => {
    g.fillStyle = colour;
    g.fillRect(c + x - w / 2, c + y - w / 2, w, w);
  };
  chip(-6, -28, 20, "#5a3a33");
  chip(-36, 14, 13, "#6b5a3c");
  chip(24, 6, 13, "#4c5462");
  chip(4, 34, 11, "#5f6672");
  g.strokeStyle = "rgba(200,170,90,0.6)";
  g.lineWidth = 1.5;
  for (const [x0, y0, x1, y1] of [[-6, -28, -40, -60], [-36, 14, -70, 30], [24, 6, 60, -20], [4, 34, 30, 70]]) {
    g.beginPath();
    g.moveTo(c + x0, c + y0);
    g.quadraticCurveTo(c + (x0 + x1) / 2, c + Math.min(y0, y1) - 10, c + x1, c + y1);
    g.stroke();
  }
  // Masque d'emission : la lentille entiere, plus forte au centre.
  const [glowElement, m] = canvas(size, size);
  m.fillStyle = "#000";
  m.fillRect(0, 0, size, size);
  const spot = m.createRadialGradient(c, c, 0, c, c, r);
  spot.addColorStop(0, "#fff");
  spot.addColorStop(0.55, "#d8d8d8");
  spot.addColorStop(0.95, "#7a7a7a");
  spot.addColorStop(1, "#000");
  m.fillStyle = spot;
  m.beginPath();
  m.arc(c, c, r, 0, Math.PI * 2);
  m.fill();
  return { map: toTexture(element), glow: toTexture(glowElement, false) };
}

// ----------------------------------------------------------------------------
// Serigraphie d'une barrette (repere mm du contour, origine au bas, x centre) :
// « J1 » au-dessus du connecteur, « D1 » a « D8 » sous chaque LED, a la verticale.
// Retour : texture et transformation UV (les UV de l'extrusion sont en mm).
// ----------------------------------------------------------------------------
export function stickSilkscreen(length: number, leds: Point[], header: Point): THREE.CanvasTexture {
  const scale = 16;
  const width = 8;
  const [element, g] = canvas(width * scale, Math.ceil(length * scale));
  const X = (x: number) => (x + width / 2) * scale;
  const Y = (y: number) => element.height - y * scale;
  g.fillStyle = "#0b0b0c";
  g.fillRect(0, 0, element.width, element.height);
  g.fillStyle = "#e9e9e4";
  g.font = `bold ${1.15 * scale}px "Consolas", "Courier New", monospace`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const vertical = (text: string, x: number, y: number) => {
    g.save();
    g.translate(X(x), Y(y));
    g.rotate(Math.PI / 2);
    g.fillText(text, 0, 0);
    g.restore();
  };
  leds.forEach(([x, y], index) => vertical(`D${index + 1}`, x + 0.2, y - 5.4));
  g.fillText("J1", X(header[0] - 1.6), Y(header[1] + 3));
  // Pastilles du connecteur J1 (2 x 2 au pas de 2,54 mm), etamees.
  g.fillStyle = "#b9b4a6";
  for (const dx of [-1.27, 1.27]) for (const dy of [-1.27, 1.27]) {
    g.beginPath();
    g.arc(X(header[0] + dx), Y(header[1] + dy), 0.75 * scale, 0, Math.PI * 2);
    g.fill();
  }
  const map = toTexture(element);
  map.repeat.set(1 / width, 1 / length);
  map.offset.set(0.5, 0);
  return map;
}

// ----------------------------------------------------------------------------
// Gravure laser (repere mm du panneau) : contours remplis en pair-impair, ce qui
// donne les lettres evidees de « L3D » et le texte plein, comme sur le cube.
// Retour : texture blanche sur fond transparent et rectangle couvert, en mm.
// ----------------------------------------------------------------------------
export function engravingTexture(loops: Point[][]): { map: THREE.CanvasTexture; box: { x0: number; y0: number; x1: number; y1: number } } {
  const points = loops.flat();
  const margin = 1;
  const box = {
    x0: Math.min(...points.map((p) => p[0])) - margin,
    y0: Math.min(...points.map((p) => p[1])) - margin,
    x1: Math.max(...points.map((p) => p[0])) + margin,
    y1: Math.max(...points.map((p) => p[1])) + margin,
  };
  const scale = Math.min(32, 4096 / (box.x1 - box.x0));
  const [element, g] = canvas(Math.ceil((box.x1 - box.x0) * scale), Math.ceil((box.y1 - box.y0) * scale));
  const path = new Path2D();
  for (const loop of loops) {
    loop.forEach(([x, y], index) => {
      const px = (x - box.x0) * scale;
      const py = element.height - (y - box.y0) * scale;
      if (index === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    });
    path.closePath();
  }
  g.fillStyle = "#fff";
  g.fill(path, "evenodd");
  return { map: toTexture(element), box };
}
