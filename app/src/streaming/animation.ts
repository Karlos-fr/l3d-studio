// ============================================================================
// StreamingAnimation - Contrat minimal d'une animation web
// ----------------------------------------------------------------------------
// Chaque animation vit dans son propre fichier et remplit le framebuffer sans
// connaitre le transport, le DOM ou le materiel du cube.
// ============================================================================

import type { StreamingFramebuffer } from "./framebuffer";

// Contrat volontairement court des animations executees dans le navigateur.
export interface StreamingAnimation {
  // Initialise l'etat prive avant la premiere frame.
  init(framebuffer: StreamingFramebuffer): void;
  // Calcule une frame pour le temps ecoule exprime en secondes.
  frame(framebuffer: StreamingFramebuffer, elapsedSeconds: number): void;
  // Applique une vitesse propre a l'animation lorsque celle-ci la prend en charge.
  setSpeed?(stepsPerSecond: number): void;
}
