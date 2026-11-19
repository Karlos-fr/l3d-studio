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
const FILES = {
  side: "case/2mm.DXF",
  engraved: "case/2mm_eng.DXF",
  corner: "case/corner.DXF",
  sticks: "circuit board/LED Sticks.brd",
};
const CACHE = "node_modules/.cache/l3d-hardware";

async function fetchSources() {
  mkdirSync(CACHE, { recursive: true });
  const paths = {};
  for (const [key, file] of Object.entries(FILES)) {
    const path = join(CACHE, file.replace(/[/ ]/gu, "_"));
    if (!existsSync(path)) {
      const response = await fetch(SOURCE + file.split("/").map(encodeURIComponent).join("/"));
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
};
writeFileSync("app/src/cube/case_data.json", JSON.stringify(data));
console.log("case_data.json :", Object.entries(data.panels).map(([k, p]) => `${k} ${p.holes.length} trous ${p.engraving.length} gravures`).join(", "),
  `| barrette ${data.stick.length} mm, ${data.stick.leds.length} LED, J1 ${data.stick.header}`);
