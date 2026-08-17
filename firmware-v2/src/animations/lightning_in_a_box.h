// ============================================================================
// LightningInABox - Declaration de l'eclair CubeTube
// ----------------------------------------------------------------------------
// Ce fichier expose le cycle non bloquant de l'eclair. Il ne gere ni le mode
// historique Lightning utilise par Rain, ni la selection Particle.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Reinitialise la machine d'etat de LightningInABox.
//
// Effet de bord :
// - force la generation d'un nouvel eclair au prochain tick.
// ----------------------------------------------------------------------------
void resetLightningInABox();

// ----------------------------------------------------------------------------
// Execute une etape due du cycle LightningInABox.
//
// Effet de bord :
// - dessine ou efface l'eclair et actualise son prochain delai sans bloquer.
// ----------------------------------------------------------------------------
void runLightningInABox();
