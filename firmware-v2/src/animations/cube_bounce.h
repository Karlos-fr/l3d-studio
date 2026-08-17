// ============================================================================
// CubeBounce - Déclaration du cube rebondissant
// ----------------------------------------------------------------------------
// Ce fichier expose l'initialisation et une frame BouncyCube. L'état compact
// reste partagé avec le noyau historique du firmware.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Initialise la position et la couleur du cube rebondissant.
// ----------------------------------------------------------------------------
void cubeBounce_setup();

// ----------------------------------------------------------------------------
// Déplace, fait rebondir puis affiche le cube courant.
// ----------------------------------------------------------------------------
void cubeBounce();
