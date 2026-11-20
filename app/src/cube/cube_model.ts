// ============================================================================
// CubeModel - Modele 3D du cube L3D 8x8x8 (Looking Glass), a l'identique
// ----------------------------------------------------------------------------
// Construit le cube a partir des plans officiels (case_data.json, genere par
// scripts/cube-assets.mjs) et des photos du cube reel :
// - quatre panneaux d'acrylique transparent de 2 mm assembles en moulinet par
//   tenons a crochet, couvercle de 170,4 mm dans la rainure haute ;
// - carte de base noire dans la rainure basse, sur quatre cales d'angle vissees ;
// - 64 barrettes en circuit noir (serigraphie blanche D1 a D8, J1), enfichees
//   dans des connecteurs femelles noirs, tenues en haut par 8 peignes de 4 mm ;
// - 512 LED WS2812B 5050 tournees vers l'avant, dont la lentille s'allume ;
// - gravures laser : logo L3D a l'avant, connectique et site a l'arriere.
// Repere : metres, origine au centre du dessous du boitier, avant vers +z.
// Ce fichier ne connait ni l'emulateur ni la boucle de rendu.
// ============================================================================

import * as THREE from "three/webgpu";
import { float, instancedDynamicBufferAttribute, texture, vec3 } from "three/tsl";
import data from "./case_data.json";
import { engravingTexture, ledFaceTextures, stickSilkscreen } from "./cube_textures";

type Point = [number, number];
type Outline = { outline: Point[]; holes: Point[][] };

const MM = 0.001;
const N = 8;
// Pas des LED (carte de base et peignes) et epaisseurs.
const PITCH = 20;
const PANEL = 2;
const INNER = 85.2;
const PCB = 1.0;
// Hauteurs dans le panneau (mm depuis le bas), d'apres les rainures et les trous du DXF :
// les cales d'angle de 3 mm passent dans les rainures basse (34,7) et haute (217,7),
// la carte de base et le couvercle sont visses dessus.
const GROOVE_LOW = 34.7;
const GROOVE_HIGH = 217.7;
const CORNER_T = 3;
const BOARD_Y = GROOVE_LOW + CORNER_T;
const BOARD_T = 1.6;
const COMB_TOP = 217.9;
const COMB_T = 4;
const LID_Y = GROOVE_HIGH + CORNER_T;
// La languette haute de la barrette traverse le peigne et affleure sous le couvercle.
const STICK_TOP = 217.4;
const HEADER_H = 8.5;

export type CubeModel = {
  group: THREE.Group;
  // Couleurs des 512 LED en RGB 0 a 255, ordre (y, x, z), telles que le firmware les envoie.
  setLeds(rgb: Uint8Array): void;
};

const grid = (i: number) => (-((N - 1) * PITCH) / 2 + i * PITCH) * MM;

function shapeOf(outline: Point[], holes: Point[][] = []): THREE.Shape {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x * MM, y * MM)));
  for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x * MM, y * MM))));
  return shape;
}

function extrude(part: Outline, depth: number, bevel = 0): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shapeOf(part.outline, part.holes), {
    depth: depth * MM - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
}

// ----------------------------------------------------------------------------
// Matieres photographiques. Le PMREM de la scene donne les reflets.
// ----------------------------------------------------------------------------
function materials() {
  // Acrylique coule : faces presque invisibles hors reflets, chants plus denses et legerement verts.
  const acrylicFace = new THREE.MeshPhysicalMaterial({
    color: 0xf4fbfa, metalness: 0, roughness: 0.02, ior: 1.49, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.02,
    transparent: true, opacity: 0.02, depthWrite: false, side: THREE.FrontSide, envMapIntensity: 0.7,
  });
  const acrylicEdge = new THREE.MeshPhysicalMaterial({
    color: 0xcfeee6, metalness: 0, roughness: 0.12, ior: 1.49, clearcoat: 1, transparent: true, opacity: 0.4, depthWrite: false,
  });
  const acrylic = [acrylicFace, acrylicEdge];
  // Vernis epargne noir des circuits : satine, avec un leger vernis.
  const solder = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: 0.6 });
  const fr4 = new THREE.MeshStandardMaterial({ color: 0x24221d, roughness: 0.7 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x0e0e0f, roughness: 0.55 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 1, roughness: 0.28 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc8cacc, metalness: 1, roughness: 0.32 });
  const recess = new THREE.MeshStandardMaterial({ color: 0x2c2d2f, metalness: 1, roughness: 0.6 });
  return { acrylic, acrylicFace, acrylicEdge, solder, fr4, plastic, gold, steel, recess };
}

