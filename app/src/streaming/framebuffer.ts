// ============================================================================
// StreamingFramebuffer - Framebuffer logique RGB du cube web
// ----------------------------------------------------------------------------
// Ce module conserve exactement 512 voxels RGB. Il ne connait ni le DOM, ni le
// reseau, ni le cablage physique des panneaux NeoPixel.
// ============================================================================

// Taille d'un cote du cube logique.
export const STREAM_CUBE_SIDE = 8;

// Nombre total de voxels du cube logique.
export const STREAM_VOXEL_COUNT = 512;

// Nombre de composantes RGB conservees pour chaque voxel.
const RGB_COMPONENT_COUNT = 3;

// Framebuffer logique contigu utilise par les animations web.
export class StreamingFramebuffer {
  readonly colors = new Uint8Array(STREAM_VOXEL_COUNT * RGB_COMPONENT_COUNT);

  // --------------------------------------------------------------------------
  // Efface tous les voxels avec une couleur uniforme.
  //
  // Parametres :
  // - red, green, blue : composantes bornees automatiquement sur huit bits.
  // --------------------------------------------------------------------------
  clear(red = 0, green = 0, blue = 0): void {
    for (let voxelIndex = 0; voxelIndex < STREAM_VOXEL_COUNT; voxelIndex += 1) {
      const componentIndex = voxelIndex * RGB_COMPONENT_COUNT;
      this.colors[componentIndex] = red;
      this.colors[componentIndex + 1] = green;
      this.colors[componentIndex + 2] = blue;
    }
  }

  // --------------------------------------------------------------------------
  // Ecrit un voxel logique lorsqu'il appartient au cube.
  //
  // Parametres :
  // - x, y, z : coordonnees entieres de zero a sept.
  // - red, green, blue : composantes RGB sur huit bits.
  //
  // Retour :
  // - vrai lorsque le voxel a ete ecrit.
  // --------------------------------------------------------------------------
  setVoxel(x: number, y: number, z: number, red: number, green: number, blue: number): boolean {
    const voxelIndex = getStreamingVoxelIndex(x, y, z);
    if (voxelIndex < 0) return false;
    const componentIndex = voxelIndex * RGB_COMPONENT_COUNT;
    this.colors[componentIndex] = red;
    this.colors[componentIndex + 1] = green;
    this.colors[componentIndex + 2] = blue;
    return true;
  }

  // --------------------------------------------------------------------------
  // Lit les trois composantes d'un voxel logique.
  //
  // Parametres :
  // - x, y, z : coordonnees entieres de zero a sept.
  //
  // Retour :
  // - triplet RGB ou noir hors du cube.
  // --------------------------------------------------------------------------
  getVoxel(x: number, y: number, z: number): readonly [number, number, number] {
    const voxelIndex = getStreamingVoxelIndex(x, y, z);
    if (voxelIndex < 0) return [0, 0, 0];
    const componentIndex = voxelIndex * RGB_COMPONENT_COUNT;
    return [
      this.colors[componentIndex] ?? 0,
      this.colors[componentIndex + 1] ?? 0,
      this.colors[componentIndex + 2] ?? 0,
    ];
  }
}

// ----------------------------------------------------------------------------
// Convertit des coordonnees logiques dans l'ordre contractuel z, y, x.
//
// Parametres :
// - x, y, z : coordonnees candidates.
//
// Retour :
// - index de zero a 511 ou moins un hors limites.
// ----------------------------------------------------------------------------
export function getStreamingVoxelIndex(x: number, y: number, z: number): number {
  if (
    !Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z) ||
    x < 0 || y < 0 || z < 0 ||
    x >= STREAM_CUBE_SIDE || y >= STREAM_CUBE_SIDE || z >= STREAM_CUBE_SIDE
  ) {
    return -1;
  }
  return z * STREAM_CUBE_SIDE * STREAM_CUBE_SIDE + y * STREAM_CUBE_SIDE + x;
}
