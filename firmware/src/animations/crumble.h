// ============================================================================
// Crumble - Declaration de l'effondrement par plans
// ----------------------------------------------------------------------------
// Ce fichier expose les opérations du mode CrumblingPlane au unity build. Son
// stockage fixe reste déclaré dans core/legacy_state.h.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Avance ou sélectionne la prochaine colonne du plan à effondrer.
// ----------------------------------------------------------------------------
void crumble();

// ----------------------------------------------------------------------------
// Convertit une position du cycle en coordonnées logiques puis écrit sa couleur.
//
// Parametres :
// - x : première coordonnée du plan.
// - y : seconde coordonnée du plan.
// - z : profondeur courante.
// - clear : vrai pour effacer le voxel.
// ----------------------------------------------------------------------------
void setVoxel(int x, int y, int z, bool clear);

// ----------------------------------------------------------------------------
// Déplace d'une profondeur la colonne sélectionnée.
//
// Retour :
// - vrai tant qu'une profondeur supplémentaire reste à afficher.
// ----------------------------------------------------------------------------
bool shift();

// ----------------------------------------------------------------------------
// Retire aléatoirement une position encore disponible dans le plan.
//
// Retour :
// - position linéaire choisie entre zéro et 63.
// ----------------------------------------------------------------------------
uint8_t draw();

// ----------------------------------------------------------------------------
// Réinitialise entièrement le plan et sélectionne l'orientation suivante.
// ----------------------------------------------------------------------------
void resetCycle();
