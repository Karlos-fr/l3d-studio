// ============================================================================
// CubeAssets - Genere app/src/cube/case_data.json depuis les plans officiels
// ----------------------------------------------------------------------------
// Sources : depot github.com/enjrolas/L3D-Hardware (Looking Glass Factory),
// dossier « 8x8x8 cube » : case/2mm.DXF (panneaux lateraux, couvercle),
// case/2mm_eng.DXF (panneaux avant et arriere graves), corner.DXF (cales) et
// circuit board/LED Sticks.brd (contour des barrettes, position des LED).
// Les fichiers sont telecharges dans node_modules/.cache/l3d-hardware.
// Toutes les cotes sont en millimetres. Usage : node scripts/cube-assets.mjs
// ============================================================================
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readLoops } from "./cube-dxf.mjs";

const SOURCE = "https://raw.githubusercontent.com/enjrolas/L3D-Hardware/master/8x8x8%20cube/";
// Photon v1.0.0 : depot github.com/particle-iot/photon (fichiers de fabrication Particle).
const PARTICLE = "https://raw.githubusercontent.com/particle-iot/photon/master/";
const FILES = {
  side: "case/2mm.DXF",
  engraved: "case/2mm_eng.DXF",
  corner: "case/corner.DXF",
  sticks: "circuit board/LED Sticks.brd",
  base: "circuit board/Base Board.brd",
  photon: `${PARTICLE}eagle/photon_v100/photon_v1.0.0.brd`,
};
const CACHE = "node_modules/.cache/l3d-hardware";

async function fetchSources() {
  mkdirSync(CACHE, { recursive: true });
  const paths = {};
  for (const [key, file] of Object.entries(FILES)) {
    const remote = file.startsWith("https://");
    const path = join(CACHE, (remote ? file.slice(PARTICLE.length) : file).replace(/[/ ]/gu, "_"));
    if (!existsSync(path)) {
      const response = await fetch(remote ? file : SOURCE + file.split("/").map(encodeURIComponent).join("/"));
      if (!response.ok) throw new Error(`Telechargement impossible : ${file}`);
      writeFileSync(path, Buffer.from(await response.arrayBuffer()));
    }
    paths[key] = path;
  }
  return paths;
}

const round = (points) => points.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
const size = (loop) => [loop.box.x1 - loop.box.x0, loop.box.y1 - loop.box.y0];
const contains = (outer, loop) => loop.box.x0 >= outer.box.x0 - 0.01 && loop.box.x1 <= outer.box.x1 + 0.01
  && loop.box.y0 >= outer.box.y0 - 0.01 && loop.box.y1 <= outer.box.y1 + 0.01;

// ----------------------------------------------------------------------------
// Ramene un panneau dans son repere : origine au bas, x centre sur l'interieur
// du boitier, miroir horizontal (le DXF est dessine depuis l'interieur : les
// gravures se lisent a l'endroit vue de l'exterieur, comme sur le cube reel).
// Le centre interieur est a 91,2 mm du bord a mortaises (5,0 + 2 + 170,4 / 2 - 1).
// ----------------------------------------------------------------------------
function panelFrame(outline) {
  const { x0, y0 } = outline.box;
  return (points) => round(points.map(([x, y]) => [-(x - x0) + 91.2, y - y0]));
}

// Ouvertures decoupees : mortaises, trous des peignes, vis et passages de connectique.
function isCut(loop) {
  const [w, h] = size(loop);
  const near = (a, b) => Math.abs(a - b) < 0.15;
  return (near(w, 2.29) && near(h, 15.29)) || (near(w, 3.2) && near(h, 4.2)) || (near(w, 3) && near(h, 3))
    || (near(w, 13.5) && near(h, 12)) || (near(w, 9) && near(h, 4)) || (near(w, 5) && near(h, 3.3));
}

function panels(path, engraved) {
  const loops = readLoops(path).sort((a, b) => b.area - a.area);
  const outlines = loops.filter((loop) => Math.abs(loop.box.y1 - loop.box.y0 - 230) < 0.5).sort((a, b) => a.box.x0 - b.box.x0);
  return outlines.map((outline) => {
    const frame = panelFrame(outline);
    const inner = loops.filter((loop) => loop !== outline && contains(outline, loop));
    return {
      outline: frame(outline.points),
      holes: inner.filter(isCut).map((loop) => frame(loop.points)),
      engraving: engraved ? inner.filter((loop) => !isCut(loop)).map((loop) => frame(loop.points)) : [],
    };
  });
}

