// ============================================================================
// StreamingSerializer - Serialisation RGB332 compatible Processing
// ----------------------------------------------------------------------------
// Le format produit contient un octet par voxel, dans l'ordre z puis y puis x,
// identique au streaming historique de L3D-Library.
// ============================================================================

import { StreamingFramebuffer, STREAM_CUBE_SIDE, STREAM_VOXEL_COUNT } from "./framebuffer";

// ----------------------------------------------------------------------------
// Convertit une couleur RGB888 vers le format compact RGB332 historique.
//
// Parametres :
// - red, green, blue : composantes sur huit bits.
//
// Retour :
// - octet RRR GGG BB.
// ----------------------------------------------------------------------------
export function packRgb332(red: number, green: number, blue: number): number {
  return (red & 0xe0) | ((green & 0xe0) >> 3) | ((blue & 0xc0) >> 6);
}

// ----------------------------------------------------------------------------
// Serialise un framebuffer selon l'ordre contractuel z, y, x.
//
// Parametres :
// - framebuffer : framebuffer RGB logique a compacter.
//
// Retour :
// - corps binaire de 512 octets pret pour le Photon.
// ----------------------------------------------------------------------------
export function serializeRgb332(framebuffer: StreamingFramebuffer): Uint8Array {
  const payload = new Uint8Array(STREAM_VOXEL_COUNT);
  let payloadIndex = 0;
  for (let z = 0; z < STREAM_CUBE_SIDE; z += 1) {
    for (let y = 0; y < STREAM_CUBE_SIDE; y += 1) {
      for (let x = 0; x < STREAM_CUBE_SIDE; x += 1) {
        const [red, green, blue] = framebuffer.getVoxel(x, y, z);
        payload[payloadIndex] = packRgb332(red, green, blue);
        payloadIndex += 1;
      }
    }
  }
  return payload;
}