// ----------------------------------------------------------------------------
// Vis M3 x 6 a tete cylindrique bombee et empreinte cruciforme (ISO 7045) :
// tete de 5,5 mm sur 2,1 mm, tige filetee de 3 mm au pas de 0,5 mm sur 6 mm.
// Origine : face d'appui sous la tete ; la tige descend vers -y.
// ----------------------------------------------------------------------------
function m3Screw(steel: THREE.Material, recess: THREE.Material): THREE.Group {
  const screw = new THREE.Group();
  const p = (r: number, y: number) => new THREE.Vector2(r * MM, y * MM);
  const head = [p(0, 2.1), p(1.2, 2.08), p(2.1, 1.85), p(2.6, 1.3), p(2.75, 0.6), p(2.75, 0), p(1.5, 0)];
  screw.add(new THREE.Mesh(new THREE.LatheGeometry(head, 32), steel));
  // Filet : dents de 0,5 mm entre le diametre exterieur (3) et le noyau (2,4).
  const thread = [p(0, -6), p(1.2, -6)];
  for (let y = -5.75; y < 0; y += 0.5) thread.push(p(1.5, y), p(1.2, y + 0.25));
  thread.push(p(1.2, 0), p(0, 0));
  screw.add(new THREE.Mesh(new THREE.LatheGeometry(thread, 20), steel));
  // Empreinte cruciforme sombre, legerement enfoncee dans le dome.
  for (const angle of [0, Math.PI / 2]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.9 * MM, 0.5 * MM, 0.7 * MM), recess);
    arm.position.y = 1.9 * MM;
    arm.rotation.y = angle;
    screw.add(arm);
  }
  return screw;
}