// ----------------------------------------------------------------------------
// Barrette : contour (couche Dimension 20) et LED WS2812B du fichier Eagle.
// Origine : bas de la barrette ; x centre sur la largeur.
// ----------------------------------------------------------------------------
function stick(path) {
  const board = readFileSync(path, "utf8");
  const plain = board.slice(board.indexOf("<plain>"), board.indexOf("</plain>"));
  const wires = [...plain.matchAll(/<wire x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"[^>]*layer="20"/gu)]
    .map((m) => [[Number(m[1]), Number(m[2])], [Number(m[3]), Number(m[4])]]);
  const loop = [wires[0][0], wires[0][1]];
  const rest = wires.slice(1);
  const close = (a, b) => Math.abs(a[0] - b[0]) < 0.06 && Math.abs(a[1] - b[1]) < 0.06;
  while (rest.length > 0) {
    const end = loop[loop.length - 1];
    const k = rest.findIndex(([a, b]) => close(a, end) || close(b, end));
    if (k < 0) break;
    const [a, b] = rest.splice(k, 1)[0];
    loop.push(close(a, end) ? b : a);
  }
  if (close(loop[0], loop[loop.length - 1])) loop.pop();
  const xs = loop.map((p) => p[0]);
  const ys = loop.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const bottom = Math.min(...ys);
  // Corps 5050 du boitier WS2812B : (-0.4, -4) a (4.8, 0.8) autour de VDD, tourne de 90 degres.
  const leds = [...board.matchAll(/<element name="D(\d)"[^>]*package="WS2812B"[^>]*x="([\d.-]+)" y="([\d.-]+)"/gu)]
    .map((m) => [Number(m[2]) + 1.6 - cx, Number(m[3]) + 2.2 - bottom]);
  const header = board.match(/<element name="J1"[^>]*x="([\d.-]+)" y="([\d.-]+)"/u);
  return {
    outline: round(loop.map(([x, y]) => [x - cx, y - bottom])),
    leds: round(leds),
    header: round([[Number(header[1]) - cx, Number(header[2]) - bottom]])[0],
    length: Math.round((Math.max(...ys) - bottom) * 100) / 100,
  };
}

// ----------------------------------------------------------------------------
// Lecture Eagle minimale : attributs d'une balise et transformation d'element
// (rot="[S][M]Rangle" : miroir en x, puis rotation, puis translation).
// ----------------------------------------------------------------------------
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/gu)].map((m) => [m[1], m[2]]));
const num = (value) => Number(value ?? 0);

function placement(element) {
  const rot = element.rot ?? "R0";
  const mirror = rot.includes("M");
  const angle = num(rot.replace(/[SMR]/gu, ""));
  const c = Math.cos((angle * Math.PI) / 180);
  const s = Math.sin((angle * Math.PI) / 180);
  const x0 = num(element.x);
  const y0 = num(element.y);
  return {
    mirror, angle, spin: rot.includes("S"),
    at: ([x, y]) => {
      const mx = mirror ? -x : x;
      return [x0 + mx * c - y * s, y0 + mx * s + y * c];
    },
  };
}

// Paquets de chaque bibliotheque : « bibliotheque/paquet » -> texte XML.
function packagesOf(board) {
  const packages = new Map();
  for (const library of board.matchAll(/<library name="([^"]*)"[^>]*>([\s\S]*?)<\/library>/gu)) {
    for (const pkg of library[2].matchAll(/<package name="([^"]*)"[^>]*>([\s\S]*?)<\/package>/gu)) {
      packages.set(`${library[1]}/${pkg[1]}`, pkg[2]);
    }
  }
  return packages;
}

