// ============================================================================
// StreamingProjection - Projection orthographique legere du cube web
// ----------------------------------------------------------------------------
// Ce module applique deux rotations a un point logique centre. Il ne depend ni
// du Canvas ni d'un moteur 3D afin de rester testable et peu couteux.
// ============================================================================

// Point tourne dans l'espace de la camera.
export interface StreamingProjectedPoint {
  horizontal: number;
  vertical: number;
  depth: number;
}

// Centre geometrique des huit coordonnees logiques de chaque axe.
const STREAMING_CUBE_CENTER = 3.5;

// ----------------------------------------------------------------------------
// Tourne un point du cube autour des axes verticaux puis horizontaux.
//
// Parametres :
// - x, y, z : coordonnees logiques du voxel.
// - yaw : rotation horizontale de la camera en radians.
// - pitch : rotation verticale de la camera en radians.
//
// Retour :
// - coordonnees centrees, pretes a etre mises a l'echelle par le Canvas.
// ----------------------------------------------------------------------------
export function projectStreamingPoint(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
): StreamingProjectedPoint {
  const centeredX = x - STREAMING_CUBE_CENTER;
  const centeredY = y - STREAMING_CUBE_CENTER;
  const centeredZ = z - STREAMING_CUBE_CENTER;
  const yawCosine = Math.cos(yaw);
  const yawSine = Math.sin(yaw);
  const horizontal = centeredX * yawCosine - centeredZ * yawSine;
  const yawDepth = centeredX * yawSine + centeredZ * yawCosine;
  const pitchCosine = Math.cos(pitch);
  const pitchSine = Math.sin(pitch);
  return {
    horizontal,
    vertical: centeredY * pitchCosine - yawDepth * pitchSine,
    depth: centeredY * pitchSine + yawDepth * pitchCosine,
  };
}
