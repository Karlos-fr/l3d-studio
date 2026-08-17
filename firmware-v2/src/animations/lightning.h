// ============================================================================
// Lightning - Déclaration des éclairs utilisés par Rain
// ----------------------------------------------------------------------------
// Ce fichier expose uniquement le rendu d'un éclair. Il ne gère ni fréquence
// de déclenchement ni sélection de mode.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Dessine puis efface un éclair ramifié avec quatre intensités.
//
// Effet de bord :
// - consomme des tirages aléatoires et affiche directement les LEDs.
// ----------------------------------------------------------------------------
void lightning();
