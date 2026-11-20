// ============================================================================
// PhotonModel - Particle Photon v1.0.0 du cube L3D, a l'identique
// ----------------------------------------------------------------------------
// Construit le Photon a partir de son fichier de fabrication Eagle
// (github.com/particle-iot/photon, extrait dans case_data.json par
// scripts/cube-assets.mjs) : circuit noir mat a serigraphie bleue (#00A0E3,
// couleur du composant Fritzing officiel de Particle), etoile Particle en
// cuivre dore a nu, module Wi-Fi P0 sous capot, antenne ceramique ACX, u.FL,
// micro-USB, boutons SETUP et RESET, LED RGB d'etat et barrettes males.
// Repere local : mm du fichier Eagle -> x = x, z = -y ; face composants vers +y,
// circuit entre y = -1 mm et 0. Ce fichier ne connait ni la scene ni le firmware.
// ============================================================================

import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";

type Point = [number, number];
type Text = { text: string; at: Point; size: number; angle: number; align: string };
type Part = { name: string; package: string; value: string; at: Point; angle: number; mirror: boolean; box: [number, number, number, number] };
export type PhotonData = {
  outline: Point[];
  silk: { wires: number[][]; circles: number[][]; rects: Point[][]; texts: Text[] };
  copper: Point[][];
  pins: Point[];
  parts: Part[];
};

const MM = 0.001;
export const PHOTON_PCB = 1.0;
// Barrette male : entretoise de 2,5 mm sous le circuit.
export const PHOTON_SPACER = 2.5;
const SILK = "#00a0e3";
const GOLD = "#d4ad57";

export type PhotonModel = {
  group: THREE.Group;
  // Couleur de la LED d'etat, composantes de 0 a 1.
  setStatus(r: number, g: number, b: number): void;
};

