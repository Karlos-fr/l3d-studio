// ============================================================================
// SpriteTypes - Contrats des sprites diffuses dans le cube
// ----------------------------------------------------------------------------
// Ce fichier decrit atlas, palette et timeline. Il ne charge aucun asset et ne
// connait ni le framebuffer, ni le transport LAN, ni l'interface utilisateur.
// ============================================================================

// Couleur RGB associee a un symbole compact de sprite.
export interface SpriteColor {
  red: number;
  green: number;
  blue: number;
}

// Atlas de motifs 8x8 partage par plusieurs sequences.
export interface SpriteAtlas {
  frames: readonly (readonly string[])[];
  palette: Readonly<Record<string, SpriteColor>>;
}

// Image et duree issues de la timeline d'origine.
export interface SpriteTimelineFrame {
  frameIndex: number;
  durationMs: number;
}

// Sequence complete lue en boucle sur un plan du cube.
export interface SpriteClip {
  atlas: SpriteAtlas;
  timeline: readonly SpriteTimelineFrame[];
  planeZ: number;
}
