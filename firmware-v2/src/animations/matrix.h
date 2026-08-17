// ============================================================================
// Matrix - Declaration des flux de pluie verte
// ----------------------------------------------------------------------------
// Ce fichier expose uniquement l'initialisation et la frame Matrix. L'état
// compact reste centralisé temporairement dans legacy_state.h.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Initialise les huit positions X/Z de chacun des quatre flux Matrix.
// ----------------------------------------------------------------------------
void matrix_setup();

// ----------------------------------------------------------------------------
// Dessine une frame des quatre flux Matrix et avance leur position verticale.
// ----------------------------------------------------------------------------
void matrix();