// Contour de carte (couche Dimension 20) chaine en une boucle fermee.
function dimension(board) {
  const plain = board.slice(board.indexOf("<plain>"), board.indexOf("</plain>"));
  const wires = [...plain.matchAll(/<wire [^>]*layer="20"[^>]*>/gu)].map((m) => attrs(m[0]))
    .map((w) => [[num(w.x1), num(w.y1)], [num(w.x2), num(w.y2)]]);
  const loop = [wires[0][0], wires[0][1]];
  const rest = wires.slice(1);
  const close = (a, b) => Math.abs(a[0] - b[0]) < 0.06 && Math.abs(a[1] - b[1]) < 0.06;
  while (rest.length > 0) {
    const end = loop[loop.length - 1];
    const k = rest.findIndex(([a, b]) => close(a, end) || close(b, end));
    if (k < 0) break;
    const [a, b] = rest.splice(k, 1)[0];
    loop.push(close(a, end) ? b : a);
  }
  if (close(loop[0], loop[loop.length - 1])) loop.pop();
  return loop;
}

// ----------------------------------------------------------------------------
// Photon v1.0.0 (Particle) : contour, serigraphie de la face composants
// (couche 21, et 22 des elements retournes), cuivre a nu sous l'epargne
// (couche 29 : etoile Particle), pastilles des broches, et pour chaque
// composant sa position et l'emprise de son corps (couche tDocu 51, sinon
// ses pastilles). Repere : celui du fichier Eagle, en mm, vue de dessus.
// ----------------------------------------------------------------------------
function photon(path) {
  const board = readFileSync(path, "utf8");
  const packages = packagesOf(board);
  const r2 = (v) => Math.round(v * 100) / 100;
  const pt = ([x, y]) => [r2(x), r2(y)];
  const silk = { wires: [], circles: [], rects: [], texts: [] };
  const copper = [];
  const parts = [];
  const pins = [];
  const elements = [...board.matchAll(/<element ([^>]*)>/gu)].map((m) => attrs(m[1]));
  for (const element of elements) {
    const body = packages.get(`${element.library}/${element.package}`) ?? "";
    const place = placement(element);
    // Sur un element retourne, la couche 22 du paquet devient la serigraphie du dessus.
    const silkLayer = place.mirror ? "22" : "21";
    for (const m of body.matchAll(/<(wire|circle|rectangle|text|polygon)\b([^>]*)>([\s\S]*?<\/\1>)?/gu)) {
      const a = attrs(m[2]);
      if (a.layer === silkLayer) {
        if (m[1] === "wire") silk.wires.push([...pt(place.at([num(a.x1), num(a.y1)])), ...pt(place.at([num(a.x2), num(a.y2)])), r2(num(a.width))]);
        if (m[1] === "circle") silk.circles.push([...pt(place.at([num(a.x), num(a.y)])), r2(num(a.radius)), r2(num(a.width))]);
        if (m[1] === "rectangle") {
          silk.rects.push([[num(a.x1), num(a.y1)], [num(a.x2), num(a.y1)], [num(a.x2), num(a.y2)], [num(a.x1), num(a.y2)]].map((p) => pt(place.at(p))));
        }
        if (m[1] === "text" && !/^>/u.test(m[3] ?? "")) {
          const text = (m[3] ?? "").replace(/<\/text>$/u, "");
          const angle = (num((a.rot ?? "R0").replace(/[SMR]/gu, "")) + place.angle) % 360;
          silk.texts.push({ text, at: pt(place.at([num(a.x), num(a.y)])), size: num(a.size), angle, align: a.align ?? "bottom-left" });
        }
      }
      if (m[1] === "polygon" && a.layer === "29") {
        copper.push([...(m[3] ?? "").matchAll(/<vertex ([^>]*)>/gu)].map((v) => pt(place.at([num(attrs(v[1]).x), num(attrs(v[1]).y)]))));
      }
    }
    if (/^JP\d$/u.test(element.name)) {
      for (const pad of body.matchAll(/<pad name="(\d+)"([^>]*)>/gu)) {
        const a = attrs(pad[2]);
        pins.push(pt(place.at([num(a.x), num(a.y)])));
      }
      continue;
    }
    // Emprise du corps : traces tDocu, sinon pastilles CMS.
    const docu = [...body.matchAll(/<wire ([^>]*layer="51"[^>]*)>/gu)].flatMap((w) => {
      const a = attrs(w[1]);
      return [[num(a.x1), num(a.y1)], [num(a.x2), num(a.y2)]];
    });
    const pads = [...body.matchAll(/<smd ([^>]*)>/gu)].flatMap((p) => {
      const a = attrs(p[1]);
      const turned = /R(90|270)/u.test(a.rot ?? "");
      const dx = num(turned ? a.dy : a.dx) / 2;
      const dy = num(turned ? a.dx : a.dy) / 2;
      return [[num(a.x) - dx, num(a.y) - dy], [num(a.x) + dx, num(a.y) + dy]];
    });
    const extent = docu.length >= 4 ? docu : pads;
    if (extent.length === 0) continue;
    const xs = extent.map((p) => p[0]);
    const ys = extent.map((p) => p[1]);
    parts.push({
      name: element.name, package: element.package, value: element.value ?? "",
      at: pt([num(element.x), num(element.y)]), angle: place.angle, mirror: place.mirror,
      box: [r2(Math.min(...xs)), r2(Math.min(...ys)), r2(Math.max(...xs)), r2(Math.max(...ys))],
    });
  }
  const plain = board.slice(board.indexOf("<plain>"), board.indexOf("</plain>"));
  for (const m of plain.matchAll(/<wire ([^>]*layer="21"[^>]*)>/gu)) {
    const a = attrs(m[1]);
    silk.wires.push([r2(num(a.x1)), r2(num(a.y1)), r2(num(a.x2)), r2(num(a.y2)), r2(num(a.width))]);
  }
  return { outline: dimension(board).map(pt), silk, copper, pins, parts };
}