// ----------------------------------------------------------------------------
// Construit le cube complet, LED eteintes.
// ----------------------------------------------------------------------------
export function buildCube(): CubeModel {
  const group = new THREE.Group();
  const m = materials();
  const panels = data.panels as unknown as Record<"front" | "back" | "left" | "right", Outline & { engraving: Point[][] }>;

  // ------------------------------------------------------------ boitier
  // Avant (+z), droite (+x), arriere, gauche : chaque panneau tourne de 90 degres.
  const order = [panels.front, panels.right, panels.back, panels.left];
  order.forEach((panel, k) => {
    const holder = new THREE.Group();
    holder.rotation.y = (k * Math.PI) / 2;
    const mesh = new THREE.Mesh(extrude(panel, PANEL, 0.00015), m.acrylic);
    mesh.position.z = INNER * MM;
    holder.add(mesh);
    if (panel.engraving.length > 0) {
      // Gravure sur la face interieure, lue a l'endroit depuis l'exterieur.
      const { map, box } = engravingTexture(panel.engraving);
      const decal = new THREE.Mesh(
        new THREE.PlaneGeometry((box.x1 - box.x0) * MM, (box.y1 - box.y0) * MM),
        new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.9, depthWrite: false, side: THREE.DoubleSide, color: 0xf4f6f6 }),
      );
      decal.position.set(((box.x0 + box.x1) / 2) * MM, ((box.y0 + box.y1) / 2) * MM, (INNER + 0.03) * MM);
      decal.renderOrder = 2;
      holder.add(decal);
    }
    group.add(holder);
  });
  // Couvercle dans la rainure haute.
  const lid = new THREE.Mesh(extrude(data.lid as unknown as Outline, PANEL, 0.00015), m.acrylic);
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = LID_Y * MM;
  group.add(lid);

  // ------------------------------------------------------------ carte de base
  const board = new THREE.Mesh(new THREE.BoxGeometry(170 * MM, BOARD_T * MM, 170 * MM), [m.fr4, m.fr4, m.solder, m.solder, m.fr4, m.fr4]);
  board.position.y = (BOARD_Y + BOARD_T / 2) * MM;
  group.add(board);
  // Cales d'angle (corner.DXF) : huit, dans les rainures des deux panneaux voisins, l'angle
  // arrondi depasse a l'exterieur. Leur trou tombe sur ceux du couvercle (81 mm du centre).
  const corner = data.corner as unknown as Outline;
  const hole = corner.holes[0] ?? [[0, 0]];
  const hx = (Math.min(...hole.map((p) => p[0])) + Math.max(...hole.map((p) => p[0]))) / 2;
  const hy = (Math.min(...hole.map((p) => p[1])) + Math.max(...hole.map((p) => p[1]))) / 2;
  const cornerGeometry = extrude(corner, CORNER_T, 0.0002);
  cornerGeometry.translate(-hx * MM, -hy * MM, 0);
  // Repere du trace : +x et -y vont vers l'exterieur du coin ; l'epaisseur monte.
  cornerGeometry.rotateX(-Math.PI / 2);
  const screw = m3Screw(m.steel, m.recess);
  const lidTop = (LID_Y + PANEL) * MM;
  const boardTop = (BOARD_Y + BOARD_T) * MM;
  for (let k = 0; k < 4; k += 1) {
    const holder = new THREE.Group();
    holder.rotation.y = (k * Math.PI) / 2;
    for (const [y, screwY] of [[GROOVE_LOW * MM, boardTop], [GROOVE_HIGH * MM, lidTop]] as const) {
      const block = new THREE.Mesh(cornerGeometry, m.acrylic);
      block.position.set(81 * MM, y, 81 * MM);
      holder.add(block);
      // Vis M3 x 6 : la tete porte sur la carte ou le couvercle, la tige traverse la cale.
      const fixing = screw.clone();
      fixing.position.set(81 * MM, screwY, 81 * MM);
      fixing.rotation.y = k * 0.7 + (screwY === lidTop ? 0.3 : 0);
      holder.add(fixing);
    }
    group.add(holder);
  }
  // Connectique sous la carte, face aux decoupes du panneau arriere.
  const parts: [number, number, number, number, number, number, THREE.Material][] = [
    [51.2, 27.7, 12, 11, 15, 0, m.steel],
    [-50.1, 19.3, 9, 11, 13, 0, m.plastic],
    [0, 30.4, 8, 3, 4, 0, m.plastic],
  ];
  for (const [x, y, w, h, d, , material] of parts) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(w * MM, h * MM, d * MM), material);
    part.position.set(x * MM, y * MM, -(INNER - d / 2) * MM);
    group.add(part);
  }

  // ------------------------------------------------------------ barrettes
  const stick = data.stick as unknown as { outline: Point[]; leds: Point[]; header: Point; length: number };
  const stickBottom = STICK_TOP - stick.length;
  const stickGeometry = new THREE.ExtrudeGeometry(shapeOf(stick.outline), { depth: PCB * MM, bevelEnabled: false, curveSegments: 4 });
  const silk = stickSilkscreen(stick.length, stick.leds, stick.header);
  // Les UV de l'extrusion sont en metres : la serigraphie est calee en mm.
  silk.repeat.multiplyScalar(1 / MM);
  silk.offset.set(0.5, 0);
  const stickFace = new THREE.MeshPhysicalMaterial({ map: silk, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: 0.6 });
  const sticks = new THREE.InstancedMesh(stickGeometry, [stickFace, m.fr4], N * N);
  const headers = new THREE.InstancedMesh(new THREE.BoxGeometry(5.1 * MM, HEADER_H * MM, 5.1 * MM), m.plastic, N * N);
  const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.64 * MM, 0.64 * MM, 2.2 * MM), m.gold, N * N * 4);
  const matrix = new THREE.Matrix4();
  let s = 0;
  let p = 0;
  for (let ix = 0; ix < N; ix += 1) {
    for (let iz = 0; iz < N; iz += 1) {
      const x = grid(ix);
      const z = grid(iz);
      // Face avant du circuit 0,8 mm derriere le centre des LED.
      matrix.makeTranslation(x, stickBottom * MM, z - (0.8 + PCB) * MM);
      sticks.setMatrixAt(s, matrix);
      matrix.makeTranslation(x, boardTop + (HEADER_H / 2) * MM, z - 1.3 * MM);
      headers.setMatrixAt(s, matrix);
      for (const dx of [-1.27, 1.27]) for (const dy of [-1.27, 1.27]) {
        matrix.makeTranslation(x + (stick.header[0] + dx) * MM, (stickBottom + stick.header[1] + dy) * MM, z - 0.8 * MM + 0.6 * MM);
        pins.setMatrixAt(p, matrix);
        p += 1;
      }
      s += 1;
    }
  }
  group.add(sticks, headers, pins);

  // Peignes de 4 mm : un par rangee de profondeur, fentes de 6 x 1,2 mm, languettes dans les flancs.
  const half = INNER + PANEL + 0.6;
  const comb = new THREE.Shape([
    [-INNER, -2.4], [-INNER, -1.5], [-half, -1.5], [-half, 1.5], [-INNER, 1.5], [-INNER, 2.4],
    [INNER, 2.4], [INNER, 1.5], [half, 1.5], [half, -1.5], [INNER, -1.5], [INNER, -2.4],
  ].map(([x, y]) => new THREE.Vector2(x * MM, y * MM)));
  for (let ix = 0; ix < N; ix += 1) {
    const cx = -((N - 1) * PITCH) / 2 + ix * PITCH;
    comb.holes.push(new THREE.Path([[cx - 3, -0.6], [cx + 3, -0.6], [cx + 3, 0.6], [cx - 3, 0.6]].map(([x, y]) => new THREE.Vector2(x * MM, y * MM))));
  }
  const combGeometry = new THREE.ExtrudeGeometry(comb, { depth: COMB_T * MM, bevelEnabled: false });
  combGeometry.rotateX(Math.PI / 2);
  for (let iz = 0; iz < N; iz += 1) {
    const mesh = new THREE.Mesh(combGeometry, m.acrylic);
    mesh.position.set(0, COMB_TOP * MM, grid(iz) - 1.3 * MM);
    group.add(mesh);
  }

  // ------------------------------------------------------------ LED
  const colours = new THREE.InstancedBufferAttribute(new Float32Array(N * N * N * 3), 3);
  colours.setUsage(THREE.DynamicDrawUsage);
  const ledColour = instancedDynamicBufferAttribute(colours, "vec3") as unknown as THREE.Node<"vec3">;
  const face = ledFaceTextures();
  const top = new THREE.MeshPhysicalNodeMaterial({ map: face.map, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
  // La lentille rayonne la couleur ; un halo plus large traverse le boitier blanc.
  // Allumee, une WS2812 eclaire toute sa face : la lentille brule, le boitier blanc diffuse autour.
  top.emissiveNode = ledColour.mul(texture(face.glow).r.pow(float(1.2)).mul(0.75).add(0.25)).mul(16);
  const body = new THREE.MeshPhysicalNodeMaterial({ color: 0xf2efe8, roughness: 0.5 });
  body.emissiveNode = ledColour.mul(1.6);
  const back = new THREE.MeshStandardNodeMaterial({ color: 0xe9e6de, roughness: 0.6 });
  back.emissiveNode = vec3(0);
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(5 * MM, 5 * MM, 1.6 * MM), [body, body, body, body, top, back], N * N * N);
  let i = 0;
  for (let iy = 0; iy < N; iy += 1) {
    for (let ix = 0; ix < N; ix += 1) {
      for (let iz = 0; iz < N; iz += 1) {
        const y = (stickBottom + (stick.leds[iy]?.[1] ?? 0)) * MM;
        matrix.makeTranslation(grid(ix) + (stick.leds[iy]?.[0] ?? 0) * MM, y, grid(iz));
        leds.setMatrixAt(i, matrix);
        i += 1;
      }
    }
  }
  group.add(leds);

  for (const mesh of [sticks, headers, pins, leds]) mesh.frustumCulled = false;
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
  });

  // Une WS2812 parait vive des les faibles rapports cycliques : courbe gamma douce.
  const level = new Float32Array(256).map((_, v) => (v / 255) ** 0.6);
  return {
    group,
    setLeds(rgb) {
      const target = colours.array as Float32Array;
      for (let k = 0; k < target.length; k += 1) target[k] = level[rgb[k] ?? 0] ?? 0;
      colours.needsUpdate = true;
    },
  };
}
