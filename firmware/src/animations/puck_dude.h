// ============================================================================
// PuckDude - Déclaration de l'animation PacMan historique
// ----------------------------------------------------------------------------
// Ce fichier expose une frame PacMan et la rotation de ses points compacts. Les
// sprites temporaires restent dans le scratch partagé.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Construit, transforme et affiche une frame des personnages PacMan.
// ----------------------------------------------------------------------------
void puckDude();

// ----------------------------------------------------------------------------
// Fait tourner un point entier compact autour du contour horizontal du cube.
//
// Parametres :
// - a : point compact modifié sur place.
// - b : déplacement signé, exprimé selon PDSPEED.
// ----------------------------------------------------------------------------
void rotate_x(PackedPoint& a, int b);
