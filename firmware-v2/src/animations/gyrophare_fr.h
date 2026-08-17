// ============================================================================
// GyrophareFr - Declaration du gyrophare tournant francais
// ----------------------------------------------------------------------------
// Ce fichier expose le cycle de vie du mode. Son rendu et sa capture audio
// restent confines dans l'implementation correspondante.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Reinitialise la rotation et l'enveloppe sonore du gyrophare.
//
// Effet de bord :
// - force le rendu de la premiere orientation au prochain tick.
// ----------------------------------------------------------------------------
void resetGyrophareFr();

// ----------------------------------------------------------------------------
// Affiche une frame due du gyrophare tournant.
//
// Effet de bord :
// - lit eventuellement le microphone, modifie le framebuffer et l'affiche.
// ----------------------------------------------------------------------------
void runGyrophareFr();
