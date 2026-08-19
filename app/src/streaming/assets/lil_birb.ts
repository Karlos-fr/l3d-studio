// ============================================================================
// LilBirb - Donnees du pack de sprites Lil' Birb
// ----------------------------------------------------------------------------
// Ce module transpose l'atlas CC0 8x8 de Casual Garage Coder en donnees texte.
// Le lecteur generique et le registre des animations restent independants.
// Source : https://casual-garage-coder.itch.io/lil-birb
// ============================================================================

import type { SpriteAtlas, SpriteClip, SpriteTimelineFrame } from "../sprites/types";

// Duree de chaque image declaree par le fichier Aseprite d'origine.
const LIL_BIRB_FRAME_DURATION_MS = 100;

// Profondeur du plan vertical utilise pour afficher l'oiseau dans le cube.
const LIL_BIRB_PLANE_Z = 7;

// Quinze motifs uniques references par les 29 images temporelles du pack.
const LIL_BIRB_FRAMES = [
  ["........", "........", "...DD...", "D.DDKD..", "DLLDDDO.", "DDLDDD..", ".DDDD...", "..O.O..."],
  ["........", "........", ".D......", ".D.DDD..", ".DLLDKD.", ".DLDDDD.", "..DDDDO.", "..O.O..."],
  ["........", "........", "........", ".D......", ".DDDDD..", ".DDLLKD.", "..DDDDD.", "..O.O.O."],
  ["........", "........", "........", "...DD...", "D.DDKD..", "DLLDDDO.", "DDLDDD..", "..O.O..."],
  ["........", "....DD..", "D..DDKD.", ".DDLDDDO", ".DLLDDD.", "..DDDD..", "..OO....", "........"],
  ["........", "....DD..", "...DDKD.", "DLLLDDDO", ".DDDDDD.", "..DDDD..", "..OO....", "........"],
  ["........", "....DD..", "..LDDKD.", "DDLLDDDO", ".DDDDDD.", "..DDDD..", "..OO....", "........"],
  ["........", "....DD..", "...DDKD.", "..LLDDDO", "DDLDDDD.", "..DDDD..", "..OO....", "........"],
  ["........", "....DD..", "...DDKD.", ".LLLDDDO", "DDDDDDD.", "..DDDD..", "..OO....", "........"],
  ["........", "....DD..", "..LDDKD.", "..LLDDDO", "DDDDDDD.", "..DDDD..", "..OO....", "........"],
  ["........", "....DD..", "..LDDKD.", "D.LLDDDO", ".DDDDDD.", "..DDDD..", "..OO....", "........"],
  ["........", "....DD..", "..LDDKD.", "D.LLDDDO", ".DDDDDD.", "..DDDD..", "..O.O...", "........"],
  ["........", "....DD..", "..LDDKD.", "D.LLDDDO", ".DDDDDD.", "..DDDD..", "...O.O..", "........"],
  ["........", "........", "....DD..", "..LDDKD.", "D.LLDDDO", ".DDDDDD.", "..DDDD..", "...O.O.."],
  ["........", "........", "....DD..", ".D.DDKD.", ".DLLDDDO", ".DDDDDD.", "..DDDD..", "...OO..."],
] as const;

// Palette opaque originale ; le point reste transparent car absent du dictionnaire.
const LIL_BIRB_ATLAS: SpriteAtlas = {
  frames: LIL_BIRB_FRAMES,
  palette: {
    D: { red: 91, green: 110, blue: 225 },
    L: { red: 99, green: 155, blue: 255 },
    O: { red: 223, green: 113, blue: 38 },
    K: { red: 0, green: 0, blue: 0 },
  },
};

// Timeline du repos, correspondant aux images zero a deux du projet Aseprite.
const LIL_BIRB_IDLE_TIMELINE = createTimeline(0, 0, 0);

// Timeline du repas, correspondant aux images trois a cinq du projet Aseprite.
const LIL_BIRB_EAT_TIMELINE = createTimeline(0, 1, 2);

// Timeline du decollage, correspondant aux images six a quatorze.
const LIL_BIRB_TAKE_OFF_TIMELINE = createTimeline(0, 3, 3, 3, 0, 4, 5, 6, 7);

// Timeline du vol, correspondant aux images quinze a dix-huit.
const LIL_BIRB_FLIGHT_TIMELINE = createTimeline(8, 9, 8, 7);

// Timeline de l'atterrissage, correspondant aux images dix-neuf a vingt-huit.
const LIL_BIRB_LANDING_TIMELINE = createTimeline(8, 8, 8, 8, 10, 11, 12, 13, 14, 0);

// Sequence de repos exportee vers le registre.
export const LIL_BIRB_IDLE_CLIP = createClip(LIL_BIRB_IDLE_TIMELINE);

// Sequence du repas exportee vers le registre.
export const LIL_BIRB_EAT_CLIP = createClip(LIL_BIRB_EAT_TIMELINE);

// Sequence de decollage exportee vers le registre.
export const LIL_BIRB_TAKE_OFF_CLIP = createClip(LIL_BIRB_TAKE_OFF_TIMELINE);

// Sequence de vol exportee vers le registre.
export const LIL_BIRB_FLIGHT_CLIP = createClip(LIL_BIRB_FLIGHT_TIMELINE);

// Sequence d'atterrissage exportee vers le registre.
export const LIL_BIRB_LANDING_CLIP = createClip(LIL_BIRB_LANDING_TIMELINE);

// ----------------------------------------------------------------------------
// Construit une timeline compacte dont toutes les images durent 100 ms.
//
// Parametres :
// - frameIndices : indices des motifs dans l'ordre Aseprite d'origine.
//
// Retour :
// - images temporelles pretes pour le lecteur generique.
// ----------------------------------------------------------------------------
function createTimeline(...frameIndices: number[]): readonly SpriteTimelineFrame[] {
  const timeline: SpriteTimelineFrame[] = [];
  for (const frameIndex of frameIndices) {
    timeline.push({ frameIndex, durationMs: LIL_BIRB_FRAME_DURATION_MS });
  }
  return timeline;
}

// ----------------------------------------------------------------------------
// Associe une timeline Lil' Birb a son atlas et a son plan de rendu communs.
//
// Parametres :
// - timeline : sequence temporelle a lire en boucle.
//
// Retour :
// - clip complet utilisable par le lecteur de sprites.
// ----------------------------------------------------------------------------
function createClip(timeline: readonly SpriteTimelineFrame[]): SpriteClip {
  return {
    atlas: LIL_BIRB_ATLAS,
    timeline,
    planeZ: LIL_BIRB_PLANE_Z,
  };
}
