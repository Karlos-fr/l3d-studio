// ============================================================================
// Rain - Déclaration de la pluie voxel historique
// ----------------------------------------------------------------------------
// Ce fichier expose Rain et ses deux atténuations entières. Le moteur de salves
// GoldRain/AcidRain reste dans un module distinct.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Atténue une couleur par une puissance de deux exacte.
//
// Parametres :
// - color : couleur RGB à atténuer.
// - shift : nombre de divisions entières par deux.
//
// Retour :
// - couleur dont chaque canal est décalé vers la droite.
// ----------------------------------------------------------------------------
Color scaleRainColor(Color color, uint8_t shift);

// ----------------------------------------------------------------------------
// Déplace les gouttes, applique leur traînée et crée de nouvelles gouttes.
//
// Parametres :
// - colorValue : couleur entière des gouttes non aléatoires.
// ----------------------------------------------------------------------------
void rain(uint32_t colorValue);
