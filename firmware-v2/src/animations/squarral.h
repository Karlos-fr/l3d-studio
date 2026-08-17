// ============================================================================
// Squarrel - Declaration du parcours carré et de sa traînée
// ----------------------------------------------------------------------------
// Ce fichier expose la frame Squarrel et l'addition de son état compact. Les
// couleurs restent gérées par les modules historiques partagés.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Dessine une frame du parcours Squarrel et décale sa traînée.
// ----------------------------------------------------------------------------
void squarral();

// ----------------------------------------------------------------------------
// Applique un incrément signé à une position Squarrel compacte.
//
// Parametres :
// - position : position logique à modifier.
// - increment : déplacement signé de chaque axe.
// ----------------------------------------------------------------------------
void add(SquarrelPosition& position, const SquarrelIncrement& increment);
