// ============================================================================
// ColorAll - Déclaration du chaser monochrome
// ----------------------------------------------------------------------------
// Ce fichier expose ColorChaser. Les remplissages globaux utilisent les
// transitions partagées et ne sont plus implémentés ici.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Fait avancer un voxel coloré et atténue sa traînée.
//
// Parametres :
// - colorValue : couleur entière appliquée au voxel courant.
// ----------------------------------------------------------------------------
void colorChaser(uint32_t colorValue);
