// ============================================================================
// Tranquility - Declaration du fondu plein-cube CubeTube
// ----------------------------------------------------------------------------
// Ce fichier expose une animation cyclique sans allocation. Il ne gere ni les
// transitions generales du firmware ni les couleurs choisies par l'interface.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Reinitialise la phase et l'horloge de Tranquility.
//
// Effet de bord :
// - force le rendu de la premiere couleur au prochain tick.
// ----------------------------------------------------------------------------
void resetTranquility();

// ----------------------------------------------------------------------------
// Affiche une couleur Tranquility lorsque son intervalle est ecoule.
//
// Effet de bord :
// - remplit et affiche le cube sans bloquer la boucle principale.
// ----------------------------------------------------------------------------
void runTranquility();
