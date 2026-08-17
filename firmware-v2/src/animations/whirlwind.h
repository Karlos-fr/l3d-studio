// ============================================================================
// Whirlwind - Déclaration du tourbillon de points colorés
// ----------------------------------------------------------------------------
// Ce fichier expose le rendu Whirlwind et son choix de couleur. L'état
// temporaire reste dans le scratch partagé du firmware.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Calcule et affiche une frame du tourbillon.
// ----------------------------------------------------------------------------
void whirlWind();

// ----------------------------------------------------------------------------
// Choisit une couleur aléatoire distincte des deux familles précédentes.
//
// Parametres :
// - color : couleur de point à renseigner.
// ----------------------------------------------------------------------------
void randomColor(struct Color* color);

// ----------------------------------------------------------------------------
// Choisit une couleur et la copie dans sa représentation triviale.
//
// Parametres :
// - color : couleur compacte à renseigner dans le scratch partagé.
// ----------------------------------------------------------------------------
void randomPackedColor(PackedColor* color);