// Emplacement du Photon sur la carte de base : barrettes JP1 (VIN a GND/A0) et JP2.
function photonSocket(path) {
  const board = readFileSync(path, "utf8");
  const element = (name) => attrs(board.match(new RegExp(`<element name="${name}" ([^>]*)>`, "u"))[1]);
  const [jp1, jp2] = [element("JP1"), element("JP2")];
  return { pin1: [num(jp1.x), num(jp1.y)], rowSpacing: Math.round((num(jp2.x) - num(jp1.x)) * 100) / 100, board: 170 };
}

const paths = await fetchSources();
const [sideA, sideB] = panels(paths.side, false);
const [front, back] = panels(paths.engraved, true);
const sideLoops = readLoops(paths.side);
const lidLoop = sideLoops.find((loop) => Math.abs(size(loop)[0] - 170.4) < 0.2 && Math.abs(size(loop)[1] - 170.4) < 0.2);
const lidCenter = [(lidLoop.box.x0 + lidLoop.box.x1) / 2, (lidLoop.box.y0 + lidLoop.box.y1) / 2];
const toLid = (points) => round(points.map(([x, y]) => [x - lidCenter[0], y - lidCenter[1]]));
const cornerLoops = readLoops(paths.corner).sort((a, b) => b.area - a.area);
const cornerOrigin = [cornerLoops[0].box.x0, cornerLoops[0].box.y0];
const toCorner = (points) => round(points.map(([x, y]) => [x - cornerOrigin[0], y - cornerOrigin[1]]));

const data = {
  source: "github.com/enjrolas/L3D-Hardware, 8x8x8 cube (Looking Glass Factory)",
  units: "mm",
  panels: { front, back, left: sideA, right: sideB },
  lid: {
    outline: toLid(lidLoop.points),
    holes: sideLoops.filter((loop) => loop !== lidLoop && contains(lidLoop, loop)).map((loop) => toLid(loop.points)),
  },
  corner: { outline: toCorner(cornerLoops[0].points), holes: cornerLoops.slice(1).map((loop) => toCorner(loop.points)) },
  stick: stick(paths.sticks),
  photon: { source: "github.com/particle-iot/photon, eagle/photon_v100", ...photon(paths.photon), socket: photonSocket(paths.base) },
};
writeFileSync("app/src/cube/case_data.json", JSON.stringify(data));
console.log("case_data.json :", Object.entries(data.panels).map(([k, p]) => `${k} ${p.holes.length} trous ${p.engraving.length} gravures`).join(", "),
  `| barrette ${data.stick.length} mm, ${data.stick.leds.length} LED, J1 ${data.stick.header}`);
