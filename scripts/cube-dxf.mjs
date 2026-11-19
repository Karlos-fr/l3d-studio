// ============================================================================
// CubeDxf - Lecture des plans laser officiels du boitier L3D 8x8x8
// ----------------------------------------------------------------------------
// Lit les DXF publies par Looking Glass (github.com/enjrolas/L3D-Hardware,
// dossier « 8x8x8 cube/case ») et les ramene a des contours fermes en mm :
// segments LINE, ARC, CIRCLE et POLYLINE (avec renflements) chaines bout a bout.
// Utilise par scripts/cube-assets.mjs ; ne connait ni Three.js ni le DOM.
// ============================================================================
import { readFileSync } from "node:fs";

const ARC_STEP = Math.PI / 24;
const JOIN = 0.02;

// ----------------------------------------------------------------------------
// Parcourt la section ENTITIES et renvoie chaque entite avec ses codes groupes.
// ----------------------------------------------------------------------------
function readEntities(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/u).map((line) => line.trim());
  const entities = [];
  let current = null;
  for (let i = lines.indexOf("ENTITIES") + 1; i < lines.length - 1; i += 2) {
    const code = lines[i];
    const value = lines[i + 1];
    if (code === "0") {
      if (current) entities.push(current);
      if (value === "ENDSEC") break;
      current = { type: value, codes: [] };
      continue;
    }
    current?.codes.push([code, value]);
  }
  return entities;
}

const first = (entity, code) => Number(entity.codes.find(([c]) => c === code)?.[1] ?? 0);

function arcPoints(cx, cy, r, a0, a1) {
  let sweep = a1 - a0;
  if (sweep <= 0) sweep += Math.PI * 2;
  const steps = Math.max(2, Math.ceil(sweep / ARC_STEP));
  const points = [];
  for (let k = 0; k <= steps; k += 1) {
    const a = a0 + (sweep * k) / steps;
    points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return points;
}

// Segment entre deux sommets de polyligne, arrondi selon le renflement (code 42).
function bulgePoints(p, q, bulge) {
  if (Math.abs(bulge) < 1e-9) return [p, q];
  const angle = 4 * Math.atan(bulge);
  const chord = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const r = chord / (2 * Math.sin(angle / 2));
  const mx = (p[0] + q[0]) / 2;
  const my = (p[1] + q[1]) / 2;
  const h = Math.sqrt(Math.max(0, r * r - (chord / 2) ** 2)) * Math.sign(bulge) * (Math.abs(angle) > Math.PI ? -1 : 1);
  const nx = -(q[1] - p[1]) / chord;
  const ny = (q[0] - p[0]) / chord;
  const cx = mx + nx * h;
  const cy = my + ny * h;
  const a0 = Math.atan2(p[1] - cy, p[0] - cx);
  const a1 = Math.atan2(q[1] - cy, q[0] - cx);
  const points = bulge > 0 ? arcPoints(cx, cy, Math.abs(r), a0, a1) : arcPoints(cx, cy, Math.abs(r), a1, a0).reverse();
  points[0] = p;
  points[points.length - 1] = q;
  return points;
}

// ----------------------------------------------------------------------------
// Convertit les entites en traits ouverts ou fermes. Chaque trait garde sa source
// (cut pour les LINE/ARC/CIRCLE, poly pour les POLYLINE du graveur).
// ----------------------------------------------------------------------------
function strokes(entities) {
  const out = [];
  for (let i = 0; i < entities.length; i += 1) {
    const e = entities[i];
    if (e.type === "LINE") out.push({ kind: "cut", points: [[first(e, "10"), first(e, "20")], [first(e, "11"), first(e, "21")]] });
    if (e.type === "ARC") {
      const cx = first(e, "10"); const cy = first(e, "20"); const r = first(e, "40");
      out.push({ kind: "cut", points: arcPoints(cx, cy, r, first(e, "50") * Math.PI / 180, first(e, "51") * Math.PI / 180) });
    }
    if (e.type === "CIRCLE") {
      const pts = arcPoints(first(e, "10"), first(e, "20"), first(e, "40"), 0, Math.PI * 2);
      out.push({ kind: "cut", points: pts, closed: true });
    }
    if (e.type === "POLYLINE") {
      const closed = (first(e, "70") & 1) === 1;
      const vertices = [];
      for (i += 1; i < entities.length && entities[i].type === "VERTEX"; i += 1) {
        vertices.push({ p: [first(entities[i], "10"), first(entities[i], "20")], bulge: first(entities[i], "42") });
      }
      const points = [];
      const count = closed ? vertices.length : vertices.length - 1;
      for (let k = 0; k < count; k += 1) {
        const seg = bulgePoints(vertices[k].p, vertices[(k + 1) % vertices.length].p, vertices[k].bulge);
        points.push(...(k === 0 ? seg : seg.slice(1)));
      }
      out.push({ kind: "poly", points, closed });
    }
  }
  return out;
}

const near = (a, b) => Math.abs(a[0] - b[0]) < JOIN && Math.abs(a[1] - b[1]) < JOIN;

// ----------------------------------------------------------------------------
// Chaine les traits ouverts par leurs extremites jusqu'a former des boucles.
// ----------------------------------------------------------------------------
function chain(list) {
  const loops = list.filter((s) => s.closed).map((s) => ({ kind: s.kind, points: s.points }));
  const open = list.filter((s) => !s.closed).map((s) => ({ kind: s.kind, points: [...s.points] }));
  while (open.length > 0) {
    const loop = open.pop();
    let grown = true;
    while (grown && !near(loop.points[0], loop.points[loop.points.length - 1])) {
      grown = false;
      const end = loop.points[loop.points.length - 1];
      for (let k = 0; k < open.length; k += 1) {
        const s = open[k];
        if (near(s.points[0], end)) loop.points.push(...s.points.slice(1));
        else if (near(s.points[s.points.length - 1], end)) loop.points.push(...[...s.points].reverse().slice(1));
        else continue;
        if (s.kind === "poly") loop.kind = "poly";
        open.splice(k, 1);
        grown = true;
        break;
      }
    }
    if (near(loop.points[0], loop.points[loop.points.length - 1]) && loop.points.length > 3) {
      loop.points.pop();
      loops.push(loop);
    }
  }
  return loops;
}

export function area(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    sum += x0 * y1 - x1 * y0;
  }
  return sum / 2;
}

export function bounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export function inside(point, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// ----------------------------------------------------------------------------
// Lit un DXF et renvoie ses boucles fermees, avec aire et emprise.
// ----------------------------------------------------------------------------
export function readLoops(path) {
  return chain(strokes(readEntities(path))).map((loop) => ({ ...loop, area: Math.abs(area(loop.points)), box: bounds(loop.points) }));
}
