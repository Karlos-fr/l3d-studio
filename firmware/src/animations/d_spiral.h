// ============================================================================
// LineSpiral - Déclaration de la spirale lumineuse
// ----------------------------------------------------------------------------
// Ce fichier expose l'initialisation et une frame LineSpiral. L'état borné
// reste dans le noyau historique du firmware.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Initialise la cible et la luminosité du mode LineSpiral.
// ----------------------------------------------------------------------------
void dSpiral_setup();

// ----------------------------------------------------------------------------
// Calcule, atténue et affiche une frame LineSpiral.
// ----------------------------------------------------------------------------
void dSpiral();
