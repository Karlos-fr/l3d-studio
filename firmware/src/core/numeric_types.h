// ============================================================================
// NumericTypes - Declaration des representations numeriques du firmware
// ----------------------------------------------------------------------------
// Ce fichier distingue les coordonnees discretes, le fixed-point et les
// calculs geometriques. Il ne connait ni le mapping LED ni les animations.
// ============================================================================

#pragma once

#include <stdint.h>

// Coordonnee discrete signee, notamment pour les sentinelles de -1 a 8.
typedef int8_t CubeCoordinate;

// Coordonnee d'axe dont l'appelant garantit la plage logique de 0 a 7.
typedef uint8_t CubeAxisIndex;

// Scalaire reserve aux calculs geometriques qui exigent une fraction.
typedef float GeometryScalar;

// Facteur d'echelle d'une valeur fixed-point Q8.8.
const int16_t FIXED_Q8_8_SCALE = 256;

// Position ou vitesse Q8.8, couvrant -128 a 127 avec 1/256 de resolution.
typedef struct FixedQ8_8 {
  int16_t raw;
} FixedQ8_8;

static_assert(sizeof(CubeCoordinate) == 1, "CubeCoordinate doit tenir sur un octet");
static_assert(sizeof(CubeAxisIndex) == 1, "CubeAxisIndex doit tenir sur un octet");
static_assert(sizeof(GeometryScalar) == 4, "GeometryScalar doit rester un float 32 bits");
static_assert(sizeof(FixedQ8_8) == 2, "FixedQ8_8 doit tenir sur deux octets");
