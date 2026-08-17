// ============================================================================
// VoxelMapping - Conversion des coordonnees logiques en index NeoPixel
// ----------------------------------------------------------------------------
// Ce fichier porte l'unique mapping du cube 8x8x8. Il valide les coordonnees
// mais ne lit ni n'ecrit directement le buffer du pilote NeoPixel.
// ============================================================================

#pragma once

#include <stdint.h>

#include "../config/build_config.h"
#include "../core/numeric_types.h"

// Nombre de voxels logiques attendu par le mapping physique historique.
const uint16_t CUBE_VOXEL_COUNT = SIDE * SIDE * SIDE;

// ----------------------------------------------------------------------------
// Indique si une coordonnee appartient a un axe logique du cube.
//
// Parametres :
// - coordinate : coordonnee signee a verifier.
//
// Retour :
// - vrai lorsque la coordonnee est comprise entre 0 et 7 inclus.
// ----------------------------------------------------------------------------
inline bool isVoxelCoordinateValid(int16_t coordinate) {
  return coordinate >= 0 && coordinate < SIDE;
}

// ----------------------------------------------------------------------------
// Convertit sans controle trois coordonnees deja garanties entre 0 et 7.
//
// Parametres :
// - x : colonne logique garantie valide.
// - y : hauteur logique garantie valide.
// - z : plan logique garanti valide.
//
// Retour :
// - index physique historique compris entre 0 et 511.
// ----------------------------------------------------------------------------
inline uint16_t voxelIndexUnchecked(CubeAxisIndex x, CubeAxisIndex y, CubeAxisIndex z) {
  return static_cast<uint16_t>(z) * SIDE * SIDE +
         static_cast<uint16_t>(x) * SIDE +
         static_cast<uint16_t>(y);
}

// ----------------------------------------------------------------------------
// Valide puis convertit une position logique en index physique NeoPixel.
//
// Parametres :
// - x : colonne logique candidate.
// - y : hauteur logique candidate.
// - z : plan logique candidat.
// - index : destination de l'index lorsque la position est valide.
//
// Retour :
// - vrai si les trois coordonnees et la destination sont valides.
//
// Effet de bord :
// - ecrit dans index uniquement lorsque la conversion reussit.
// ----------------------------------------------------------------------------
inline bool tryVoxelIndex(int16_t x, int16_t y, int16_t z, uint16_t* index) {
  if (index == NULL ||
      !isVoxelCoordinateValid(x) ||
      !isVoxelCoordinateValid(y) ||
      !isVoxelCoordinateValid(z)) {
    return false;
  }

  *index = voxelIndexUnchecked(
    static_cast<CubeAxisIndex>(x),
    static_cast<CubeAxisIndex>(y),
    static_cast<CubeAxisIndex>(z)
  );
  return true;
}

static_assert(CUBE_VOXEL_COUNT == PIXEL_CNT, "Le mapping doit couvrir les 512 NeoPixel");
