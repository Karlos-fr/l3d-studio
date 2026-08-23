// ============================================================================
// PaintingModel - Etat local et persistance du peintre de voxels
// ----------------------------------------------------------------------------
// Ce module modifie un StreamingFramebuffer et sauvegarde son RGB888 dans le
// navigateur. Il ne connait ni le DOM, ni le serveur LAN, ni le mode firmware.
// ============================================================================

import { StreamingFramebuffer } from "../streaming/framebuffer";

// Outils volontairement limites au dessin et a l'effacement.
export type PainterTool = "draw" | "erase";

// Cle versionnee du dessin local afin de pouvoir faire evoluer son format.
export const PAINTER_STORAGE_KEY = "l3d-studio:painter-frame:v1";

// Nombre de caracteres hexadecimaux representant les 1 536 composantes RGB.
const PAINTER_SERIALIZED_LENGTH = 3_072;

// Expression d'une couleur HTML complete acceptee par le modele.
const PAINTER_COLOR_PATTERN = /^#[0-9a-f]{6}$/iu;

// Stockage minimal attendu, compatible avec localStorage et les tests.
export interface PainterStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// ----------------------------------------------------------------------------
// Charge le dernier dessin valide ou retourne un framebuffer noir.
//
// Parametres :
// - storage : stockage local du navigateur.
//
// Retour :
// - framebuffer independant pret a etre modifie.
// ----------------------------------------------------------------------------
export function loadPainterFramebuffer(storage: PainterStorage): StreamingFramebuffer {
  const framebuffer = new StreamingFramebuffer();
  let serialized: string | null;
  try {
    serialized = storage.getItem(PAINTER_STORAGE_KEY);
  } catch {
    return framebuffer;
  }
  if (
    serialized === null ||
    serialized.length !== PAINTER_SERIALIZED_LENGTH ||
    !/^[0-9a-f]+$/iu.test(serialized)
  ) {
    return framebuffer;
  }
  for (let index = 0; index < framebuffer.colors.length; index += 1) {
    const component = Number.parseInt(serialized.slice(index * 2, index * 2 + 2), 16);
    framebuffer.colors[index] = component;
  }
  return framebuffer;
}

// ----------------------------------------------------------------------------
// Sauvegarde les 1 536 composantes RGB dans un format hexadecimal borne.
//
// Parametres :
// - storage : stockage local du navigateur.
// - framebuffer : dessin courant a conserver.
//
// Effet de bord :
// - remplace la valeur versionnee dans le stockage fourni.
// ----------------------------------------------------------------------------
export function savePainterFramebuffer(
  storage: PainterStorage,
  framebuffer: StreamingFramebuffer,
): void {
  let serialized = "";
  for (const component of framebuffer.colors) {
    serialized += component.toString(16).padStart(2, "0");
  }
  storage.setItem(PAINTER_STORAGE_KEY, serialized);
}

// ----------------------------------------------------------------------------
// Applique le crayon ou la gomme a un voxel logique.
//
// Parametres :
// - framebuffer : dessin modifie sur place.
// - x, y, z : coordonnees entieres de zero a sept.
// - color : couleur HTML du crayon.
// - tool : outil de dessin actif.
//
// Retour :
// - vrai lorsque les coordonnees et la couleur ont permis l'ecriture.
// ----------------------------------------------------------------------------
export function paintVoxel(
  framebuffer: StreamingFramebuffer,
  x: number,
  y: number,
  z: number,
  color: string,
  tool: PainterTool,
): boolean {
  if (!PAINTER_COLOR_PATTERN.test(color)) return false;
  if (tool === "erase") return framebuffer.setVoxel(x, y, z, 0, 0, 0);
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return framebuffer.setVoxel(x, y, z, red, green, blue);
}
