// ============================================================================
// StreamingPrimitives - Primitives minimales des animations web
// ----------------------------------------------------------------------------
// Les primitives ecrivent uniquement dans le framebuffer logique 8x8x8 et
// restent independantes du transport HTTP.
// ============================================================================

import { StreamingFramebuffer } from "./framebuffer";

// Couleur RGB utilisee par les primitives web.
export interface StreamingColor {
  red: number;
  green: number;
  blue: number;
}

// Point entier utilise par les primitives geometriques.
export interface StreamingPoint {
  x: number;
  y: number;
  z: number;
}

// ----------------------------------------------------------------------------
// Efface le framebuffer avec une couleur donnee.
//
// Parametres :
// - framebuffer : destination logique.
// - color : couleur uniforme, noire par defaut.
// ----------------------------------------------------------------------------
export function clearFramebuffer(
  framebuffer: StreamingFramebuffer,
  color: StreamingColor = { red: 0, green: 0, blue: 0 },
): void {
  framebuffer.clear(color.red, color.green, color.blue);
}

// ----------------------------------------------------------------------------
// Ecrit un voxel avec une couleur structuree.
//
// Parametres :
// - framebuffer : destination logique.
// - point : coordonnees du voxel.
// - color : couleur RGB a appliquer.
// ----------------------------------------------------------------------------
export function setStreamingVoxel(
  framebuffer: StreamingFramebuffer,
  point: StreamingPoint,
  color: StreamingColor,
): void {
  framebuffer.setVoxel(point.x, point.y, point.z, color.red, color.green, color.blue);
}

// ----------------------------------------------------------------------------
// Trace une ligne 3D discrete entre deux points.
//
// Parametres :
// - framebuffer : destination logique.
// - start, end : extremites de la ligne.
// - color : couleur RGB de la ligne.
// ----------------------------------------------------------------------------
export function drawStreamingLine(
  framebuffer: StreamingFramebuffer,
  start: StreamingPoint,
  end: StreamingPoint,
  color: StreamingColor,
): void {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const deltaZ = end.z - start.z;
  const stepCount = Math.max(Math.abs(deltaX), Math.abs(deltaY), Math.abs(deltaZ));
  if (stepCount === 0) {
    setStreamingVoxel(framebuffer, start, color);
    return;
  }
  for (let step = 0; step <= stepCount; step += 1) {
    const ratio = step / stepCount;
    framebuffer.setVoxel(
      Math.round(start.x + deltaX * ratio),
      Math.round(start.y + deltaY * ratio),
      Math.round(start.z + deltaZ * ratio),
      color.red,
      color.green,
      color.blue,
    );
  }
}

// ----------------------------------------------------------------------------
// Dessine une sphere pleine dans le framebuffer logique.
//
// Parametres :
// - framebuffer : destination logique.
// - center : centre flottant autorisant un mouvement fluide.
// - radius : rayon positif exprime en voxels.
// - color : couleur RGB de la sphere.
// ----------------------------------------------------------------------------
export function drawStreamingSphere(
  framebuffer: StreamingFramebuffer,
  center: StreamingPoint,
  radius: number,
  color: StreamingColor,
): void {
  const radiusSquared = radius * radius;
  for (let z = 0; z < 8; z += 1) {
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const deltaX = x - center.x;
        const deltaY = y - center.y;
        const deltaZ = z - center.z;
        if (deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ <= radiusSquared) {
          framebuffer.setVoxel(x, y, z, color.red, color.green, color.blue);
        }
      }
    }
  }
}
