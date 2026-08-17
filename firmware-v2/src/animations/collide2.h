// ============================================================================
// Collide2 - Declaration des points en collision
// ----------------------------------------------------------------------------
// Ce fichier expose le cycle Collide2 et ses helpers directs. L'état compact
// reste centralisé temporairement dans legacy_state.h.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Tire une direction orthogonale unitaire pour un point Collide2.
//
// Parametres :
// - dot : point dont les composantes de direction sont remplacées.
// ----------------------------------------------------------------------------
void randomizeCollideDirection(CompactCollideDot& dot);

// ----------------------------------------------------------------------------
// Initialise les 72 points, couleurs et directions de Collide2.
// ----------------------------------------------------------------------------
void initCollide();

// ----------------------------------------------------------------------------
// Replie une coordonnée Collide2 sur l'axe logique 0 à 7.
//
// Parametres :
// - coordinate : coordonnée après un déplacement unitaire.
//
// Retour :
// - coordonnée opposée aux frontières.
// ----------------------------------------------------------------------------
CubeAxisIndex wrapCollideCoordinate(int16_t coordinate);

// ----------------------------------------------------------------------------
// Exécute une frame des 72 points Collide2.
// ----------------------------------------------------------------------------
void collide2();

// ----------------------------------------------------------------------------
// Dessine la sphère creuse historique autour d'un centre.
//
// Parametres :
// - center : centre logique de la sphère.
// - radius : rayon demandé.
// - color : couleur des échantillons.
// ----------------------------------------------------------------------------
void sphere(Point center, float radius, Color color);
