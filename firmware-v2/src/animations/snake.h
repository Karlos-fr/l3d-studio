// ============================================================================
// Snake - Declaration de l'animation et de son stockage fixe
// ----------------------------------------------------------------------------
// Ce fichier expose les opérations de Snake au unity build. Les types et états
// partagés restent déclarés dans core/legacy_state.h pendant le refactor.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Indique si deux positions discrètes de Snake sont identiques.
//
// Parametres :
// - left : première position à comparer.
// - right : seconde position à comparer.
//
// Retour :
// - vrai lorsque les trois coordonnées sont égales.
// ----------------------------------------------------------------------------
bool snakeVoxelsEqual(const voxel& left, const voxel& right);

// ----------------------------------------------------------------------------
// Additionne une position et un déplacement discret.
//
// Parametres :
// - position : position de départ.
// - direction : déplacement signé sur les trois axes.
//
// Retour :
// - position résultante, qui peut contenir une sentinelle -1 ou 8.
// ----------------------------------------------------------------------------
voxel addSnakeVoxels(const voxel& position, const voxel& direction);

// ----------------------------------------------------------------------------
// Calcule la distance euclidienne au carré entre deux voxels.
//
// Parametres :
// - source : position de départ.
// - target : position cible.
//
// Retour :
// - somme entière des carrés.
// ----------------------------------------------------------------------------
int16_t snakeDistanceSquared(const voxel& source, const voxel& target);

// ----------------------------------------------------------------------------
// Recherche un voxel dans une liste fixe bornée.
//
// Parametres :
// - voxels : début de la liste à parcourir.
// - count : nombre d'éléments valides dans voxels.
// - candidate : position recherchée.
//
// Retour :
// - vrai si candidate est présente dans la liste.
// ----------------------------------------------------------------------------
bool containsSnakeVoxel(const voxel* voxels, uint16_t count, const voxel& candidate);

// ----------------------------------------------------------------------------
// Affiche une frame de Snake avec son corps et sa cible éventuelle.
// ----------------------------------------------------------------------------
void snake();

// ----------------------------------------------------------------------------
// Avance le corps d'un voxel selon la direction choisie.
// ----------------------------------------------------------------------------
void moveSnake();

// ----------------------------------------------------------------------------
// Vérifie si une direction reste dans le cube et évite le corps.
//
// Parametres :
// - directionIndex : index candidat dans possibleDirections.
//
// Retour :
// - vrai si la future tête peut occuper la position calculée.
// ----------------------------------------------------------------------------
bool canMove(uint8_t directionIndex);

// ----------------------------------------------------------------------------
// Place une cible libre sans allocation ni boucle aléatoire non bornée.
//
// Retour :
// - vrai lorsqu'une cible a été placée.
// ----------------------------------------------------------------------------
bool addTreat();

// ----------------------------------------------------------------------------
// Conserve ou choisit la direction valide la plus proche de la cible.
// ----------------------------------------------------------------------------
void updateDirection();

// ----------------------------------------------------------------------------
// Réinitialise entièrement l'état fixe de Snake.
// ----------------------------------------------------------------------------
void snakeResetCube();