// ----------------------------------------------------------------------------
// Face composants du circuit : epargne noire, serigraphie, cuivre dore a nu
// (etoile, pastilles des broches et demi-trous metallises des bords).
// ----------------------------------------------------------------------------
function boardTexture(data: PhotonData, width: number, height: number): THREE.CanvasTexture {
  const scale = 48;
  const element = document.createElement("canvas");
  element.width = Math.ceil(width * scale);
  element.height = Math.ceil(height * scale);
  const g = element.getContext("2d");
  if (g === null) throw new Error("Canvas 2D indisponible.");
  const X = (x: number) => x * scale;
  const Y = (y: number) => element.height - y * scale;
  g.fillStyle = "#0d0d0e";
  g.fillRect(0, 0, element.width, element.height);
  // Cuivre a nu, finition or.
  g.fillStyle = GOLD;
  for (const polygon of data.copper) {
    g.beginPath();
    polygon.forEach(([x, y], index) => (index === 0 ? g.moveTo(X(x), Y(y)) : g.lineTo(X(x), Y(y))));
    g.closePath();
    g.fill();
  }
  for (const [x, y] of data.pins) {
    g.beginPath();
    g.arc(X(x), Y(y), 0.89 * scale, 0, Math.PI * 2);
    g.fill();
    // Demi-trou metallise sur le chant du circuit.
    const edge = x < width / 2 ? 0 : width;
    g.beginPath();
    g.arc(X(edge), Y(y), 0.55 * scale, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#2a2418";
  for (const [x, y] of data.pins) {
    g.beginPath();
    g.arc(X(x), Y(y), 0.5 * scale, 0, Math.PI * 2);
    g.fill();
  }
  // Serigraphie.
  g.strokeStyle = SILK;
  g.fillStyle = SILK;
  g.lineCap = "round";
  for (const [x1 = 0, y1 = 0, x2 = 0, y2 = 0, w = 0.15] of data.silk.wires) {
    g.lineWidth = Math.max(w, 0.12) * scale;
    g.beginPath();
    g.moveTo(X(x1), Y(y1));
    g.lineTo(X(x2), Y(y2));
    g.stroke();
  }
  for (const [x = 0, y = 0, r = 0, w = 0] of data.silk.circles) {
    g.beginPath();
    g.arc(X(x), Y(y), r * scale, 0, Math.PI * 2);
    if (w === 0) g.fill();
    else { g.lineWidth = w * scale; g.stroke(); }
  }
  for (const rect of data.silk.rects) {
    g.beginPath();
    rect.forEach(([x, y], index) => (index === 0 ? g.moveTo(X(x), Y(y)) : g.lineTo(X(x), Y(y))));
    g.closePath();
    g.fill();
  }
  // Police vectorielle Eagle : la taille est la hauteur des capitales.
  for (const text of data.silk.texts) {
    g.save();
    g.translate(X(text.at[0]), Y(text.at[1]));
    g.rotate((-text.angle * Math.PI) / 180);
    g.font = `600 ${(text.size / 0.72) * scale}px "Consolas", "Lucida Console", monospace`;
    const [vertical = "bottom", horizontal = "left"] = text.align.split("-");
    g.textAlign = horizontal === "right" ? "right" : horizontal === "center" ? "center" : "left";
    g.textBaseline = vertical === "top" ? "top" : vertical === "center" ? "middle" : "alphabetic";
    g.fillText(text.text, 0, 0);
    g.restore();
  }
  const map = new THREE.CanvasTexture(element);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.repeat.set(1 / (width * MM), 1 / (height * MM));
  return map;
}

// Capot du module P0 : aluminium brosse, marquage laser gris (P0, USI, code 2D, etoile).
function moduleTexture(): THREE.CanvasTexture {
  const size = 512;
  const element = document.createElement("canvas");
  element.width = size;
  element.height = size;
  const g = element.getContext("2d");
  if (g === null) throw new Error("Canvas 2D indisponible.");
  g.fillStyle = "#b9bcbf";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i += 1) {
    g.fillStyle = `rgba(${i % 2 ? 255 : 90},${i % 2 ? 255 : 95},${i % 2 ? 255 : 100},0.05)`;
    g.fillRect(0, (i * 7919) % size, size, 1);
  }
  g.fillStyle = "#6f7377";
  // Code 2D deterministe.
  let seed = 7;
  for (let y = 0; y < 18; y += 1) for (let x = 0; x < 18; x += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    if (x === 0 || y === 17 || seed % 2 === 0) g.fillRect(40 + x * 9, 40 + y * 9, 9, 9);
  }
  g.font = "bold 64px Arial, sans-serif";
  g.fillText("P0", 240, 110);
  g.font = "bold 40px Arial, sans-serif";
  g.fillText("USI", 60, 300);
  g.font = "34px Arial, sans-serif";
  g.fillText("BM-09-S", 60, 350);
  g.fillText("2B9004", 60, 395);
  // Etoile Particle.
  g.save();
  g.translate(390, 330);
  g.beginPath();
  for (let k = 0; k < 16; k += 1) {
    const r = k % 2 === 0 ? 64 : 16;
    const a = (k * Math.PI) / 8;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  g.restore();
  g.fillStyle = "#3a3d40";
  g.beginPath();
  g.arc(452, 64, 14, 0, Math.PI * 2);
  g.fill();
  const map = new THREE.CanvasTexture(element);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

// ----------------------------------------------------------------------------
// Construit le Photon avec ses barrettes males, LED d'etat eteinte.
// ----------------------------------------------------------------------------
export function buildPhoton(data: PhotonData): PhotonModel {
  const group = new THREE.Group();
  const xs = data.outline.map((p) => p[0]);
  const ys = data.outline.map((p) => p[1]);
  const width = Math.max(...xs);
  const height = Math.max(...ys);

  const fr4 = new THREE.MeshStandardMaterial({ color: 0x1c1b18, roughness: 0.75 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111112, roughness: 0.5 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9cbce, metalness: 1, roughness: 0.3 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 1, roughness: 0.28 });
  const ceramic = new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.55 });
  const tan = new THREE.MeshStandardMaterial({ color: 0xb39a72, roughness: 0.6 });
  const brown = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.6 });
  const green = new THREE.MeshStandardMaterial({ color: 0x1f5d34, roughness: 0.6 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf08a3c, roughness: 0.6 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x3b3c3e, roughness: 0.55 });

  // Circuit : contour Eagle extrude, face composants serigraphiee.
  const shape = new THREE.Shape(data.outline.map(([x, y]) => new THREE.Vector2(x * MM, y * MM)));
  const pcbGeometry = new THREE.ExtrudeGeometry(shape, { depth: PHOTON_PCB * MM, bevelEnabled: false });
  pcbGeometry.rotateX(-Math.PI / 2);
  pcbGeometry.translate(0, -PHOTON_PCB * MM, 0);
  // Le dessous reste en epargne noire ; la face composants porte la serigraphie.
  const mask = new THREE.MeshPhysicalMaterial({ color: 0x0d0d0e, roughness: 0.62, clearcoat: 0.15, clearcoatRoughness: 0.5, envMapIntensity: 0.6 });
  group.add(new THREE.Mesh(pcbGeometry, [mask, fr4]));
  const faceGeometry = new THREE.ShapeGeometry(shape);
  faceGeometry.rotateX(-Math.PI / 2);
  faceGeometry.translate(0, 0.01 * MM, 0);
  const face = new THREE.MeshPhysicalMaterial({ map: boardTexture(data, width, height), roughness: 0.62, clearcoat: 0.15, clearcoatRoughness: 0.5, envMapIntensity: 0.6 });
  group.add(new THREE.Mesh(faceGeometry, face));

  const box = (w: number, h: number, d: number, material: THREE.Material, x = 0, y = h / 2, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * MM, h * MM, d * MM), material);
    mesh.position.set(x * MM, y * MM, z * MM);
    return mesh;
  };
  // Passif CMS : corps et deux terminaisons etamees.
  const passive = (length: number, w: number, h: number, material: THREE.Material) => {
    const part = new THREE.Group();
    part.add(box(length * 0.64, h, w, material));
    for (const side of [-1, 1]) part.add(box(length * 0.18, h * 1.02, w * 1.02, steel, side * length * 0.41));
    return part;
  };

  // LED RGB d'etat CREE CLMVB-FKA : boitier blanc, lentille diffusante allumee par le systeme.
  const statusColour = uniform(new THREE.Color(0, 0, 0));
  const lens = new THREE.MeshPhysicalNodeMaterial({ color: 0xf4f2ee, roughness: 0.25, clearcoat: 1 });
  lens.emissiveNode = statusColour.mul(14);
  const glow = new THREE.PointLight(0xffffff, 0, 0.09, 2);

  for (const part of data.parts) {
    if (part.mirror || part.package.includes("_BOT")) continue;
    const [x0, y0, x1, y1] = part.box;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const w = x1 - x0;
    const d = y1 - y0;
    let mesh: THREE.Object3D | null = null;
    const pkg = part.package;
    if (pkg === "WM-N-BM-09") {
      mesh = new THREE.Group();
      mesh.add(box(w, 0.55, d, green, cx, 0.275, -cy));
      const can = box(w - 0.5, 1.25, d - 0.5, [steel, steel, new THREE.MeshStandardMaterial({ map: moduleTexture(), metalness: 0.85, roughness: 0.38 }), steel, steel, steel] as unknown as THREE.Material, cx, 0.55 + 0.625, -cy);
      // Marquage lu dans le sens de la carte, comme sur le Photon.
      can.rotation.y = -Math.PI / 2;
      mesh.add(can);
    } else if (pkg === "USB-MICROB-SLOT-HOLE") {
      mesh = new THREE.Group();
      mesh.add(box(7.5, 2.6, 5.4, steel, 0, 1.3, -0.4));
      // Ouverture de la prise vers le bord du circuit (-y du paquet).
      mesh.add(box(6.9, 1.85, 0.6, black, 0, 1.3, 2.25));
      mesh.add(box(5.2, 0.6, 0.62, steel, 0, 1.45, 2.27));
    } else if (pkg === "TACTILE_SWITCH_SMD") {
      mesh = new THREE.Group();
      mesh.add(box(w, 1.3, d, new THREE.MeshStandardMaterial({ color: 0xd2d4d6, metalness: 0.7, roughness: 0.35 })));
      const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * MM, 0.85 * MM, 0.55 * MM, 24), black);
      plunger.position.y = 1.55 * MM;
      mesh.add(plunger);
    } else if (pkg === "PLCC4-2MM-RGB") {
      mesh = new THREE.Group();
      mesh.add(box(2, 0.55, 2, ceramic));
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72 * MM, 0.72 * MM, 0.2 * MM, 24), lens);
      disc.position.y = 0.6 * MM;
      mesh.add(disc);
      glow.position.y = 1.2 * MM;
      mesh.add(glow);
    } else if (pkg === "LED-0603-NO-SS") {
      mesh = box(0.8, 0.55, 1.6, new THREE.MeshStandardMaterial({ color: 0xe8eef3, roughness: 0.4 }));
    } else if (pkg === "AT7020") {
      // Antenne ceramique ACX AT7020 : 7 x 2 mm, bout marque orange.
      mesh = new THREE.Group();
      mesh.add(box(7, 1.2, 2, ceramic));
      mesh.add(box(1.4, 1.21, 2.01, orange, 2.6));
    } else if (pkg === "IPEX-20279-001E") {
      mesh = new THREE.Group();
      mesh.add(box(2.6, 0.4, 2.6, ceramic));
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1 * MM, 1 * MM, 1.25 * MM, 32, 1, true), gold);
      ring.position.y = 0.62 * MM;
      mesh.add(ring);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * MM, 0.25 * MM, 1.1 * MM, 12), gold);
      pin.position.y = 0.55 * MM;
      mesh.add(pin);
    } else if (pkg === "SOT23-5") mesh = box(2.9, 1.1, 1.6, black);
    else if (pkg === "INDUCTOR-NR3015") mesh = box(3, 1.5, 3, grey);
    else if (pkg === "DIODE-DO-220AA(SMP)") mesh = box(w, 1.0, d, black, cx, 0.5, -cy);
    else if (pkg === "XFDFN-6") mesh = box(1, 0.4, 1, black);
    else if (pkg.startsWith("C0201")) mesh = passive(0.6, 0.3, 0.3, tan);
    else if (pkg.startsWith("C0402")) mesh = passive(1.0, 0.5, 0.5, tan);
    else if (pkg.startsWith("C0603")) mesh = passive(1.6, 0.8, 0.8, tan);
    else if (pkg.startsWith("R0402")) mesh = passive(1.0, 0.5, 0.35, black);
    else if (pkg.startsWith("L0402")) mesh = passive(1.0, 0.5, 0.5, brown);
    if (mesh === null) continue;
    const holder = new THREE.Group();
    holder.position.set(part.at[0] * MM, 0, -part.at[1] * MM);
    holder.rotation.y = (part.angle * Math.PI) / 180;
    holder.add(mesh);
    group.add(holder);
  }

  // Barrettes males : entretoise noire sous le circuit, broches dorees qui depassent sur le dessus.
  const rows = [...new Set(data.pins.map((p) => p[0]))];
  for (const x of rows) {
    const column = data.pins.filter((p) => p[0] === x).map((p) => p[1]);
    const y0 = Math.min(...column) - 1.27;
    const y1 = Math.max(...column) + 1.27;
    group.add(box(2.5, PHOTON_SPACER, y1 - y0, black, x, -PHOTON_PCB - PHOTON_SPACER / 2, -(y0 + y1) / 2));
  }
  const pinLength = 1.2 + PHOTON_PCB + PHOTON_SPACER + 6;
  const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.64 * MM, pinLength * MM, 0.64 * MM), gold, data.pins.length);
  const matrix = new THREE.Matrix4();
  data.pins.forEach(([x, y], index) => {
    matrix.makeTranslation(x * MM, (1.2 - pinLength / 2) * MM, -y * MM);
    pins.setMatrixAt(index, matrix);
  });
  group.add(pins);

  group.traverse((object) => {
    if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
  });
  return {
    group,
    setStatus(r, g, b) {
      statusColour.value.setRGB(r, g, b);
      glow.color.setRGB(r, g, b);
      glow.intensity = 0.004 * Math.max(r, g, b);
    },
  };
}
